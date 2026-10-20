/**
 * AI-written cues: Claude writes the reminder from the person's last 7 days,
 * aiming for the craving step of the habit loop — dopamine rises on a cue that
 * reliably predicts a reward the person cares about. So the copy makes the
 * reward at stake vivid and near (points, the next day of the run, a
 * milestone within reach), ties it to their own week ("4 of the last 7"),
 * keeps the ask to two minutes, and frames it as an identity vote.
 *
 * Guardrails, because this lands on someone's lock screen:
 * - Claude only sees the facts below — no email, no other people's data.
 * - The output must validate (validateCue): length limits, the routine is
 *   named, no number that is not in the facts (no invented streaks or
 *   points), no guilt or shame words, at most two emoji, no links.
 * - Any failure — no OPENROUTER_API_KEY, timeout, refusal, bad JSON, failed validation —
 *   returns null and the caller sends the template cue instead.
 */

// OpenRouter slugs. The second answers when the first errors or declines.
const MODELS = (process.env.CUE_AI_MODELS || 'anthropic/claude-opus-5.5,anthropic/claude-opus-4.8')
  .split(',').map((m) => m.trim()).filter(Boolean);
const TIMEOUT_MS = 12000; // whole request, body included; cold calls run ~9 s
const MAX_TITLE = 60;
const MAX_BODY = 140;
const MAX_EMOJI = 2;
const BANNED = /\b(fail(ed|ure)?|lazy|shame|ashamed|guilt|guilty|disappoint\w*|pathetic|loser|weak|should have)\b/i;
const LINK = /(https?:\/\/|www\.)/i;
// Emoji and pictographs: technical symbols (⏰), misc symbols, dingbats, U+1F000+.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}]/gu;

const SYSTEM = `You write one push notification that cues a person to start a habit right now.

Goal: a strong pull to act in the next few minutes. Dopamine rises when a cue
predicts a reward the person wants, so make the reward they are about to earn
vivid, specific and close — the points, the next day of their run, a milestone
within reach — and anchor it in their own last 7 days. A touch of curiosity or
a near-win ("one more makes 5 this week") works better than a generic
reminder. Ask only for the two-minute first step. Frame it as a vote for who
they are becoming.

Rules:
- Use only the facts given. Never invent numbers, days, times or names.
- Name the routine exactly as given.
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
 * The facts Claude may use: one routine, the last 7 days, nothing personal
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
    doneThisWeekIfDoneToday: done + 1,
    last7Days: week.map((d) => `${d.date}: ${STATE_LABEL[d.state] || d.state}${d.at ? ` at ${d.at}` : ''}`),
    situation: {
      recovery: 'missed yesterday after doing it before — the comeback day',
      restart: 'missed two or more days — a fresh, small start',
      atRisk: 'an automatic habit running late against their usual time',
      stack: `just finished "${anchor}" — this routine follows it`,
    }[kind] || 'routine time',
    twoMinuteStart: steps[0] || 'just two minutes of it',
    identity: identity || null,
    latestInsight: insight ? insight.slice(0, 300) : null,
  };
}

/** Every number Claude is allowed to write. */
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
  return null;
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * One OpenRouter chat completion with a hard timeout. Same transport as the
 * server's chatApi.js. `models` is OpenRouter's fallback list: if the first
 * model errors or declines, the next one answers.
 */
async function openRouterChat(body, { apiKey, timeoutMs = TIMEOUT_MS }) {
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

/**
 * Claude's cue for this context, validated, or null (caller uses the
 * template). Never throws. `chat` is injectable for tests.
 */
async function generateAiCue(ctx, {
  apiKey = process.env.OPENROUTER_API_KEY, chat = openRouterChat,
} = {}) {
  if (!apiKey) return { cue: null, reason: 'no-key' };
  try {
    const data = await chat({
      models: MODELS,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Facts:\n${JSON.stringify(ctx, null, 2)}` },
      ],
      max_tokens: 2000,
      // Thinking cannot be turned off on Opus 5.5; keep it short and out of the answer.
      reasoning: { effort: 'low', exclude: true },
      response_format: { type: 'json_schema', json_schema: { name: 'cue', strict: true, schema: SCHEMA } },
    }, { apiKey });
    const choice = data && data.choices && data.choices[0];
    if (!choice) return { cue: null, reason: 'empty' };
    if (choice.finish_reason === 'content_filter' || choice.native_finish_reason === 'refusal') {
      return { cue: null, reason: 'refusal' };
    }
    if (choice.finish_reason === 'length') return { cue: null, reason: 'max-tokens' };
    let out;
    try {
      out = JSON.parse(String((choice.message && choice.message.content) || ''));
    } catch {
      return { cue: null, reason: 'json' };
    }
    const problem = validateCue(out, ctx);
    if (problem) return { cue: null, reason: problem };
    return { cue: { title: out.title.trim(), body: out.body.trim() }, reason: null, model: data.model };
  } catch (error) {
    return { cue: null, reason: `error:${error.status || error.name || 'unknown'}` };
  }
}

module.exports = {
  MODELS,
  SYSTEM,
  SCHEMA,
  buildCueContext,
  validateCue,
  generateAiCue,
};
