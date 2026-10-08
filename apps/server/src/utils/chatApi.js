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
  reasoning = { enabled: false, exclude: true },
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
    try {
      // Sequential on purpose: the roster is a failover chain, not a race.
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
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
      failures.push(`${model}: ${error.message}`);
    }
  }

  throw new Error(`All OpenRouter models failed — ${failures.join(' | ')}`);
}

const INTENTS = ['add_tasks', 'break_down', 'complete_task', 'status', 'chat'];

const FALLBACK_REPLY = "I didn't get that one cleanly — try asking again, or say "
  + '"add …" to put something on the checklist.';

// Giveaways that a model answered with its own thinking instead of a reply:
// a numbered deliberation, an explicit preamble, or quoting the contract back.
const REASONING_MARKERS = [
  /thinking process/i,
  /^\s*(okay|alright|first|let me|we need to|the user (says|wants|asked))/i,
  /\*\*(analyze|determine|identify|formulate|plan)/i,
  /intent\s*[:=]\s*"/i,
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
discipline app. The user is mid-day and talks to this one routine, not to a general assistant.

Routine Notes vocabulary:
- A "routine" is a time-boxed slot in the user's day (e.g. "Start Work · 09:00 – 12:30").
- A routine's "checklist" holds that slot's day goal items.
- D/K/G are the three stimuli: Discipline (habits kept), Kinetics (body moved), Geniuses (focused output).
- Ticking a routine earns its stimulus points. Completing checklist items moves Kinetics on that routine.

Answer in the second person, warm but terse — one or two short sentences, no preamble, no
markdown headings, no emoji. Never invent checklist items that were not given to you.

You MUST reply with a single JSON object and nothing else:
{
  "reply": "the message shown in the chat bubble",
  "intent": "add_tasks | break_down | complete_task | status | chat",
  "tasks": ["new checklist item", "..."],
  "completeItemId": "id of the checklist item the user says is done, or null"
}

Rules for the fields:
- intent "add_tasks": the user asked to add work. Put each new item in "tasks" (1-3 items,
  imperative, under 60 characters). "reply" confirms what was added.
- intent "break_down": the user asked to split an existing item. Put exactly 3 concrete
  sub-steps in "tasks". "reply" names the item being broken down. These are PROPOSALS, so do
  not claim they were added.
- intent "complete_task": the user says something is finished. Set "completeItemId" to the id
  of the single best matching OPEN checklist item. If nothing matches, use intent "chat" and
  ask which one.
- intent "status": the user asked how they are doing. Quote the D/K/G percentages you were
  given, verbatim.
- intent "chat": anything else. Leave "tasks" empty and "completeItemId" null.

What you CANNOT do — never claim otherwise:
- You cannot move, reschedule, defer, postpone or carry over a checklist item to another day.
- You cannot skip, cancel or delete a checklist item or a routine.
- You cannot change an item's date, points, tags or parent goal.
If the user asks for any of these, use intent "chat" and say plainly that you cannot do it
from here, then point them at the item's date chips in its goal sheet (tap the checklist row
to open it). Never reply as though the move already happened.`;

function describeContext(context = {}) {
  const {
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

  return `Today is ${date || 'today'}.
Routine: ${routineName || 'this routine'} · ${routineTime || '??'} – ${routineEnd || '??'}
Routine state: ${routineStatus || 'unknown'}${ticked ? ' · already ticked' : ' · not ticked yet'}
Ticking it earns ${stimulus || 'D'} +${points || 0}.
Checklist: ${doneCount || 0} of ${totalCount || 0} done.
${checklist}
Today's stimuli: Discipline ${scores.D || 0}% · Kinetics ${scores.K || 0}% · Geniuses ${scores.G || 0}%.`;
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

/**
 * Turn the user's message into a reply plus a machine-readable intent the
 * client can act on (create goal items, tick one off, or nothing at all).
 *
 * Never throws: a model outage degrades to a plain `chat` reply that says so,
 * because a dead chat must not break the dashboard around it.
 *
 * @param {Object} params
 * @param {string} params.text The user's message.
 * @param {Array<{from: string, text: string}>} params.history Prior turns, oldest first.
 * @param {Object} params.context Routine/checklist/stimulus snapshot.
 * @returns {Promise<{reply: string, intent: string, tasks: string[],
 *   completeItemId: ?string, model: ?string, error: ?string}>}
 */
async function chatWithRoutine({ text, history = [], context = {} }) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return {
      reply: 'Say something and I will log it against this routine.',
      intent: 'chat',
      tasks: [],
      completeItemId: null,
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
      content: String(m.text),
    }));

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: describeContext(context) },
    ...turns,
    { role: 'user', content: trimmed },
  ];

  try {
    const { content, model } = await completeChat(messages, { jsonMode: true });
    let parsed;
    try {
      parsed = JSON.parse(cleanJson(content));
    } catch (e) {
      // A free model that ignored JSON mode may still have said something
      // useful — keep its prose, but only if it IS prose. Reasoning models
      // answer with their own chain of thought, and dumping that into a chat
      // bubble is worse than saying nothing.
      return {
        reply: usableProse(content) || FALLBACK_REPLY,
        intent: 'chat',
        tasks: [],
        completeItemId: null,
        model,
        error: null,
      };
    }

    const intent = INTENTS.includes(parsed.intent) ? parsed.intent : 'chat';
    const tasks = coerceTasks(parsed.tasks);
    const openIds = (context.items || [])
      .filter((item) => item && !item.isComplete)
      .map((item) => String(item.id));
    const claimed = parsed.completeItemId ? String(parsed.completeItemId) : null;
    // Only honour an id that is actually an open item on this routine — a
    // hallucinated id would otherwise complete nothing and report success.
    const completeItemId = claimed && openIds.includes(claimed) ? claimed : null;

    // An intent that will change nothing must not carry a reply claiming it
    // did. Same rule as `completeItemId` above, applied to the prose: the chat
    // never asserts an action the system did not take.
    const settledIntent = intent === 'complete_task' && !completeItemId ? 'chat' : intent;
    const rawReply = String(parsed.reply || '').trim() || 'Noted.';
    const reply = settledIntent === 'chat' && FALSE_ACTION_CLAIM.test(rawReply)
      ? CANNOT_MOVE_REPLY
      : rawReply;

    return {
      reply,
      intent: settledIntent,
      tasks: intent === 'add_tasks' || intent === 'break_down' ? tasks : [],
      completeItemId,
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
  clearModelCache,
  cleanJson,
  describeContext,
  FALLBACK_FREE_MODELS,
  MAX_ATTEMPTS,
  INTENTS,
};
