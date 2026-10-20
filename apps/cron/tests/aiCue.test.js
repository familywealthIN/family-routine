const {
  buildCueContext, validateCue, generateAiCue, MODELS, SCHEMA,
} = require('../src/cue/aiCue');
const { itemHistory, historyDates } = require('../src/cue/cueEngine');

const TZ = 'Asia/Kolkata';
const TODAY = '20-10-2026'; // a Tuesday
const ITEM = {
  _id: 'run', name: 'Morning Run', time: '07:00', points: 10, steps: [{ name: 'Put on shoes' }], email: 'x@y.z',
};
const days = historyDates(TODAY, 7).slice(1).map((date, i) => ({
  date,
  tasklist: [{
    _id: 'run', ticked: i !== 2, tickedAt: new Date(`${date.split('-').reverse().join('-')}T07:20:00+05:30`),
  }],
}));
const history = itemHistory({
  itemId: 'run', routines: days, today: TODAY, timezone: TZ,
});
const ctx = buildCueContext({
  item: ITEM, history, kind: 'reward', identity: 'a morning mover', insight: 'Your best runs start before 7:30.', nextTarget: 3,
});

const reply = (text, finish = 'stop') => jest.fn(() => Promise.resolve({
  model: 'anthropic/claude-opus-5.5',
  choices: [{ finish_reason: finish, message: { content: text } }],
}));
const good = JSON.stringify({ title: 'Morning Run: 6 of 7 is one tap away', body: 'Put on shoes — +10 pts and day 3 of your run. A vote for a morning mover.' });

describe('7-day context', () => {
  it('carries the week as weekdays with tick times, and nothing personal', () => {
    expect(ctx.last7Days).toHaveLength(7);
    expect(ctx.last7Days[0]).toBe('Monday: done at 07:20');
    expect(ctx.last7Days[2]).toBe('Saturday: missed');
    expect(ctx.doneInLast7Days).toBe(6);
    expect(ctx.doneThisWeekIfDoneToday).toBe(7);
    expect(ctx.currentRun).toBe(2);
    expect(ctx.twoMinuteStart).toBe('Put on shoes');
    expect(JSON.stringify(ctx)).not.toMatch('x@y.z');
    expect(JSON.stringify(ctx)).not.toMatch(/\d{2}-\d{2}-\d{4}/);
  });
});

describe('validateCue guardrails', () => {
  const ok = { title: 'Morning Run is calling', body: 'Put on shoes: +10 pts, day 3 of your run.' };
  it('accepts copy built only from the facts', () => {
    expect(validateCue(ok, ctx)).toBeNull();
  });
  it.each([
    [{ title: 'x'.repeat(61), body: 'Morning Run' }, 'length'],
    [{ title: 'Go time', body: 'Put on shoes.' }, 'routine-not-named'],
    [{ title: 'Morning Run', body: 'Day 40 of your run!' }, 'invented-number:40'],
    [{ title: 'Morning Run', body: 'Don\'t be lazy today.' }, 'tone'],
    [{ title: 'Morning Run 🔥🔥🔥', body: 'Go' }, 'emoji'],
    [{ title: 'Morning Run', body: 'See https://x.y' }, 'link'],
    [{ title: 'Morning Run' }, 'shape'],
  ])('rejects %j (%s)', (out, reason) => {
    expect(validateCue(out, ctx)).toBe(reason);
  });
});

describe('generateAiCue', () => {
  const run = (chat, apiKey = 'sk-or-test') => generateAiCue(ctx, { apiKey, chat });

  it('asks Claude Opus 5.5 on OpenRouter for schema-bound JSON at low reasoning effort, with a fallback model', async () => {
    const chat = reply(good);
    const { cue } = await run(chat);
    expect(cue.title).toBe('Morning Run: 6 of 7 is one tap away');
    const [body, opts] = chat.mock.calls[0];
    expect(MODELS).toEqual(['anthropic/claude-opus-5.5', 'anthropic/claude-opus-4.8']);
    expect(body).toMatchObject({
      models: MODELS,
      reasoning: { effort: 'low', exclude: true },
      response_format: { type: 'json_schema', json_schema: { name: 'cue', strict: true, schema: SCHEMA } },
    });
    expect(body.messages[1].content).toMatch('"routine": "Morning Run"');
    expect(opts.apiKey).toBe('sk-or-test');
  });

  it.each([
    ['no key', reply(good), 'no-key', ''],
    ['refusal', reply(good, 'content_filter'), 'refusal'],
    ['truncated', reply(good, 'length'), 'max-tokens'],
    ['bad JSON', reply('not json'), 'json'],
    ['invented number', reply(JSON.stringify({ title: 'Morning Run', body: 'Day 99!' })), 'invented-number:99'],
    ['API error', () => Promise.reject(Object.assign(new Error('x'), { status: 429 })), 'error:429'],
  ])('%s → template fallback', async (_, chat, reason, apiKey = 'sk-or-test') => {
    await expect(run(chat, apiKey)).resolves.toEqual({ cue: null, reason });
  });
});
