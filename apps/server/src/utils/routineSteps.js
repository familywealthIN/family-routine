/**
 * Standard steps for a new routine.
 *
 * A routine's steps are its best cue: in Atomic Habits, putting on running
 * shoes is what starts the run. So step 1 is always the small PHYSICAL act
 * that begins the routine, and the notification cue leads with it.
 *
 * Two sources, in order:
 *   1. the library below — common routines, matched by keywords in the name
 *      (case-insensitive), first match wins, so the more specific entries sit
 *      above the broader ones ("wind down" before "sleep", "workout" before
 *      "work", which is last of all);
 *   2. for any other name, a model writes 3 steps in the same style: the free
 *      OpenRouter roster first, then a cheap paid Qwen, never an OpenAI model.
 *      If both fail, or the whole thing outlives its deadline, there are no
 *      steps — a routine without suggestions is still a routine.
 *
 * Every step is short (STEP_MAX characters), concrete and imperative.
 */
const { completeChat, cleanJson } = require('./chatApi');

const STEP_MAX = 50;
const MIN_STEPS = 2;
const MAX_STEPS = 4;
const NAME_MAX = 100;

// The whole suggestion — free roster and paid fallback together — answers
// within this, or answers nothing.
const AI_DEADLINE_MS = 12000;
// How much of the deadline the free roster may use before the paid model runs.
const FREE_BUDGET_MS = 6500;
// One free model's own deadline inside that budget.
const FREE_MODEL_TIMEOUT_MS = 4000;
// Cheap paid Qwen, in order. Never an OpenAI model (owner rule).
const PAID_MODELS = ['qwen/qwen3-235b-a22b-2507', 'qwen/qwen3.5-flash-02-23'];

/**
 * keywords (regexes against the lowercased name) -> steps. Step 1 is the cue.
 */
const LIBRARY = [
  {
    key: 'wind-down',
    match: [/\bwind[\s-]?down\b/, /\bbed\s?time\b/, /\bunwind\b/, /\bevening routine\b/],
    steps: ['Dim the lights', 'Put your phone on charge outside the bedroom', 'Write one line in your journal'],
  },
  {
    key: 'wake-up',
    match: [/\bwake\b/, /\bwaking\b/, /\bwake[\s-]?up\b/, /\brise\b/, /\bget(ting)? up\b/, /\bmorning routine\b/],
    steps: ['Feet on the floor', 'Drink a glass of water', 'Open the curtains'],
  },
  {
    key: 'sleep',
    match: [/\bsleep/, /\bbed\b/, /\blights? out\b/, /\bnap\b/],
    steps: ['Set your alarm for tomorrow', 'Get into bed', 'Lights off and breathe slowly'],
  },
  {
    key: 'jogging',
    match: [/\bjog/, /\brun\b/, /\bruns\b/, /\brunning\b/, /\b5k\b/, /\b10k\b/, /\bmarathon\b/],
    steps: ['Put on your running shoes', 'Step out the door', 'Run an easy 10 minutes'],
  },
  {
    key: 'meditation',
    match: [/\bmeditat/, /\bmindful/, /\bbreath(e|ing|work)\b/],
    steps: ['Sit on your cushion', 'Set a 2-minute timer', 'Close your eyes and breathe'],
  },
  {
    key: 'yoga',
    match: [/\byoga\b/, /\bpilates\b/],
    steps: ['Roll out your mat', 'Start with three slow breaths', 'Flow through one short sequence'],
  },
  {
    key: 'stretching',
    match: [/\bstretch/, /\bmobility\b/, /\bfoam roll/],
    steps: ['Stand up from your chair', 'Reach both arms overhead', 'Hold each stretch for 30 seconds'],
  },
  {
    key: 'workout',
    match: [/\bwork[\s-]?out\b/, /\bgym\b/, /\bexercis/, /\bstrength\b/, /\blift(ing)?\b/, /\bweights?\b/, /\btraining\b/, /\bhiit\b/, /\bfitness\b/],
    steps: ['Put on your workout clothes', 'Fill your water bottle', 'Do one warm-up set'],
  },
  {
    key: 'walk',
    match: [/\bwalk/, /\bstroll\b/, /\bhike\b/, /\bhiking\b/],
    steps: ['Put on your walking shoes', 'Step outside', 'Walk to the end of the street'],
  },
  {
    key: 'journaling',
    match: [/\bjournal/, /\bdiary\b/, /\bgratitude\b/, /\bgrateful\b/, /\breflect/],
    steps: ['Open your journal', 'Write today\'s date', 'Write three lines, no editing'],
  },
  {
    key: 'reading',
    match: [/\bread(ing)?\b/, /\bbooks?\b/, /\bkindle\b/],
    steps: ['Pick up your book', 'Open to your bookmark', 'Read one page'],
  },
  {
    key: 'study',
    match: [/\bstud(y|ying|ies)\b/, /\blearn/, /\bhomework\b/, /\brevis(e|ion)\b/, /\bexam/],
    steps: ['Clear your desk', 'Open today\'s material', 'Study for 25 minutes'],
  },
  {
    key: 'finances',
    match: [/\bfinanc/, /\bbudget/, /\bbills?\b/, /\bpay(ment|ments)?\b/, /\bmoney\b/, /\bexpenses?\b/, /\binvoic/, /\baccounts?\b/],
    steps: ['Open your banking app', 'Check this week\'s payments', 'Note one thing to change'],
  },
  {
    key: 'review',
    match: [/\breview\b/, /\bretro/, /\bweekly check[\s-]?in\b/],
    steps: ['Open your notes from the week', 'List three wins', 'Pick next week\'s one focus'],
  },
  {
    key: 'planning',
    match: [/\bplan(ning)?\b/, /\bprepare\b/, /\bprep for\b/, /\btomorrow\b/, /\bto[\s-]?do list\b/, /\bschedule\b/],
    steps: ['Open your planner', 'Write your top three tasks', 'Block time for the first one'],
  },
  {
    key: 'hydration',
    match: [/\bwater\b/, /\bhydrat/],
    steps: ['Fill your water bottle', 'Put it where you can see it', 'Drink one glass now'],
  },
  {
    key: 'cooking',
    match: [/\bcook/, /\bmeal[\s-]?prep/, /\brecipe/, /\bbake\b/, /\bbaking\b/],
    steps: ['Put on your apron', 'Lay out the ingredients', 'Follow the first step of the recipe'],
  },
  {
    key: 'meals',
    match: [/\bbreakfast\b/, /\blunch\b/, /\bdinner\b/, /\bsupper\b/, /\beat(ing)?\b/],
    steps: ['Set a place at the table', 'Serve a simple, balanced plate', 'Eat without your phone'],
  },
  {
    key: 'cleaning',
    match: [/\bclean/, /\btidy/, /\bchores?\b/, /\blaundry\b/, /\bdishes\b/, /\bdeclutter/, /\bvacuum/, /\bhousework\b/],
    steps: ['Put on some music', 'Pick one room', 'Clear one surface first'],
  },
  // Broadest last: a bare "work" would otherwise claim "clean the work desk".
  {
    key: 'deep-work',
    match: [/\bdeep work\b/, /\bstart work\b/, /\bfocus/, /\bwork\b/, /\bwriting\b/, /\bcoding\b/],
    steps: ['Put your phone in another room', 'Open the one task that matters', 'Work for 25 minutes'],
  },
];

/** The library entry a routine name matches, or null. */
function matchLibrary(name) {
  const text = String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return LIBRARY.find((entry) => entry.match.some((re) => re.test(text))) || null;
}

/** The library's steps for a name, or [] — a copy, so a caller cannot edit the library. */
function libraryStepsFor(name) {
  const entry = matchLibrary(name);
  return entry ? [...entry.steps] : [];
}

// Pictographic characters: a step is plain text, no emoji.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]|\u{FE0F}|\u{200D}/u;

/** The text of a step written as "…" or as { name: "…" }. */
function stepText(value) {
  if (typeof value === 'string') return value;
  return value && typeof value.name === 'string' ? value.name : '';
}

/** One model-written step, cleaned, or '' when it cannot be used as one. */
function cleanStep(value) {
  const raw = stepText(value);
  const step = raw
    .replace(/\s+/g, ' ')
    .trim()
    // "1. Put on…", "- Put on…", "Step 1: Put on…"
    .replace(/^(?:step\s*\d+\s*[:.)-]\s*|\d+\s*[.)-]\s*|[-*•]\s*)/i, '')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .replace(/\.$/, '')
    .trim();
  if (!step || step.length > STEP_MAX || EMOJI.test(step)) return '';
  return step;
}

/**
 * The model's answer as 2-4 usable steps, or null when it is not one. Steps
 * that are too long, empty or repeated are dropped first; what is left must
 * still be at least MIN_STEPS.
 */
function parseSteps(content) {
  let parsed;
  try {
    parsed = JSON.parse(cleanJson(content));
  } catch (e) {
    return null;
  }
  const list = Array.isArray(parsed) ? parsed : parsed && parsed.steps;
  if (!Array.isArray(list)) return null;
  const seen = new Set();
  const steps = list
    .map(cleanStep)
    .filter((step) => {
      const key = step.toLowerCase();
      if (!step || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_STEPS);
  return steps.length >= MIN_STEPS ? steps : null;
}

function promptFor(name) {
  return [
    {
      role: 'system',
      content: 'You write the first steps of a daily habit, in the style of Atomic Habits. '
        + 'Step 1 is always the small physical cue that starts the habit, like '
        + '"Put on your running shoes" before a run or "Sit on your cushion" before meditation. '
        + `Write exactly 3 steps. Each is imperative, concrete and under ${STEP_MAX} characters. `
        + 'No numbering, no emoji, no explanations. '
        + 'Answer with strict JSON only: {"steps": ["...", "...", "..."]}',
    },
    { role: 'user', content: `Routine: ${name}` },
  ];
}

/** `promise`, or `fallback` once `ms` have passed — whichever settles first. */
function withDeadline(promise, ms, fallback) {
  let timer;
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback), Math.max(0, ms));
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

/** One completeChat call, validated: the steps, or null on any failure. */
async function attempt(messages, options) {
  try {
    const reply = await completeChat(messages, {
      jsonMode: true, maxTokens: 300, temperature: 0.4, ...options,
    });
    return parseSteps(reply && reply.content);
  } catch (error) {
    return null;
  }
}

/**
 * Ask a model for steps: the free roster, then each paid Qwen in turn, within
 * AI_DEADLINE_MS overall. Never throws; [] when nothing usable came back.
 */
async function aiStepsFor(name, { deadlineMs = AI_DEADLINE_MS } = {}) {
  const started = Date.now();
  const left = () => deadlineMs - (Date.now() - started);
  const messages = promptFor(name);

  const free = await withDeadline(
    attempt(messages, { timeoutMs: FREE_MODEL_TIMEOUT_MS }),
    Math.min(FREE_BUDGET_MS, left()),
    null,
  );
  if (free) return free;

  for (let i = 0; i < PAID_MODELS.length; i += 1) {
    const remaining = left();
    if (remaining <= 0) break;
    // Sequential on purpose: the second model only runs when the first failed.
    // eslint-disable-next-line no-await-in-loop
    const paid = await withDeadline(
      attempt(messages, { models: [PAID_MODELS[i]], timeoutMs: remaining }),
      remaining,
      null,
    );
    if (paid) return paid;
  }
  return [];
}

// Model answers per name, per warm container, so a name typed twice (or the
// editor's suggestion followed by the save's default) costs one model call.
const CACHE_MAX = 200;
const aiCache = new Map();

function clearStepsCache() {
  aiCache.clear();
}

/**
 * The standard steps for a routine name: the library's, else a model's, else
 * []. Never throws.
 *
 * @param {string} name
 * @param {{ ai?: boolean, deadlineMs?: number }} [options] `ai: false` uses the library only
 * @returns {Promise<string[]>}
 */
async function suggestRoutineSteps(name, { ai = true, deadlineMs } = {}) {
  const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  if (!clean) return [];

  const fromLibrary = libraryStepsFor(clean);
  if (fromLibrary.length || !ai) return fromLibrary;

  const key = clean.toLowerCase();
  if (aiCache.has(key)) return [...aiCache.get(key)];

  const steps = await aiStepsFor(clean, { deadlineMs });
  if (steps.length) {
    if (aiCache.size >= CACHE_MAX) aiCache.delete(aiCache.keys().next().value);
    aiCache.set(key, steps);
  }
  return [...steps];
}

module.exports = {
  LIBRARY,
  PAID_MODELS,
  STEP_MAX,
  MIN_STEPS,
  MAX_STEPS,
  AI_DEADLINE_MS,
  matchLibrary,
  libraryStepsFor,
  cleanStep,
  parseSteps,
  aiStepsFor,
  suggestRoutineSteps,
  clearStepsCache,
};
