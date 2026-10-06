// The routine chat runs on OpenRouter's FREE tier only. Two things must hold
// no matter what the roster is configured to: every id billed is a `:free` id,
// and a dead/rate-limited model falls through to the next one instead of
// taking the whole chat turn down with it.

const {
  chatWithRoutine, completeChat, freeModels, resolveFreeModels, clearModelCache,
  modelRank, usableProse, FALLBACK_FREE_MODELS,
} = require('./chatApi');

// Discovery is cached per process, so every suite starts from a cold catalogue.
beforeEach(() => clearModelCache());

const okResponse = (content, extra = {}) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content } }] }),
  ...extra,
});

const errResponse = (status) => ({
  ok: false,
  status,
  text: async () => `rate limited (${status})`,
});

const CONTEXT = {
  routineName: 'Start Work',
  routineTime: '09:00',
  routineEnd: '12:30',
  routineStatus: 'In progress',
  stimulus: 'G',
  points: 12,
  doneCount: 1,
  totalCount: 3,
  items: [
    { id: 'gi1', body: 'Ship dashboard PR', isComplete: false },
    { id: 'gi2', body: 'Reply to Ana', isComplete: true },
  ],
  scores: { D: 64, K: 100, G: 56 },
};

const modelList = (ids) => ({
  ok: true,
  status: 200,
  json: async () => ({
    data: ids.map((id, i) => ({
      id,
      context_length: 1000 - i,
      supported_parameters: [],
    })),
  }),
});

describe('free model roster', () => {
  const saved = process.env.OPENROUTER_FREE_MODELS;
  let consoleWarn;

  beforeEach(() => {
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = undefined;
    consoleWarn.mockRestore();
    if (saved === undefined) delete process.env.OPENROUTER_FREE_MODELS;
    else process.env.OPENROUTER_FREE_MODELS = saved;
  });

  it('falls back to the built-in roster, all of it free', () => {
    delete process.env.OPENROUTER_FREE_MODELS;
    expect(freeModels()).toEqual(FALLBACK_FREE_MODELS);
    expect(freeModels().every((m) => m.endsWith(':free'))).toBe(true);
  });

  it('drops a paid id someone put in the env override', () => {
    process.env.OPENROUTER_FREE_MODELS = 'google/gemini-2.5-flash, qwen/qwen3-14b:free';
    expect(freeModels()).toEqual(['qwen/qwen3-14b:free']);
  });

  // The free catalogue churns; ids are retired without notice, and a stale
  // hardcoded roster becomes a wall of 404s. Discovery is what prevents that.
  it('discovers the live free catalogue, widest context first', async () => {
    delete process.env.OPENROUTER_FREE_MODELS;
    global.fetch = jest.fn().mockResolvedValue(modelList([
      'a/one:free', 'b/two:free', 'c/paid',
    ]));
    await expect(resolveFreeModels()).resolves.toEqual(['a/one:free', 'b/two:free']);
  });

  it('prefers an explicit override over discovery, and never calls out', async () => {
    process.env.OPENROUTER_FREE_MODELS = 'pinned/model:free';
    global.fetch = jest.fn();
    await expect(resolveFreeModels()).resolves.toEqual(['pinned/model:free']);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // A chat turn is a short routine snapshot, not a long document, so a model
  // that can be held to the JSON contract beats one with a huge window.
  it('ranks structured-output support above context length', async () => {
    delete process.env.OPENROUTER_FREE_MODELS;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { id: 'huge/window:free', context_length: 1000000, supported_parameters: [] },
          { id: 'structured/small:free', context_length: 8000, supported_parameters: ['structured_outputs', 'response_format'] },
        ],
      }),
    });
    await expect(resolveFreeModels())
      .resolves.toEqual(['structured/small:free', 'huge/window:free']);
  });

  it('scores structured output above response_format above reasoning', () => {
    expect(modelRank({ supported_parameters: ['structured_outputs'] }))
      .toBeGreaterThan(modelRank({ supported_parameters: ['response_format'] }));
    expect(modelRank({ supported_parameters: ['response_format'] }))
      .toBeGreaterThan(modelRank({ supported_parameters: ['reasoning'] }));
    expect(modelRank({})).toBe(0);
  });

  it('falls back when discovery cannot be reached', async () => {
    delete process.env.OPENROUTER_FREE_MODELS;
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(resolveFreeModels()).resolves.toEqual(FALLBACK_FREE_MODELS);
  });
});

describe('completeChat failover', () => {
  const savedKey = process.env.OPENROUTER_API_KEY;
  const savedRoster = process.env.OPENROUTER_FREE_MODELS;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_FREE_MODELS = 'a/one:free,b/two:free';
  });

  afterEach(() => {
    global.fetch = undefined;
    if (savedKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = savedKey;
    if (savedRoster === undefined) delete process.env.OPENROUTER_FREE_MODELS;
    else process.env.OPENROUTER_FREE_MODELS = savedRoster;
  });

  it('walks to the next model when the first is rate limited', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(errResponse(429))
      .mockResolvedValueOnce(okResponse('second model answered'));

    const result = await completeChat([{ role: 'user', content: 'hi' }]);

    expect(result).toEqual({ content: 'second model answered', model: 'b/two:free' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).model).toBe('a/one:free');
  });

  it('throws only once every model has failed', async () => {
    global.fetch = jest.fn().mockResolvedValue(errResponse(503));
    await expect(completeChat([{ role: 'user', content: 'hi' }]))
      .rejects.toThrow(/All free OpenRouter models failed/);
  });

  it('refuses to run without an API key', async () => {
    delete process.env.OPENROUTER_API_KEY;
    await expect(completeChat([{ role: 'user', content: 'hi' }]))
      .rejects.toThrow(/OPENROUTER_API_KEY/);
  });
});

describe('chatWithRoutine', () => {
  const savedKey = process.env.OPENROUTER_API_KEY;
  let consoleError;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = undefined;
    consoleError.mockRestore();
    if (savedKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = savedKey;
  });

  it('passes through an add_tasks intent with its tasks', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(JSON.stringify({
      reply: "Added to Start Work's checklist.",
      intent: 'add_tasks',
      tasks: ['Review analytics events'],
      completeItemId: null,
    })));

    const result = await chatWithRoutine({ text: 'add review analytics events', context: CONTEXT });

    expect(result.intent).toBe('add_tasks');
    expect(result.tasks).toEqual(['Review analytics events']);
    expect(result.error).toBeNull();
  });

  it('keeps break_down proposals but never claims they were added', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(JSON.stringify({
      reply: 'Here is “Ship dashboard PR” in three steps:',
      intent: 'break_down',
      tasks: ['Write the PR description', 'Request review', 'Get CI green'],
    })));

    const result = await chatWithRoutine({ text: 'break it down', context: CONTEXT });

    expect(result.intent).toBe('break_down');
    expect(result.tasks).toHaveLength(3);
  });

  // A model that names an item which isn't open on this routine would have the
  // client report "marked done" having completed nothing.
  it('drops a completeItemId that is not an open item on this routine', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(JSON.stringify({
      reply: 'Marked it done.',
      intent: 'complete_task',
      completeItemId: 'gi2',
    })));

    const result = await chatWithRoutine({ text: 'done with ana', context: CONTEXT });

    expect(result.completeItemId).toBeNull();
    expect(result.intent).toBe('chat');
  });

  it('accepts a completeItemId that is open', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(JSON.stringify({
      reply: 'Marked “Ship dashboard PR” done. 0 left.',
      intent: 'complete_task',
      completeItemId: 'gi1',
    })));

    const result = await chatWithRoutine({ text: 'done with the PR', context: CONTEXT });

    expect(result.completeItemId).toBe('gi1');
    expect(result.intent).toBe('complete_task');
  });

  // D-04: the chat can only add, break down and tick off. There is no
  // reschedule or skip intent, so a reply claiming a move left the user with a
  // confirmation and an unchanged checklist.
  describe('never claims a move or skip it cannot perform', () => {
    const replyFor = async (reply) => {
      global.fetch = jest.fn().mockResolvedValue(okResponse(JSON.stringify({
        reply, intent: 'chat', tasks: [], completeItemId: null,
      })));
      const result = await chatWithRoutine({ text: 'move the PR to tomorrow', context: CONTEXT });
      return result.reply;
    };

    it.each([
      "I've moved that to tomorrow.",
      'I have rescheduled it for Monday.',
      "I've skipped that one for today.",
      'Moved it to tomorrow for you.',
      "I've pushed the PR to Friday.",
      'I deleted that item.',
    ])('replaces the false claim: %s', async (claim) => {
      await expect(replyFor(claim)).resolves
        .toBe("I can't move or skip items from here. Tap the item in the "
          + 'checklist to open it, then use its date chips to change the day.');
    });

    // The guard is narrow on purpose: advice and questions are true and useful,
    // and rewriting them would make the chat worse, not safer.
    it.each([
      'You could skip it today and pick it up tomorrow.',
      'Try moving this one to tomorrow from its goal sheet.',
      'Do you want to move it, or drop it entirely?',
      'Two of three done — finish the PR.',
    ])('leaves advice and questions alone: %s', async (prose) => {
      await expect(replyFor(prose)).resolves.toBe(prose);
    });
  });

  // An intent that DOES act keeps its own words - the guard only fires when
  // nothing is going to happen.
  it('leaves a real complete_task confirmation untouched', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(JSON.stringify({
      reply: "I've removed “Ship dashboard PR” from the open list — nice.",
      intent: 'complete_task',
      completeItemId: 'gi1',
    })));

    const result = await chatWithRoutine({ text: 'done with the PR', context: CONTEXT });

    expect(result.intent).toBe('complete_task');
    expect(result.reply).toMatch(/I've removed/);
  });

  it('keeps the prose when a free model ignores JSON mode', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse('Two of three done — finish the PR.'));

    const result = await chatWithRoutine({ text: 'how am I doing?', context: CONTEXT });

    expect(result.reply).toBe('Two of three done — finish the PR.');
    expect(result.intent).toBe('chat');
  });

  // Free models are overwhelmingly reasoning models; one that answers with its
  // own chain of thought must not have it pasted into a chat bubble.
  it('never shows leaked chain-of-thought as the reply', async () => {
    const NL = String.fromCharCode(10);
    const chainOfThought = [
      "Here's a thinking process:",
      '1. **Analyze User Input:** the user says done',
      '2. set completeItemId to the matching item',
    ].join(NL);
    global.fetch = jest.fn().mockResolvedValue(okResponse(chainOfThought));

    const result = await chatWithRoutine({ text: 'done with the journal', context: CONTEXT });

    expect(result.reply).not.toMatch(/thinking process/i);
    expect(result.reply).toMatch(/didn't get that one cleanly/);
    expect(result.intent).toBe('chat');
  });

  it('rejects a truncated monologue as a reply', () => {
    expect(usableProse('x'.repeat(900))).toBe('');
    expect(usableProse('Nice — two down, one to go.')).toBe('Nice — two down, one to go.');
  });

  // The dashboard must keep working when the free tier is exhausted.
  it('degrades to a plain reply when every model fails', async () => {
    global.fetch = jest.fn().mockResolvedValue(errResponse(429));

    const result = await chatWithRoutine({ text: 'hello', context: CONTEXT });

    expect(result.intent).toBe('chat');
    expect(result.tasks).toEqual([]);
    expect(result.error).toMatch(/All free OpenRouter models failed/);
    expect(result.reply).toMatch(/can't reach the chat model/);
  });
});
