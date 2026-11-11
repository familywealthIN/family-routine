/**
 * How a chat reply is graded. Pure: takes the case and the result
 * `chatWithRoutine` returned, gives back failures (the reply is wrong) and
 * warnings (worth a look, not wrong on their own).
 *
 * Universal checks hold for EVERY reply; the case's `expect` adds its own.
 */
const {
  INTENTS, usableProse, describeContext,
} = require('../../src/utils/chatApi');

const NO_TASK_INTENTS = ['chat', 'status', 'complete_task', 'defer_task', 'skip_task'];
// The categories where the reply should hand the conversation back.
const INVITING_CATEGORIES = ['week', 'project', 'coaching'];

const ADDED_CLAIM = /\b(?:added|i(?:'ve|’ve| have)\s+(?:put|added|created|scheduled)|now on (?:the|your) (?:checklist|list))\b/i;
// "These are proposals, not added yet" is the opposite of a claim.
const NOT_ADDED = /\b(?:not|n['’]t|never)\s+(?:been\s+|yet\s+|already\s+)?added\b|\bnot\s+yet\s+added\b/gi;
const VAGUE_ADD = /^(?:add|create|new)\s+(?:a|an|another|one more|more|new|some)?\s*(?:new\s+)?(?:task|item|to-?do|one)s?\b/i;
const HEADING = /^\s{0,3}#{1,6}\s/m;
const EMOJI = /\p{Extended_Pictographic}/u;
const INVITATION = /\?|\b(?:want me|shall i|should i|would you|do you want|let me know|ready to|try)\b/i;

const sentences = (text) => String(text || '')
  .split(/(?<=[.!?])\s+/)
  .filter((s) => s.trim()).length;

/** Every text the model was shown: the only place a number may come from. */
function groundTruth(testCase) {
  const history = (testCase.history || [])
    .map((m) => `${m.text} ${(m.proposals || []).join(' ')}`)
    .join(' ');
  return `${describeContext(testCase.context)} ${testCase.text} ${history}`;
}

// "try a 15-minute starter", "a 10 min fallback": a duration offered as advice
// is a suggestion, not a claim about the user's data.
const ADVICE_DURATION = /\b(?:a|an|one|try|add|set|do|with)\s+(?:quick\s+|short\s+)?(\d+)[-\s]?(?:min(?:ute)?s?)\b/gi;

/** Numbers in the reply that appear nowhere in what the model was given. */
function ungroundedNumbers(reply, truth) {
  const known = new Set(String(truth).match(/\d+/g) || []);
  const advised = new Set([...String(reply).matchAll(ADVICE_DURATION)].map((m) => m[1]));
  return [...new Set(String(reply).match(/\d+/g) || [])]
    .filter((n) => !known.has(n) && !advised.has(n));
}

const asList = (value) => (Array.isArray(value) ? value : [value]);

/**
 * @param {Object} testCase  one entry of cases.js
 * @param {Object} result    chatWithRoutine's return value
 * @returns {{ failures: Array<{check, detail}>, warnings: Array<{check, detail}>, infra: boolean }}
 */
function grade(testCase, result) {
  const failures = [];
  const warnings = [];
  const expect = testCase.expect || {};
  const soft = new Set(expect.soft || []);
  const flag = (check, detail) => (soft.has(check) ? warnings : failures).push({ check, detail });
  const warn = (check, detail) => warnings.push({ check, detail });

  // A model outage is the free tier's problem, not the prompt's: it is
  // reported separately and never counted as a wrong answer.
  if (result.error) return { failures, warnings, infra: true };

  const reply = String(result.reply || '');
  const tasks = result.tasks || [];
  const suggestions = result.suggestions || [];

  // ---- universal --------------------------------------------------------
  if (!reply.trim()) flag('reply', 'empty reply');
  if (reply && !usableProse(reply)) flag('leak', 'reads as leaked reasoning or a monologue');
  if (reply.length > 600 || sentences(reply) > 5) {
    flag('length', `${sentences(reply)} sentences, ${reply.length} chars`);
  }
  if (HEADING.test(reply) || EMOJI.test(reply)) flag('format', 'markdown heading or emoji');
  if (!INTENTS.includes(result.intent)) flag('intent-valid', `unknown intent ${result.intent}`);
  if (NO_TASK_INTENTS.includes(result.intent) && tasks.length) {
    flag('tasks-on-answer', `${result.intent} came back with tasks: ${tasks.join('; ')}`);
  }
  if (result.intent !== 'add_tasks' && ADDED_CLAIM.test(reply.replace(NOT_ADDED, ''))) {
    flag('added-claim', 'says something was added, but nothing was');
  }

  const loose = ungroundedNumbers(reply, groundTruth(testCase));
  const proposing = ['break_down', 'suggest_tasks'].includes(result.intent);
  const invented = proposing ? [] : loose.filter((n) => Number(n) > 10);
  if (invented.length) flag('grounded-numbers', `numbers not in the context: ${invented.join(', ')}`);
  else if (loose.length) warn('grounded-numbers', `small numbers it worked out itself: ${loose.join(', ')}`);

  if (suggestions.length > 3) flag('chips', `${suggestions.length} chips`);
  suggestions.forEach((chip) => {
    if (chip.length > 48) flag('chips', `chip too long: ${chip}`);
    if (VAGUE_ADD.test(chip)) flag('chips', `chip names nothing: ${chip}`);
    if (chip.trim().toLowerCase() === testCase.text.trim().toLowerCase()) flag('chips', `chip repeats the question: ${chip}`);
  });
  if (result.intent === 'chat' && !suggestions.length) warn('chips', 'no follow-up chips offered');

  // The owner's ask: a chat, not a report. An answer or advice that just stops
  // is a failure, not a style note.
  if (INVITING_CATEGORIES.includes(testCase.category) && !INVITATION.test(reply)) {
    flag('interactive', 'does not hand the conversation back (no question or offer)');
  }

  // ---- case-specific ----------------------------------------------------
  if (expect.intent && !asList(expect.intent).includes(result.intent)) {
    flag('intent', `got ${result.intent}, wanted ${asList(expect.intent).join(' | ')}`);
  }
  if (expect.tasks === 'none' && tasks.length) flag('tasks', `wanted none, got ${tasks.join('; ')}`);
  if (expect.tasks === 'some' && !tasks.length) flag('tasks', 'wanted tasks, got none');
  if (expect.completeItemId && result.completeItemId !== expect.completeItemId) {
    flag('target', `completeItemId ${result.completeItemId}, wanted ${expect.completeItemId}`);
  }
  if (expect.targetItemId && result.targetItemId !== expect.targetItemId) {
    flag('target', `targetItemId ${result.targetItemId}, wanted ${expect.targetItemId}`);
  }
  (expect.mentions || []).forEach((re) => {
    if (!re.test(reply)) flag('mentions', `reply does not mention ${re}`);
  });
  if (expect.mentionsAny && !expect.mentionsAny.some((re) => re.test(reply))) {
    flag('mentions', `reply mentions none of ${expect.mentionsAny.join(' ')}`);
  }
  (expect.avoid || []).forEach((re) => {
    if (re.test(reply)) flag('avoid', `reply says ${re}`);
  });
  (expect.taskMatches || []).forEach((re) => {
    if (!tasks.some((task) => re.test(task))) flag('task-content', `no task matches ${re}`);
  });

  return { failures, warnings, infra: false };
}

module.exports = {
  grade,
  groundTruth,
  ungroundedNumbers,
  sentences,
};
