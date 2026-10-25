/**
 * Routine chat — conversational layer for the focus-card redesign.
 *
 * Deliberately separate from `aiApi.js`:
 *   - `aiApi` is the *planning* path (milestone plans, task extraction). It
 *     prefers Gemini and falls back to a paid OpenRouter model.
 *   - this module is the *chat* path, which runs on OpenRouter's FREE tier
 *     only. Chat is high-volume (every message a user types), interactive and
 *     low-stakes, so it must never spend credits. Free models rate-limit and
 *     go away without notice, so the whole design here is a failover list.
 *
 * Configure with `OPENROUTER_FREE_MODELS` (comma-separated) to change the
 * roster without a deploy.
 *
 * The one exception is a caller that names its own `models`: the post-tick
 * routine insight runs once per routine per day and is worth a paid model.
 */
const moment = require('moment');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

// The free catalogue churns — ids are retired without notice, and a hardcoded
// roster quietly becomes a wall of 404s. So the roster is DISCOVERED from
// OpenRouter's own model list and only falls back to a static guess when that
// call fails. `OPENROUTER_FREE_MODELS` still overrides both.
const FALLBACK_FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'qwen/qwen3.8-27b:free',
];

// How many models one turn will try before giving up. The chain is failover,
// not a race: a rate-limited free model answers 429 immediately, so a few
// attempts cost little, but an exhausted catalogue must not hang the request.
const MAX_ATTEMPTS = 5;
// One model's deadline. A chat turn is a short JSON answer; a free model that
// has not answered in this long is queued or stuck, and the next one is faster.
const MODEL_TIMEOUT_MS = 20000;
// Discovery is cached per warm container; the catalogue does not move hourly.
const CATALOGUE_TTL_MS = 30 * 60 * 1000;

let catalogueCache = { at: 0, models: null };

/** The explicit roster, if one is configured. */
function configuredFreeModels() {
  return (process.env.OPENROUTER_FREE_MODELS || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
    // A paid id slipping into the override would silently start charging, so
    // the free suffix is enforced rather than assumed.
    .filter((m) => m.endsWith(':free'));
}

/**
 * Synchronous roster: the env override, else the static fallback. Used when
 * discovery has not run or could not reach OpenRouter.
 */
function freeModels() {
  const configured = configuredFreeModels();
  return configured.length ? configured : FALLBACK_FREE_MODELS.filter((m) => m.endsWith(':free'));
}

/**
 * How well a free model suits THIS job, best first.
 *
 * Context length is the wrong signal — a chat turn is a short routine snapshot,
 * not a long document. What decides whether a reply is usable is whether the
 * model can be held to the JSON contract: nearly every free model today is a
 * reasoning model that will otherwise spend the entire token budget thinking
 * out loud and never reach the closing brace.
 */
function modelRank(model) {
  const params = model.supported_parameters || [];
  return (params.includes('structured_outputs') ? 4 : 0)
    + (params.includes('response_format') ? 2 : 0)
    // Being able to turn reasoning OFF matters more than being able to do it.
    + (params.includes('reasoning') ? 1 : 0);
}

/**
 * Ask OpenRouter which models are free right now, best first.
 */
async function fetchFreeModels() {
  const now = Date.now();
  if (catalogueCache.models && now - catalogueCache.at < CATALOGUE_TTL_MS) {
    return catalogueCache.models;
  }

  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`model list ${response.status}`);

  const body = await response.json();
  const models = (body.data || [])
    .filter((model) => model && typeof model.id === 'string' && model.id.endsWith(':free'))
    .sort((a, b) => modelRank(b) - modelRank(a)
      || (b.context_length || 0) - (a.context_length || 0))
    .map((model) => model.id);

  if (!models.length) throw new Error('no free models listed');
  catalogueCache = { at: now, models };
  return models;
}

/** Drop the discovery cache — used by tests, and by ops to force a re-read. */
function clearModelCache() {
  catalogueCache = { at: 0, models: null };
}

/**
 * The roster this turn will walk. An explicit override wins outright — if an
 * operator pinned models, honour them rather than second-guessing.
 */
async function resolveFreeModels() {
  const configured = configuredFreeModels();
  if (configured.length) return configured;
  try {
    return await fetchFreeModels();
  } catch (error) {
    console.warn(`OpenRouter model discovery failed (${error.message}); using fallback roster.`);
    return FALLBACK_FREE_MODELS;
  }
}

function cleanJson(text) {
  let cleaned = String(text || '').trim();

  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  } else if (cleaned.includes('```')) {
    const parts = cleaned.split('```');
    if (parts.length >= 3) cleaned = parts[1].trim();
  }

  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    cleaned = cleaned.substring(first, last + 1);
  }

  return cleaned.replace(/,\s*([\]}])/g, '$1');
}

/**
 * POST one chat completion to OpenRouter, walking the free roster until one
 * model answers. Throws only when every model failed.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {{jsonMode?: boolean, maxTokens?: number, temperature?: number, models?: string[],
 *   reasoning?: Object}} options
 *   `models` replaces the free roster with the caller's own chain (paid models allowed);
 *   `reasoning` overrides the default "off" for a model that refuses to run without it.
 * @returns {Promise<{content: string, model: string}>}
 */
async function completeChat(messages, {
  jsonMode = false, maxTokens = 1200, temperature = 0.4, models = null,
  reasoning = { enabled: false, exclude: true }, timeoutMs = MODEL_TIMEOUT_MS,
} = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const roster = (models && models.length ? models : await resolveFreeModels())
    .slice(0, MAX_ATTEMPTS);
  if (!roster.length) {
    throw new Error('No free OpenRouter models available');
  }

  const failures = [];

  for (let i = 0; i < roster.length; i += 1) {
    const model = roster[i];
    // A free model that hangs held a chat turn for two minutes (chat QA,
    // 25 Oct): each attempt gets its own deadline, then the next model.
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller && timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      // Sequential on purpose: the roster is a failover chain, not a race.
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        ...(controller && { signal: controller.signal }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.WEB_APP_URL || 'https://routinenotes.app',
          'X-Title': 'Routine Notes Chat',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          // Nearly every free model is a reasoning model. Left on, the chain of
          // thought eats the token budget and the answer is truncated before
          // the closing brace — ask for the answer, not the thinking.
          reasoning,
          ...(jsonMode && { response_format: { type: 'json_object' } }),
        }),
      });

      if (!response.ok) {
        // eslint-disable-next-line no-await-in-loop
        const errorText = await response.text();
        throw new Error(`${response.status} ${errorText.slice(0, 300)}`);
      }

      // eslint-disable-next-line no-await-in-loop
      const data = await response.json();
      const content = data
        && data.choices
        && data.choices[0]
        && data.choices[0].message
        && data.choices[0].message.content;

      if (!content || !String(content).trim()) {
        throw new Error('Empty completion');
      }

      return { content: String(content).trim(), model };
    } catch (error) {
      const timedOut = error && error.name === 'AbortError';
      failures.push(`${model}: ${timedOut ? `timed out after ${timeoutMs}ms` : error.message}`);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  throw new Error(`All OpenRouter models failed — ${failures.join(' | ')}`);
}

const INTENTS = [
  'add_tasks', 'suggest_tasks', 'break_down', 'complete_task', 'defer_task', 'skip_task',
  'status', 'chat',
];

// The intents whose tasks are PROPOSALS: shown with an "Add all to checklist"
// button, written only when the user presses it.
const PROPOSAL_INTENTS = ['break_down', 'suggest_tasks'];

/**
 * Whether the user asked, in so many words, for something to be ADDED.
 *
 * The model reads "how should I plan my week?" or "what's next on the project?"
 * as a request for work and answers with add_tasks, and the client writes those
 * straight onto the checklist — the user asked a question and got tasks. So an
 * add only happens on an explicit command ("add …", "can you put … on my list",
 * "remind me to …"); anything else the model wanted to add becomes a
 * suggestion the user can accept with one tap.
 */
const ADD_LEAD = '(?:(?:please|pls|ok(?:ay)?|yes|yeah|yep|sure|great|cool|then|and|also|now|can you'
  + "|could you|would you|will you|go ahead and|let's)[,\\s]+)*";
const ADD_VERB = '(?:add|put|create|schedule|insert|append|include|log|note down|jot down'
  + '|remind me to|make (?:a|it a) task)\\b';
const ADD_COMMAND = new RegExp(`^\\s*${ADD_LEAD}${ADD_VERB}`, 'i');
const ADD_TO_LIST = /\b(?:add|put|create|insert|append|include)\b[^?]{0,80}\b(?:to|on|in|into)\s+(?:the\s+|my\s+|today'?s?\s+)?(?:checklist|list|to-?dos?|tasks?)\b/i;

function asksToAdd(text) {
  const t = String(text || '');
  return ADD_COMMAND.test(t) || ADD_TO_LIST.test(t);
}

// A reply that says something WAS added. When the add is turned into a
// suggestion the claim would be false, so it is replaced.
const ADDED_CLAIM = /\b(?:added|i(?:'ve|’ve| have)\s+(?:put|added|created|scheduled)|now on (?:the|your) (?:checklist|list))\b/i;
const SUGGESTED_REPLY = 'Here are a few ideas — tap “Add all to checklist” to keep them.';
// "These are proposals, not added yet" says the opposite of an add.
const NOT_ADDED = /\b(?:not|n['’]t|never)\s+(?:been\s+|yet\s+|already\s+)?added\b|\bnot\s+yet\s+added\b/gi;

/** Whether the reply says something WAS added. */
function claimsAdded(reply) {
  return ADDED_CLAIM.test(String(reply || '').replace(NOT_ADDED, ''));
}

// The intents whose reply should end by handing the conversation back. An add,
// a tick, a move or a skip is a confirmation and is done when it is said.
const ASKING_INTENTS = ['chat', 'status', 'suggest_tasks', 'break_down'];

/** The model's closing question, when it is one. */
function closingQuestion(value) {
  const ask = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return ask && ask.length <= 140 && /\?$/.test(ask) ? ask : '';
}

/** The parsed JSON when it carries a reply worth showing, else null. */
function parseTurn(content) {
  try {
    const parsed = JSON.parse(cleanJson(content));
    if (!parsed || typeof parsed !== 'object' || !String(parsed.reply || '').trim()) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

// "Add another task" names nothing, so sending it would ask the model to make a
// task up. The client's own "Add a task" chip opens the capture sheet instead.
const VAGUE_ADD = /^(?:add|create|new)\s+(?:a|an|another|one more|more|new|some)?\s*(?:new\s+)?(?:task|item|to-?do|one)s?\b/i;

/** 2-3 short follow-ups the user can tap next, as the user would say them. */
function coerceSuggestions(value, text) {
  if (!Array.isArray(value)) return [];
  const asked = String(text || '').trim().toLowerCase();
  const seen = new Set();
  return value
    .map((entry) => (typeof entry === 'string' ? entry : ''))
    .map((entry) => entry.replace(/\s+/g, ' ').trim().replace(/^["'“”]+|["'“”]+$/g, '').trim())
    .filter((entry) => entry && entry.length <= 48 && !VAGUE_ADD.test(entry))
    .filter((entry) => {
      const key = entry.toLowerCase();
      if (key === asked || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

// The two intents that act on an item the user named rather than creating one,
// so both need an id the client can resolve before it writes anything.
const TARGET_INTENTS = ['defer_task', 'skip_task'];

const FALLBACK_REPLY = "I didn't get that one cleanly — try asking again, or say "
  + '"add …" to put something on the checklist.';

/**
 * What to say instead when a defer or a skip cannot be carried out.
 *
 * Points at the goal sheet's date chips, which are the real move path, and says
 * plainly that nothing moved — the reply it replaces promised a carry-over.
 */
const NO_RESCHEDULE_REPLY = "I can't reschedule that one from here, so nothing moved — open "
  + 'the task on the checklist and use its date chips to put it on another day.';

// Phrasings that assert an item is now on another day. A model will write one
// of these under any intent, including the ones that perform nothing
// (docs/chat-coverage-report.md B-1), and the bubble's text is composed before
// any write is attempted — so a claim with no defer behind it is replaced here
// rather than corrected afterwards.
const CARRY_OVER_CLAIMS = [
  /carr(?:y|ies|ied|ying)\b[^.!?]{0,30}\bover\b/i,
  /\b(?:mov(?:e|es|ed|ing)|push(?:es|ed|ing)?|reschedul\w+|defer\w*)\b[^.!?]{0,60}\b(?:tomorrow|next day|another day|monday)\b/i,
  /\btomorrow'?s?\b[^.!?]{0,40}\b(?:checklist|slot|list|routine)\b/i,
];

// A reply already admitting it cannot do this says the same words, so a denial
// anywhere in it takes it out of scope.
const CAPABILITY_DENIAL = /\b(?:can'?t|cannot|can not|won'?t|will not|unable|don'?t|do not|does ?n'?t|no way to)\b/i;

// "Try moving it to tomorrow" is advice, not a claim that it moved.
const ADVICE_CLAUSE = /\b(?:try|consider|you (?:can|could|might))\b[^.!?]*/gi;

/** Whether this reply tells the user something was moved to another day. */
function claimsCarryOver(reply) {
  const text = String(reply || '');
  if (!text || CAPABILITY_DENIAL.test(text)) return false;
  // A question is an offer ("Want it on tomorrow's list?"), never a claim that
  // something moved: chat QA saw an area answer replaced for asking one.
  const claims = text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/\?\s*$/.test(sentence))
    .join(' ')
    .replace(ADVICE_CLAUSE, '');
  return CARRY_OVER_CLAIMS.some((re) => re.test(claims));
}

// Giveaways that a model answered with its own thinking instead of a reply:
// a numbered deliberation, an explicit preamble, or quoting the contract back.
const REASONING_MARKERS = [
  /thinking process/i,
  /^\s*(okay|alright|first|let me|we need to|the user (says|wants|asked))\b/i,
  /\*\*(analyze|determine|identify|formulate|plan)\b/i,
  /\bintent\s*[:=]\s*"/i,
  /completeItemId/i,
];

/**
 * The model's text, but only when it reads as something a routine would say.
 * Returns '' when it looks like leaked reasoning or a truncated monologue.
 */
function usableProse(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '';
  // A reply is one or two short sentences; anything this long is a monologue.
  if (trimmed.length > 600) return '';
  if (REASONING_MARKERS.some((re) => re.test(trimmed))) return '';
  return trimmed;
}

const SYSTEM_PROMPT = `You are the voice of a single routine inside Routine Notes, a personal
discipline app, and the user's coach for it. The user talks to this one routine, not to a
general assistant.

Routine Notes vocabulary:
- A "routine" is a time-boxed slot in the user's day (e.g. "Start Work · 09:00 – 12:30").
- A routine's "checklist" holds that slot's day goal items.
- D/K/G are the three stimuli: Discipline (habits kept), Kinetics (body moved), Geniuses (focused output).
- Ticking a routine earns its stimulus points. Completing checklist items moves Kinetics on that routine.

What you know, and only this: today's checklist, the LAST 7 DAYS of this routine (how each
session went and the items done or left open), and the AREA / PROJECT context this routine
belongs to (its description and next steps), when they are given below.

How to talk:
- Answer the question that was asked, first. When the user asks about their week, their
  history, a project or an area, answer from those facts and be specific: name the days, the
  items, the next steps. Never invent a fact, a day or an item; if what they ask is not in
  what you were given, say so plainly.
- Be a coach, not a form: one honest observation, and when it helps, one idea to try.
- ALWAYS end an answer or a piece of advice with ONE short question or offer that moves the
  conversation on ("Want me to suggest the next three steps?", "Shall I break that down?").
  A reply that just stops leaves the user nothing to do.
- Never state a count, duration or date as a fact unless it is in what you were given. You MAY
  propose one as advice ("try a 15-minute starter"). The next session of this routine is
  tomorrow's, not today's.
- Second person, warm and direct. Two to four short sentences: summarise, do not walk through
  the week day by day. No preamble, no markdown headings, no emoji.

You MUST reply with a single JSON object and nothing else:
{
  "reply": "the message shown in the chat bubble",
  "intent": "add_tasks | suggest_tasks | break_down | complete_task | defer_task | skip_task | status | chat",
  "tasks": ["checklist item", "..."],
  "completeItemId": "id of the checklist item the user says is done, or null",
  "targetItemId": "id of the checklist item a defer_task or skip_task acts on, or null",
  "suggestions": ["what the user might say next", "...", "..."],
  "ask": "one short question that ends your reply and moves the conversation on, or null"
}

Rules for the fields:
- A QUESTION IS NEVER AN ADD. "How was my week?", "What's next for the project?", "How should
  I plan this?" are questions: answer them with intent "chat".
- intent "add_tasks": ONLY when the user explicitly asks you to add, put or create something
  ("add …", "put … on my list", "remind me to …", "yes, add them"). Put each new item in
  "tasks" (1-3 items, imperative, under 60 characters). "reply" confirms what was added.
- intent "suggest_tasks": you are recommending concrete work the user did not ask you to add
  (for example the project's next steps, or what to do in the next session). Put 1-3 items in
  "tasks". They are shown with an "Add all to checklist" button, so "reply" must NOT say they
  were added — say what they are for and invite the user to add them.
- intent "break_down": the user asked to split an existing item. Put exactly 3 concrete
  sub-steps in "tasks". "reply" names the item being broken down. These are PROPOSALS, so do
  not claim they were added.
- intent "complete_task": the user says something is finished ("done with X", "finished X",
  "X is done"). Saying so IS the request: tick it, do not ask for confirmation. Set
  "completeItemId" to the id of the single best matching OPEN checklist item. If nothing
  matches, use intent "chat" and ask which one.
- intent "defer_task": the user wants an item moved to TOMORROW ("move X to tomorrow", "I ran
  out of time, push X"). Set "targetItemId" to the id of the single best matching OPEN item.
  "reply" names the item and says it moves to tomorrow.
- intent "skip_task": the user says they will not do an item today ("skip X", "I won't get to
  X"). Set "targetItemId" the same way. "reply" says it is recorded as missed for today — it
  is NOT carried over, nothing is created on another day.
- Tomorrow is the only day you can reach. If the user names any other day, use intent "chat"
  and tell them to use the task's own date chips on the checklist.
- intent "status": the user asked how they are doing. Quote the D/K/G percentages you were
  given, verbatim.
- intent "chat": anything else, including every question. Leave "tasks" empty and both ids null.
- "suggestions": 2-3 short follow-ups (under 6 words each) the user is likely to tap next,
  written as the USER would say them, and grounded in this routine ("How was my week?",
  "Break down <item>", "What's next on <project>?"). Never repeat the user's last message.
- "ask": for intents chat, status, suggest_tasks and break_down, ONE short question (under 15
  words, ending in "?") that invites the next step, e.g. "Want me to line up the demo video for
  tomorrow?". It is shown after "reply", so do not repeat it there. null for the other intents.
- Never say an item was moved, carried over, skipped, deleted, renamed or completed unless you
  set the matching intent and id above. If nothing matches, say you could not do it.
- You cannot delete a checklist item or a routine, or change an item's points, tags or parent
  goal. If asked, use intent "chat" and say plainly that you cannot do it from here.`;

/** "Today is Sun 25-10-2026. Tomorrow is Mon 26-10-2026." so no date is guessed. */
function describeDay(date) {
  const today = moment(date, 'DD-MM-YYYY', true);
  if (!today.isValid()) return `Today is ${date || 'today'}.`;
  const tomorrow = today.clone().add(1, 'day');
  return `Today is ${today.format('ddd DD-MM-YYYY')}. Tomorrow is ${tomorrow.format('ddd DD-MM-YYYY')}.`;
}

function describeContext(context = {}) {
  const {
    week,
    brief,
    routineName,
    routineTime,
    routineEnd,
    routineStatus,
    stimulus,
    points,
    ticked,
    doneCount,
    totalCount,
    items = [],
    scores = {},
    date,
  } = context;

  const checklist = items.length
    ? items
      .map((item) => `  - id=${item.id} [${item.isComplete ? 'done' : 'open'}] ${item.body}`)
      .join('\n')
    : '  (the checklist is empty)';

  return `${describeDay(date)}
Routine: ${routineName || 'this routine'} · ${routineTime || '??'} – ${routineEnd || '??'}
Routine state: ${routineStatus || 'unknown'}${ticked ? ' · already ticked' : ' · not ticked yet'}
Ticking it earns ${stimulus || 'D'} +${points || 0}.
Checklist: ${doneCount || 0} of ${totalCount || 0} done.
${checklist}
Today's stimuli: Discipline ${scores.D || 0}% · Kinetics ${scores.K || 0}% · Geniuses ${scores.G || 0}%.

THIS ROUTINE, LAST 7 DAYS (before today):
${week || '(no history yet)'}

AREA / PROJECT CONTEXT:
${brief || '(none: this routine has no area or project tag yet)'}`;
}

function coerceTasks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (entry && typeof entry.body === 'string') return entry.body.trim();
      if (entry && typeof entry.title === 'string') return entry.title.trim();
      return '';
    })
    .filter(Boolean)
    .slice(0, 5)
    .map((body) => (body.length > 120 ? body.slice(0, 120) : body));
}

/**
 * A reply claiming the assistant MOVED or SKIPPED something, in the first
 * person and as a completed act.
 *
 * The chat can do exactly three things to data — add items, break one down, and
 * tick one off. There is no reschedule or skip intent, so when the model says
 * "I've moved that to tomorrow" the intent is `chat` and nothing happens at all;
 * the user reads a confirmation, reloads, and finds the item exactly where it
 * was (D-04).
 *
 * Deliberately narrow. It matches a first-person completed claim and nothing
 * else, so advice ("you could skip it today", "try moving this to tomorrow")
 * and questions survive untouched — those are useful and true.
 */
const ACTION_VERBS = 'moved|rescheduled|deferred|postponed|pushed|carried|shifted'
  + '|skipped|cancelled|canceled|removed|deleted';

const FALSE_ACTION_CLAIM = new RegExp([
  // "I've moved it", "I have rescheduled", "I just skipped that"
  `\\bi(?:'ve|’ve| have| )\\s*(?:just\\s+)?(?:${ACTION_VERBS}|move|reschedule|defer|postpone`
  + '|push|carry|shift|skip|cancel|remove|delete)\\b',
  // "Moved it to tomorrow for you." — the model drops the pronoun as often as
  // not, so a past-tense verb opening a sentence counts as the same claim.
  // Past tense only: "Try moving this" and "you could skip it" are advice.
  `(?:^|[.!?]\\s+)(?:${ACTION_VERBS})\\b`,
].join('|'), 'i');

/** What the chat says instead, naming where the user CAN do it. */
const CANNOT_MOVE_REPLY = "I can't move or skip items from here. Tap the item in the "
  + 'checklist to open it, then use its date chips to change the day.';

// "Routine deleted." — the passive form of the same false claim, which
// FALSE_ACTION_CLAIM's first-person and sentence-opening shapes miss. Seen in
// chat QA, 25 Oct, answering "delete this routine" with nothing deleted.
const PASSIVE_CHANGE_CLAIM = /\b(?:routine|item|task|goal|it|that|this)\s+(?:is\s+|was\s+|has\s+been\s+|now\s+)?(?:deleted|removed|renamed|cancell?ed)\b/i;
// Which refusal a false claim gets: deleting is not moving.
const CHANGE_WORDS = /\b(?:delet|remov|cancel|renam)\w*/i;
const CANNOT_CHANGE_REPLY = "I can't delete, rename or remove anything from here, so nothing changed. "
  + 'Open the routine or the item in the app to change it.';

/**
 * Turn the user's message into a reply plus a machine-readable intent the
 * client can act on (create goal items, tick one off, move one to tomorrow,
 * record one as missed, or nothing at all).
 *
 * Never throws: a model outage degrades to a plain `chat` reply that says so,
 * because a dead chat must not break the dashboard around it.
 *
 * @param {Object} params
 * @param {string} params.text The user's message.
 * @param {Array<{from: string, text: string}>} params.history Prior turns, oldest first.
 * @param {Object} params.context Routine/checklist/stimulus snapshot.
 * @returns {Promise<{reply: string, intent: string, tasks: string[],
 *   completeItemId: ?string, targetItemId: ?string, model: ?string, error: ?string}>}
 */
async function chatWithRoutine({ text, history = [], context = {} }) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return {
      reply: 'Say something and I will log it against this routine.',
      intent: 'chat',
      tasks: [],
      suggestions: [],
      completeItemId: null,
      targetItemId: null,
      model: null,
      error: null,
    };
  }

  // Keep the window short — free models have small context budgets and the
  // routine snapshot below is the part that actually matters.
  const turns = history
    .slice(-10)
    .filter((m) => m && m.text)
    .map((m) => ({
      role: m.from === 'me' ? 'user' : 'assistant',
      // A reply's suggested tasks live beside its text, not in it. Without them
      // "yes, add them" reached a model that could not see what "them" was.
      content: Array.isArray(m.proposals) && m.proposals.length
        ? `${m.text}\n[Suggested tasks: ${m.proposals.join('; ')}]`
        : String(m.text),
    }));

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: describeContext(context) },
    ...turns,
    { role: 'user', content: trimmed },
  ];

  try {
    let { content, model } = await completeChat(messages, { jsonMode: true });
    let parsed = parseTurn(content);
    if (!parsed) {
      // A model that answered with no usable reply (broken JSON, or an empty
      // "reply") left the user a bare "Noted." in a third of the QA runs. The
      // rest of the roster gets one more go before the turn settles for less.
      const rest = (await resolveFreeModels()).filter((m) => m !== model);
      if (rest.length) {
        try {
          ({ content, model } = await completeChat(messages, { jsonMode: true, models: rest }));
          parsed = parseTurn(content);
        } catch (retryError) {
          // Keep the first answer; it is still better than an outage.
        }
      }
    }
    if (!parsed) {
      // A free model that ignored JSON mode may still have said something
      // useful — keep its prose, but only if it IS prose. Reasoning models
      // answer with their own chain of thought, and dumping that into a chat
      // bubble is worse than saying nothing.
      // JSON with an empty reply is not prose either.
      const prose = (!/^\s*[{[]/.test(content) && usableProse(content)) || FALLBACK_REPLY;
      return {
        reply: claimsCarryOver(prose) ? NO_RESCHEDULE_REPLY : prose,
        intent: 'chat',
        tasks: [],
        suggestions: [],
        completeItemId: null,
        targetItemId: null,
        model,
        error: null,
      };
    }

    let intent = INTENTS.includes(parsed.intent) ? parsed.intent : 'chat';
    const tasks = coerceTasks(parsed.tasks);
    // An add the user never asked for is a suggestion, not a write.
    const downgraded = intent === 'add_tasks' && !asksToAdd(trimmed);
    if (downgraded) intent = 'suggest_tasks';
    if (intent === 'suggest_tasks' && !tasks.length) intent = 'chat';
    const openIds = (context.items || [])
      .filter((item) => item && !item.isComplete)
      .map((item) => String(item.id));
    const claimed = parsed.completeItemId ? String(parsed.completeItemId) : null;
    // Only honour an id that is actually an open item on this routine — a
    // hallucinated id would otherwise complete nothing and report success.
    const completeItemId = claimed && openIds.includes(claimed) ? claimed : null;
    // Same rule for the item a defer or a skip names: moving the wrong task is
    // worse than not moving one.
    const named = parsed.targetItemId ? String(parsed.targetItemId) : null;
    const targetItemId = TARGET_INTENTS.includes(intent) && named && openIds.includes(named)
      ? named
      : null;

    let resolvedIntent = intent;
    if (intent === 'complete_task' && !completeItemId) resolvedIntent = 'chat';
    if (TARGET_INTENTS.includes(intent) && !targetItemId) resolvedIntent = 'chat';

    // No defer is going to run, so a reply promising one is a claim the client
    // cannot take back once the bubble is saved (D-04). Deferring is the only
    // intent that moves an item: a skip records a miss on today's item and
    // creates nothing on another day, so it must not promise a carry-over either.
    const deferring = resolvedIntent === 'defer_task';

    // An intent that will change nothing must not carry a reply claiming it
    // did. Same rule as `completeItemId` above, applied to the prose: the chat
    // never asserts an action the system did not take.
    const rawReply = String(parsed.reply || '').trim() || 'Noted.';
    let reply = rawReply;
    const proposing = PROPOSAL_INTENTS.includes(resolvedIntent);
    if ((downgraded || proposing) && claimsAdded(rawReply)) reply = SUGGESTED_REPLY;
    else if (resolvedIntent === 'chat' && FALSE_ACTION_CLAIM.test(rawReply)) {
      reply = CHANGE_WORDS.test(rawReply) ? CANNOT_CHANGE_REPLY : CANNOT_MOVE_REPLY;
    }
    else if (!CAPABILITY_DENIAL.test(rawReply) && PASSIVE_CHANGE_CLAIM.test(rawReply)) reply = CANNOT_CHANGE_REPLY;
    else if (proposing && FALSE_ACTION_CLAIM.test(rawReply)) reply = SUGGESTED_REPLY;
    // A suggestion naturally says "for tomorrow's session"; that is a plan, not
    // a claim that something moved, so the carry-over guard skips proposals.
    else if (!deferring && !proposing && claimsCarryOver(rawReply)) reply = NO_RESCHEDULE_REPLY;

    // Hand the conversation back. Models follow "end with a question" loosely,
    // so the question is its own field and is added here when the reply lacks
    // one. A guard's fixed replacement text is left as written.
    const ask = closingQuestion(parsed.ask);
    if (ask && reply === rawReply && ASKING_INTENTS.includes(resolvedIntent) && !reply.includes('?')) {
      reply = `${reply} ${ask}`;
    }

    return {
      reply,
      intent: resolvedIntent,
      tasks: intent === 'add_tasks' || PROPOSAL_INTENTS.includes(intent) ? tasks : [],
      completeItemId,
      targetItemId,
      suggestions: coerceSuggestions(parsed.suggestions, trimmed),
      model,
      error: null,
    };
  } catch (error) {
    console.error('chatWithRoutine failed:', error.message);
    return {
      reply: "I can't reach the chat model right now — your message is saved, try again in a moment.",
      intent: 'chat',
      tasks: [],
      completeItemId: null,
      targetItemId: null,
      suggestions: [],
      model: null,
      error: error.message,
    };
  }
}

module.exports = {
  chatWithRoutine,
  completeChat,
  freeModels,
  configuredFreeModels,
  fetchFreeModels,
  resolveFreeModels,
  modelRank,
  usableProse,
  claimsCarryOver,
  clearModelCache,
  cleanJson,
  describeContext,
  FALLBACK_FREE_MODELS,
  MAX_ATTEMPTS,
  INTENTS,
  TARGET_INTENTS,
  PROPOSAL_INTENTS,
  asksToAdd,
  coerceSuggestions,
  NO_RESCHEDULE_REPLY,
};
