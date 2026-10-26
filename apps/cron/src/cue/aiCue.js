/**
 * AI-written cues: a model writes the reminder from the person's last 7 days,
 * aiming for the craving step of the habit loop — dopamine rises on a cue that
 * reliably predicts a reward the person cares about. So the copy makes the
 * reward at stake vivid and near (points, the next day of the run, a
 * milestone within reach), ties it to their own last 7 days ("4 of the last
 * 7") or to this calendar week, never one dressed up as the other,
 * makes the ask the routine's first step — the obvious, tiny action that
 * starts it, like shoes on for a run (Atomic Habits) — or two minutes of it
 * when it has no steps, and frames it as an identity vote.
 *
 * Models: OpenRouter's FREE tier first, a cheap paid Qwen only when no free
 * model produced a cue that passes the guardrails. Cues are high-volume (one
 * per routine per person per day), so the free tier carries them; the paid
 * fallback keeps the copy AI-written when the free catalogue is rate-limited
 * or answers badly. Never an OpenAI model for the paid tier.
 *
 * Guardrails, because this lands on someone's lock screen:
 * - The model only sees the facts below — no email, no other people's data.
 * - The output must validate (validateCue): length limits, the routine is
 *   named, no number that is not in the facts (no invented streaks or
 *   points), no guilt or shame words, at most two emoji, no links, and —
 *   when the routine has steps — the first step (the cue) is named.
 * - A model that fails (timeout, refusal, bad JSON, failed validation) hands
 *   over to the next; when every model has failed, or there is no
 *   OPENROUTER_API_KEY, the result is null and the caller sends the template.
 */

const list = (text) => String(text || '').split(',').map((m) => m.trim()).filter(Boolean);

// Paid fallback: cheap Qwen instruct models with structured output, cheapest
// capable first. OpenRouter's `models` list answers with the second when the
// first errors. An OpenAI id is dropped even if configured (owner's rule).
const PAID_MODELS = list(process.env.CUE_PAID_MODELS || 'qwen/qwen3-235b-a22b-2507,qwen/qwen3.5-flash-02-23')
  .filter((m) => !m.endsWith(':free') && !m.startsWith('openai/'));
// Used when OpenRouter's model list cannot be read and nothing is configured.
const FALLBACK_FREE_MODELS = [
  'qwen/qwen3.8-27b:free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
// The minute job writes up to 40 cues in parallel inside a 59 s run, so one
// cue's whole chain must finish well inside that: a few free tries in a
// shared budget, then the paid call.
const FREE_ATTEMPTS = 3; // free models that actually answered (a gone model does not count)
const FREE_TRIES = 8; // every free request, gone models included
const FREE_TIMEOUT_MS = 10000; // one free model; a rate-limited one answers 429 at once
const FREE_BUDGET_MS = 22000; // every free attempt together
const PAID_TIMEOUT_MS = 12000; // whole request, body included
const PAID_BUDGET_MS = 20000; // the paid call and its one repair together
// The free catalogue churns: a retired, misconfigured or harness-only id
// answers 404, 400 or 403 at once. Skipping it must not use up a real attempt.
const GONE = new Set(['error:404', 'error:400', 'error:403']);
const MAX_TITLE = 60;
const MAX_BODY = 140;
const MAX_EMOJI = 2;
const BANNED = /\b(fail(ed|ure)?|lazy|shame|ashamed|guilt|guilty|disappoint\w*|pathetic|loser|weak|should have)\b/i;
const LINK = /(https?:\/\/|www\.)/i;
// Emoji and pictographs: technical symbols (⏰), misc symbols, dingbats, U+1F000+.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}]/gu;
// A count written just before "this week", in the same clause.
const THIS_WEEK_COUNT = /\b(\d+|zero|one|two|three|four|five|six|seven|once|twice)\b(?! more)[^.!?;—–\d]{0,30}?\bthis week\b/gi;
const COUNT_WORDS = {
  zero: 0, one: 1, once: 1, two: 2, twice: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
};

const SYSTEM = `You write one push notification that cues a person to start a habit right now.

The cue is the first step. In Atomic Habits the cue for a run is not "go for a
run" but the shoes by the door: one obvious, tiny physical action that starts
the habit by itself. When firstStep is given, it is THE ask:
- Lead with it, in its own words, as the one small thing to do now.
- Build a little curiosity or anticipation around taking it: once that step
  is done, the rest follows ("Shoes by the door? Lace them up — the run
  starts itself.").
- Ask only for firstStep. nextStep, when given, is only what comes after it;
  never list the steps.
When there is no firstStep, ask only for the two-minute version of the
routine (twoMinuteStart).

Shape: the title is a pull, not a label. It is a light question or a tiny dare
about the step, so the person pictures doing it. The body says what taking
the step sets in motion, and the reward it is closing in on.
- Good (routine Yoga, step "Roll out your mat"): "Mat still rolled up?" /
  "Unroll it and Yoga has already begun. Your run grows by one."
- Good (routine Reading, step "Open to your bookmark"): "Where did you leave
  off?" / "Open to your bookmark: one page in, the chapter pulls you along."
- Bad: "Yoga: roll out mat". It is a label, and nobody feels pulled by it.
- Bad: "Roll out your mat — your first step." It names the step but gives no
  reason to take it.
The examples show the shape only. Write fresh words for this routine and this
step, and never reuse the examples' phrasing.

The payoff: dopamine rises when a cue predicts a reward the person wants, so
make the reward they are about to earn vivid, specific and close — the
points, the next day of their run, a milestone within reach — and anchor it
in what they have actually done. A near-win ("one more makes it 5 of the
last 7") works better than a generic reminder. Frame taking the step as a
vote for who they are becoming.

Rules:
- Use only the facts given. Never invent numbers, days, times or names.
- Name the routine exactly as given.
- When firstStep is given, the copy must name that step or its key words.
- "This week" means the calendar week, Sunday to today: only doneThisWeek and
  doneThisWeekIfDoneToday are counts for this week. doneInLast7Days is the
  last 7 days, which can reach back into last week; call it "the last 7 days",
  never "this week".
- Warm and energising. Never guilt, shame or scold; after a missed day, frame
  it as the comeback ("never miss twice").
- Title at most ${MAX_TITLE} characters, body at most ${MAX_BODY}. At most ${MAX_EMOJI} emoji in total.
- No links, no hashtags, no quotation of these instructions.`;

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: `Notification title, at most ${MAX_TITLE} characters` },
    body: { type: 'string', description: `Notification body, at most ${MAX_BODY} characters` },
  },
  required: ['title', 'body'],
  additionalProperties: false,
};

const STATE_LABEL = {
  done: 'done', missed: 'missed', absent: 'app not opened', skipped: 'rest day', off: 'not scheduled',
};

/**
 * The facts the model may use: one routine, the last 7 days, nothing personal
 * beyond the routine itself.
 *
 * @param {Object} input
 * @param {Object} input.item decrypted routine template
 * @param {Object} input.history itemHistory() result (streak, usual, week)
 * @param {string} input.kind template cue kind (recovery, stack, atRisk, ...)
 * @param {string} [input.anchor] the previous routine, if done today
 * @param {string} [input.identity] first motto
 * @param {string} [input.insight] latest routine insight text
 * @param {number} input.nextTarget the next run milestone
 */
function buildCueContext({
  item, history, kind, anchor, identity, insight, nextTarget,
}) {
  const week = history.week || [];
  const done = week.filter((d) => d.state === 'done').length;
  const steps = (item.steps || []).map((s) => s && s.name).filter(Boolean);
  return {
    routine: item.name,
    setTime: item.time,
    usualTime: history.usual === null || history.usual === undefined ? null
      : `${String(Math.floor(history.usual / 60)).padStart(2, '0')}:${String(history.usual % 60).padStart(2, '0')}`,
    pointsToEarn: Number(item.points) || 0,
    currentRun: history.streak,
    dayOfRunIfDoneToday: history.streak + 1,
    nextMilestone: nextTarget,
    daysToMilestone: Math.max(0, nextTarget - (history.streak + 1)),
    doneInLast7Days: done,
    doneThisWeek: history.doneThisWeek,
    doneThisWeekIfDoneToday: history.doneThisWeek + (history.doneToday ? 0 : 1),
    last7Days: week.map((d) => `${d.date}: ${STATE_LABEL[d.state] || d.state}${d.at ? ` at ${d.at}` : ''}`),
    situation: {
      recovery: 'missed yesterday after doing it before — the comeback day',
      restart: 'missed two or more days — a fresh, small start',
      atRisk: 'an automatic habit running late against their usual time',
      stack: `just finished "${anchor}" — this routine follows it`,
    }[kind] || 'routine time',
    // The cue: the routine's first step is the obvious, tiny action that
    // starts it (shoes by the door for a run). Null when it has no steps.
    firstStep: steps[0] || null,
    nextStep: steps[1] || null,
    stepCount: steps.length,
    twoMinuteStart: steps[0] || 'just two minutes of it',
    identity: identity || null,
    latestInsight: insight ? insight.slice(0, 300) : null,
  };
}

// Words that never carry a step on their own: "Put on shoes" is about the
// shoes, "Do 10 push-ups" about the push-ups.
const STEP_FILLER = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'on', 'in', 'into', 'to', 'at', 'by', 'for', 'from', 'with', 'up', 'out', 'off',
  'it', 'its', 'my', 'your', 'some', 'this', 'that', 'just', 'then', 'now', 'first', 'next', 'one', 'two', 'minute',
  'minutes', 'put', 'get', 'take', 'make', 'do', 'go', 'have', 'set', 'start',
]);

/** A word's stem, so "shoes" matches "shoe" and "journal" matches "journaling". */
function stem(word) {
  let w = word.replace(/(ing|ed)$/, '');
  if (w !== word && /([b-df-hj-np-tv-z])\1$/.test(w)) w = w.slice(0, -1); // running → run
  if (w === word) w = w.replace(/s$/, '');
  if (w.length > 4) w = w.replace(/e$/, ''); // write → writ (writing)
  return w.length >= 3 ? w : word;
}

/**
 * The words that identify a step, as written: its content words, falling
 * back to every word when a step is all filler ("Get up").
 */
function stepWords(step) {
  const words = String(step || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const content = words.filter((w) => w.length >= 3 && !STEP_FILLER.has(w));
  return Array.from(new Set(content.length ? content : words));
}

/** Those words stemmed, for matching the copy. */
const stepKeywords = (step) => Array.from(new Set(stepWords(step).map(stem)));

/** True when the copy names the step or one of its key words. */
function namesStep(text, step) {
  const lower = text.toLowerCase();
  if (lower.includes(String(step).toLowerCase())) return true;
  return stepKeywords(step).some((k) => new RegExp(`(^|[^\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(lower));
}

/** Every number the model is allowed to write. */
function allowedNumbers(ctx) {
  const text = JSON.stringify(ctx);
  return new Set((text.match(/\d+/g) || []).map((n) => String(Number(n))));
}

/** Null when the copy is safe to send, else the reason it is not. */
function validateCue(out, ctx) {
  if (!out || typeof out.title !== 'string' || typeof out.body !== 'string') return 'shape';
  const title = out.title.trim();
  const body = out.body.trim();
  if (!title || !body) return 'empty';
  if (title.length > MAX_TITLE || body.length > MAX_BODY) return 'length';
  const both = `${title} ${body}`;
  if (!both.toLowerCase().includes(String(ctx.routine).toLowerCase())) return 'routine-not-named';
  if (BANNED.test(both)) return 'tone';
  if (LINK.test(both)) return 'link';
  if ((both.match(EMOJI) || []).length > MAX_EMOJI) return 'emoji';
  const allowed = allowedNumbers(ctx);
  const invented = (both.match(/\d+/g) || []).find((n) => !allowed.has(String(Number(n))));
  if (invented) return `invented-number:${invented}`;
  const weekCounts = [ctx.doneThisWeek, ctx.doneThisWeekIfDoneToday];
  const notThisWeek = [...both.matchAll(THIS_WEEK_COUNT)]
    .map(([, n]) => (n.toLowerCase() in COUNT_WORDS ? COUNT_WORDS[n.toLowerCase()] : Number(n)))
    .find((n) => !weekCounts.includes(n));
  if (notThisWeek !== undefined) return `not-this-week:${notThisWeek}`;
  // The first step is the cue: copy that skips it is a generic reminder.
  // Checked last, so a safety failure is always the reason reported.
  if (ctx.firstStep && !namesStep(both, ctx.firstStep)) return 'step-not-named';
  return null;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Structured output is what holds a model to the JSON contract; most free
// models reason first and, unconstrained, never reach the closing brace.
const modelRank = (model) => {
  const params = model.supported_parameters || [];
  return (params.includes('structured_outputs') ? 2 : 0) + (params.includes('response_format') ? 1 : 0);
};

let freeRoster = null; // one discovery per process; the job runs once a minute

/**
 * The free models to try, best first: OPENROUTER_FREE_MODELS when set (only
 * `:free` ids, so a paid id there cannot start charging), else OpenRouter's
 * current free catalogue, else a static guess. Same approach as the server's
 * chatApi.js; the cron package does not depend on the server.
 */
function resolveFreeModels(fetchImpl = fetch) {
  const configured = list(process.env.OPENROUTER_FREE_MODELS).filter((m) => m.endsWith(':free'));
  if (configured.length) return Promise.resolve(configured);
  if (!freeRoster) {
    freeRoster = (async () => {
      try {
        const response = await fetchImpl(OPENROUTER_MODELS_URL);
        if (!response.ok) throw new Error(`model list ${response.status}`);
        const ids = ((await response.json()).data || [])
          .filter((m) => m && typeof m.id === 'string' && m.id.endsWith(':free'))
          .sort((a, b) => modelRank(b) - modelRank(a))
          .map((m) => m.id);
        if (!ids.length) throw new Error('no free models listed');
        return ids;
      } catch (error) {
        console.warn(`free model discovery failed (${error.message}); using the fallback list`);
        return FALLBACK_FREE_MODELS;
      }
    })();
  }
  return freeRoster;
}

/** Forget the discovered roster (tests). */
const clearFreeModels = () => { freeRoster = null; };

/**
 * One OpenRouter chat completion with a hard timeout. Same transport as the
 * server's chatApi.js. `models` is OpenRouter's fallback list: if the first
 * model errors or declines, the next one answers.
 */
async function openRouterChat(body, { apiKey, timeoutMs = PAID_TIMEOUT_MS }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.WEB_APP_URL || 'https://routinenotes.app',
        'X-Title': 'Routine Notes Cues',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = new Error(`OpenRouter ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return await response.json(); // inside the try: the timeout covers the body too
  } finally {
    clearTimeout(timer);
  }
}

/** A model reply's JSON, tolerating a code fence or prose around it. */
function parseReply(content) {
  const text = String(content || '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first === -1 || last <= first) throw new Error('json');
    return JSON.parse(text.slice(first, last + 1));
  }
}

/** What a guardrail failure asks the model to fix, in its own words. */
function fixFor(problem, out, ctx) {
  const title = String((out && out.title) || '');
  const body = String((out && out.body) || '');
  if (problem === 'length') {
    return `The title must be at most ${MAX_TITLE} characters and the body at most ${MAX_BODY}; `
      + `yours are ${title.length} and ${body.length}. Shorten them.`;
  }
  if (problem === 'routine-not-named') return `Name the routine exactly as "${ctx.routine}".`;
  if (problem === 'step-not-named') {
    const words = stepWords(ctx.firstStep);
    return `Lead with the first step, "${ctx.firstStep}": it is the ask, so name it in its own words`
      + `${words.length ? ` (at least "${words[0]}")` : ''}.`;
  }
  if (problem.startsWith('invented-number:')) {
    return `${problem.split(':')[1]} is not in the facts. Use only numbers that appear in the facts.`;
  }
  if (problem.startsWith('not-this-week:')) {
    return `${problem.split(':')[1]} is not a count for this week. This week (Sunday to today) is `
      + `doneThisWeek (${ctx.doneThisWeek}); doneInLast7Days is the last 7 days, not this week.`;
  }
  if (problem === 'tone') return 'Remove the guilt or shame word; keep it warm.';
  if (problem === 'emoji') return `Use at most ${MAX_EMOJI} emoji in total.`;
  if (problem === 'link') return 'Remove the link.';
  return 'Answer with a JSON object with a title and a body.';
}

/**
 * One model (or OpenRouter fallback chain): a validated cue, or the reason it
 * failed. A reply that only breaks a guardrail (too long, routine not named,
 * an invented number…) gets one repair turn telling the model what to fix,
 * time allowing; the repaired copy is validated like the first. Never throws.
 */
async function askFor(ctx, models, {
  apiKey, chat, timeoutMs, deadline, now,
}) {
  const messages = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: `Facts:\n${JSON.stringify(ctx, null, 2)}` },
  ];
  let reason = 'empty';
  for (let turn = 0; turn < 2; turn += 1) {
    const left = deadline - now();
    if (turn > 0 && left < 2000) break;
    let data;
    try {
      // eslint-disable-next-line no-await-in-loop
      data = await chat({
        models,
        messages,
        max_tokens: 2000,
        // Most models here think first; keep it short and out of the answer.
        reasoning: { effort: 'low', exclude: true },
        response_format: { type: 'json_schema', json_schema: { name: 'cue', strict: true, schema: SCHEMA } },
      }, { apiKey, timeoutMs: Math.min(timeoutMs, Math.max(left, 1000)) });
    } catch (error) {
      return { reason: `error:${error.status || error.name || 'unknown'}` };
    }
    const choice = data && data.choices && data.choices[0];
    if (!choice) return { reason: 'empty' };
    if (choice.finish_reason === 'content_filter' || choice.native_finish_reason === 'refusal') {
      return { reason: 'refusal' };
    }
    if (choice.finish_reason === 'length') return { reason: 'max-tokens' };
    const content = String((choice.message && choice.message.content) || '');
    let out;
    try {
      out = parseReply(content);
    } catch {
      return { reason: 'json' };
    }
    reason = validateCue(out, ctx);
    if (!reason) return { cue: { title: out.title.trim(), body: out.body.trim() }, model: data.model };
    messages.push({ role: 'assistant', content }, { role: 'user', content: fixFor(reason, out, ctx) });
  }
  return { reason };
}

/**
 * The cue for this context, validated, or null (caller uses the template).
 * Free models first, one at a time so a 429 or a bad answer moves straight
 * on (a gone model is skipped without using up an attempt); then the paid
 * Qwen chain. `reason` is the last failure; `tier` says
 * which tier wrote the cue. Never throws. `chat`, `freeModels` and `now` are
 * injectable for tests.
 */
async function generateAiCue(ctx, {
  apiKey = process.env.OPENROUTER_API_KEY,
  chat = openRouterChat,
  freeModels = resolveFreeModels,
  now = Date.now,
} = {}) {
  if (!apiKey) return { cue: null, reason: 'no-key' };
  let reason = 'no-models';

  const free = (await freeModels()).slice(0, FREE_TRIES);
  const deadline = now() + FREE_BUDGET_MS;
  let answered = 0;
  for (let i = 0; i < free.length && answered < FREE_ATTEMPTS; i += 1) {
    if (deadline - now() < 2000) break;
    // eslint-disable-next-line no-await-in-loop
    const result = await askFor(ctx, [free[i]], {
      apiKey, chat, timeoutMs: FREE_TIMEOUT_MS, deadline, now,
    });
    if (result.cue) return { cue: result.cue, reason: null, model: result.model, tier: 'free' };
    reason = result.reason;
    if (!GONE.has(reason)) answered += 1;
  }

  if (PAID_MODELS.length) {
    const result = await askFor(ctx, PAID_MODELS, {
      apiKey, chat, timeoutMs: PAID_TIMEOUT_MS, deadline: now() + PAID_BUDGET_MS, now,
    });
    if (result.cue) return { cue: result.cue, reason: null, model: result.model, tier: 'paid' };
    reason = result.reason;
  }
  return { cue: null, reason };
}

module.exports = {
  PAID_MODELS,
  FALLBACK_FREE_MODELS,
  resolveFreeModels,
  clearFreeModels,
  SYSTEM,
  SCHEMA,
  buildCueContext,
  stepKeywords,
  validateCue,
  generateAiCue,
};
