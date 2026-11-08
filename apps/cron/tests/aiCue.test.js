const {
  buildCueContext, validateCue, generateAiCue, resolveFreeModels, clearFreeModels, stepKeywords,
  PAID_MODELS, FALLBACK_FREE_MODELS, SCHEMA, SYSTEM,
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

const answer = (text, finish = 'stop', model = 'qwen/qwen3.8-27b:free') => ({
  model,
  choices: [{ finish_reason: finish, message: { content: text } }],
});
const reply = (text, finish = 'stop') => jest.fn(() => Promise.resolve(answer(text, finish)));
const FREE = ['a/one:free', 'b/two:free', 'c/three:free', 'd/four:free'];
const good = JSON.stringify({ title: 'Morning Run: 6 of 7 is one tap away', body: 'Put on shoes — +10 pts and day 3 of your run. A vote for a morning mover.' });

describe('7-day context', () => {
  it('carries the week as weekdays with tick times, and nothing personal', () => {
    expect(ctx.last7Days).toHaveLength(7);
    expect(ctx.last7Days[0]).toBe('Monday: done at 07:20');
    expect(ctx.last7Days[2]).toBe('Saturday: missed');
    expect(ctx.doneInLast7Days).toBe(6);
    expect(ctx.doneThisWeek).toBe(2); // Sunday and Monday; a Tuesday's week has two days behind it
    expect(ctx.doneThisWeekIfDoneToday).toBe(3);
    expect(ctx.currentRun).toBe(2);
    expect(ctx.twoMinuteStart).toBe('Put on shoes');
    expect(ctx.firstStep).toBe('Put on shoes');
    expect(ctx.nextStep).toBeNull();
    expect(ctx.stepCount).toBe(1);
    expect(JSON.stringify(ctx)).not.toMatch('x@y.z');
    expect(JSON.stringify(ctx)).not.toMatch(/\d{2}-\d{2}-\d{4}/);
  });
});

describe('this week is the calendar week, not the last 7 days', () => {
  // Done Thursday to Saturday (29-31 Oct), then a Sunday-start week with none.
  const ticks = (today, done) => historyDates(today, 7).map((date) => ({
    date, tasklist: [{ _id: 'run', ticked: done.includes(date) }],
  }));
  const weekCtx = (today, done) => buildCueContext({
    item: ITEM,
    history: itemHistory({
      itemId: 'run', routines: ticks(today, done), today, timezone: TZ,
    }),
    kind: 'reward',
    nextTarget: 3,
  });

  it('counts Sunday to today, so last week\'s ticks are not this week\'s', () => {
    const thu = weekCtx('05-11-2026', ['29-10-2026', '30-10-2026', '31-10-2026']);
    expect(thu.doneInLast7Days).toBe(3);
    expect(thu.doneThisWeek).toBe(0);
    expect(thu.doneThisWeekIfDoneToday).toBe(1);
  });

  it('starts every Sunday at zero however long the run', () => {
    const sun = weekCtx('01-11-2026', historyDates('01-11-2026', 7).slice(1));
    expect(sun.doneInLast7Days).toBe(7);
    expect(sun.doneThisWeek).toBe(0);
    expect(sun.doneThisWeekIfDoneToday).toBe(1);
  });

  it('counts today once it is done, and does not add it again', () => {
    const today = '04-11-2026';
    const done = ticks(today, ['02-11-2026', today]);
    const c = buildCueContext({
      item: ITEM,
      history: itemHistory({
        itemId: 'run', routines: done, today, timezone: TZ,
      }),
      kind: 'reward',
      nextTarget: 3,
    });
    expect(c.doneThisWeek).toBe(2);
    expect(c.doneThisWeekIfDoneToday).toBe(2);
  });

  it('rejects a "this week" count that is not this week\'s', () => {
    const thu = weekCtx('05-11-2026', ['29-10-2026', '30-10-2026', '31-10-2026']);
    const sun = weekCtx('01-11-2026', historyDates('01-11-2026', 7).slice(1));
    expect(validateCue({ title: 'Morning Run', body: 'You\'ve done Morning Run 3 times this week — keep it going.' }, thu))
      .toBe('not-this-week:3');
    expect(validateCue({ title: 'Morning Run', body: '7 strong — one more and you\'re at 8 this week.' }, sun))
      .toBe('not-this-week:8');
    expect(validateCue({ title: 'Morning Run', body: '7 strong — one more and you\'re at 7 this week.' }, sun))
      .toBe('not-this-week:7');
    expect(validateCue({ title: 'Morning Run', body: 'Seven of the last 7 — shoes on, make it your first this week.' }, sun)).toBeNull();
    expect(validateCue({ title: 'Morning Run', body: '3 of the last 7. Shoes on: one more makes 1 this week.' }, thu)).toBeNull();
  });
});

describe('the first step is the cue', () => {
  const stepCtx = (steps) => buildCueContext({
    item: { ...ITEM, steps }, history, kind: 'reward', nextTarget: 3,
  });

  it('passes the first step, the next one and the count', () => {
    const c = stepCtx([{ name: 'Lay out running shoes' }, { name: 'Warm up' }, { name: '' }]);
    expect(c).toMatchObject({ firstStep: 'Lay out running shoes', nextStep: 'Warm up', stepCount: 2 });
  });

  it('without steps, behaves as before: no step, the two-minute ask', () => {
    const c = stepCtx([]);
    expect(c).toMatchObject({ firstStep: null, nextStep: null, stepCount: 0, twoMinuteStart: 'just two minutes of it' });
    expect(validateCue({ title: 'Morning Run is up', body: '+10 pts and day 3 of your run.' }, c)).toBeNull();
  });

  it('tells the model the first step is THE ask, with curiosity, and the reward as the payoff', () => {
    expect(SYSTEM).toMatch('When firstStep is given, it is THE ask');
    expect(SYSTEM).toMatch('shoes by the door');
    expect(SYSTEM).toMatch(/curiosity or anticipation/);
    expect(SYSTEM).toMatch('When firstStep is given, the copy must name that step or its key words.');
    expect(SYSTEM).toMatch(/vote for who they are becoming/);
  });

  it('keys a step on its content words, not filler', () => {
    expect(stepKeywords('Put on shoes')).toEqual(['shoe']);
    expect(stepKeywords('Write in journal')).toEqual(['writ', 'journal']);
    expect(stepKeywords('Get up')).toEqual(['get', 'up']);
  });

  it('rejects copy that skips the first step, and accepts its key words in any form', () => {
    expect(validateCue({ title: 'Morning Run is up', body: '+10 pts and day 3 of your run.' }, ctx))
      .toBe('step-not-named');
    expect(validateCue({ title: 'Morning Run', body: 'Shoes by the door? Lace them up, +10 pts.' }, ctx)).toBeNull();
    const journal = stepCtx([{ name: 'Write in journal' }]);
    expect(validateCue({ title: 'Morning Run', body: 'Open the journal: three lines and the day settles.' }, journal)).toBeNull();
    expect(validateCue({ title: 'Morning Run', body: 'Start writing, +10 pts.' }, journal)).toBeNull();
    expect(validateCue({ title: 'Morning Run', body: 'Time to unwind, +10 pts.' }, journal)).toBe('step-not-named');
  });

  it('a safety guardrail is reported before a missing step', () => {
    expect(validateCue({ title: 'Morning Run', body: 'Day 40 of your run!' }, ctx)).toBe('invented-number:40');
  });

  it('repairs a cue that skips the step in one turn on the same model', async () => {
    const generic = JSON.stringify({ title: 'Morning Run is calling', body: '+10 pts and day 3 of your run.' });
    const chat = jest.fn()
      .mockResolvedValueOnce(answer(generic))
      .mockResolvedValueOnce(answer(good));
    const result = await generateAiCue(ctx, { apiKey: 'k', chat, freeModels: () => Promise.resolve(FREE) });
    expect(result).toMatchObject({ tier: 'free', cue: { body: expect.stringMatching('Put on shoes') } });
    const repair = chat.mock.calls[1][0].messages;
    expect(repair[3].content).toBe('Lead with the first step, "Put on shoes": it is the ask, so name it in its own words (at least "shoes").');
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
  const run = (chat, apiKey = 'sk-or-test', extra = {}) => generateAiCue(ctx, {
    apiKey, chat, freeModels: () => Promise.resolve(FREE), ...extra,
  });
  const modelsAsked = (chat) => chat.mock.calls.map(([body]) => body.models);

  it('asks a free model first, one model per request, for schema-bound JSON at low reasoning effort', async () => {
    const chat = reply(good);
    const result = await run(chat);
    expect(result).toMatchObject({ cue: { title: 'Morning Run: 6 of 7 is one tap away' }, reason: null, tier: 'free' });
    expect(modelsAsked(chat)).toEqual([['a/one:free']]);
    const [body, opts] = chat.mock.calls[0];
    expect(body).toMatchObject({
      reasoning: { effort: 'low', exclude: true },
      response_format: { type: 'json_schema', json_schema: { name: 'cue', strict: true, schema: SCHEMA } },
    });
    expect(body.messages[1].content).toMatch('"routine": "Morning Run"');
    expect(opts.apiKey).toBe('sk-or-test');
  });

  it('moves to the next free model when one is rate-limited or answers badly', async () => {
    const chat = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('x'), { status: 429 }))
      .mockResolvedValueOnce(answer('not json'))
      .mockResolvedValueOnce(answer(good, 'stop', 'c/three:free'));
    const result = await run(chat);
    expect(result).toMatchObject({ tier: 'free', model: 'c/three:free' });
    expect(modelsAsked(chat)).toEqual([['a/one:free'], ['b/two:free'], ['c/three:free']]);
  });

  it('gives a reply that breaks a guardrail one repair turn on the same model', async () => {
    const long = JSON.stringify({ title: 'Morning Run', body: `Put on shoes. ${'Go on. '.repeat(30)}` });
    const chat = jest.fn()
      .mockResolvedValueOnce(answer(long))
      .mockResolvedValueOnce(answer(good));
    const result = await run(chat);
    expect(result).toMatchObject({ tier: 'free', cue: { title: 'Morning Run: 6 of 7 is one tap away' } });
    expect(modelsAsked(chat)).toEqual([['a/one:free'], ['a/one:free']]);
    const repair = chat.mock.calls[1][0].messages;
    expect(repair[2]).toEqual({ role: 'assistant', content: long });
    expect(repair[3].content).toMatch(/at most 140; yours are \d+ and \d+\. Shorten them\./);
  });

  it('skips a free model that is gone without using up an attempt', async () => {
    const gone = Object.assign(new Error('x'), { status: 404 });
    const chat = jest.fn()
      .mockRejectedValueOnce(gone)
      .mockRejectedValueOnce(gone)
      .mockRejectedValueOnce(Object.assign(new Error('x'), { status: 429 }))
      .mockResolvedValueOnce(answer(good, 'stop', 'd/four:free'));
    const result = await run(chat);
    expect(result).toMatchObject({ tier: 'free', model: 'd/four:free' });
    expect(modelsAsked(chat)).toEqual([['a/one:free'], ['b/two:free'], ['c/three:free'], ['d/four:free']]);
  });

  it('falls back to the paid Qwen chain only after three free models fail', async () => {
    const chat = jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('x'), { status: 429 }))
      .mockResolvedValueOnce(answer('not json'))
      .mockResolvedValueOnce(answer(good, 'length'))
      .mockResolvedValueOnce(answer(good, 'stop', 'qwen/qwen3-235b-a22b-2507'));
    const result = await run(chat);
    expect(result).toMatchObject({ tier: 'paid', model: 'qwen/qwen3-235b-a22b-2507', reason: null });
    expect(modelsAsked(chat)).toEqual([['a/one:free'], ['b/two:free'], ['c/three:free'], PAID_MODELS]);
  });

  it('pays only for cheap Qwen, never OpenAI or a free id', () => {
    expect(PAID_MODELS).toEqual(['qwen/qwen3-235b-a22b-2507', 'qwen/qwen3.5-flash-02-23']);
    PAID_MODELS.forEach((m) => {
      expect(m).toMatch(/^qwen\//);
      expect(m).not.toMatch(/:free$/);
    });
  });

  it('stops trying free models when the free budget runs out, then pays', async () => {
    let t = 0;
    const chat = jest.fn(async ({ models }) => {
      if (models.length === 1) {
        t += 23000; // a free model that sat on the request
        throw Object.assign(new Error('x'), { name: 'AbortError' });
      }
      return answer(good, 'stop', models[0]);
    });
    const result = await run(chat, 'sk-or-test', { now: () => t });
    expect(result.tier).toBe('paid');
    expect(modelsAsked(chat)).toEqual([['a/one:free'], PAID_MODELS]);
  });

  it.each([
    ['no key', reply(good), 'no-key', ''],
    ['refusal', reply(good, 'content_filter'), 'refusal'],
    ['truncated', reply(good, 'length'), 'max-tokens'],
    ['bad JSON', reply('not json'), 'json'],
    ['invented number', reply(JSON.stringify({ title: 'Morning Run', body: 'Day 99!' })), 'invented-number:99'],
    ['API error', () => Promise.reject(Object.assign(new Error('x'), { status: 429 })), 'error:429'],
  ])('%s on every model → template fallback', async (_, chat, reason, apiKey = 'sk-or-test') => {
    await expect(run(chat, apiKey)).resolves.toEqual({ cue: null, reason });
  });

  it('reads a reply wrapped in a code fence', async () => {
    const fence = '```';
    const result = await run(reply(['Here you go:', `${fence}json`, good, fence].join('\n')));
    expect(result.cue.title).toBe('Morning Run: 6 of 7 is one tap away');
  });
});

describe('resolveFreeModels', () => {
  const saved = process.env.OPENROUTER_FREE_MODELS;
  afterEach(() => {
    clearFreeModels();
    if (saved === undefined) delete process.env.OPENROUTER_FREE_MODELS;
    else process.env.OPENROUTER_FREE_MODELS = saved;
  });

  it('uses the configured roster, dropping any paid id', async () => {
    process.env.OPENROUTER_FREE_MODELS = 'x/one:free, y/paid ,z/two:free';
    await expect(resolveFreeModels()).resolves.toEqual(['x/one:free', 'z/two:free']);
  });

  it('otherwise discovers the free catalogue, structured-output models first', async () => {
    delete process.env.OPENROUTER_FREE_MODELS;
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          { id: 'p/plain:free', supported_parameters: [] },
          { id: 'q/paid', supported_parameters: ['structured_outputs'] },
          { id: 's/strict:free', supported_parameters: ['structured_outputs', 'response_format'] },
        ],
      }),
    }));
    await expect(resolveFreeModels(fetchImpl)).resolves.toEqual(['s/strict:free', 'p/plain:free']);
  });

  it('falls back to a static free list when the catalogue cannot be read', async () => {
    delete process.env.OPENROUTER_FREE_MODELS;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(resolveFreeModels(async () => ({ ok: false, status: 503 }))).resolves.toEqual(FALLBACK_FREE_MODELS);
    warn.mockRestore();
  });
});
