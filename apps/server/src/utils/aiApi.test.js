// D-19: a week plan's day grid started at today + 1, so a seven-day routine
// requested on Sat 15 Aug was templated for Sun 16 - Sat 22 and the setup day
// had nothing to execute. The grid must start on the day the user asks.

const {
  generateMilestonePlan,
  getSummaryFromGoalItems,
  getNextStepsFromGoalItems,
  getNextStepsListFromGoalItems,
  normaliseDescription,
  normaliseNextSteps,
} = require('./aiApi');

// Sat 15 Aug 2026, the day from the beta report.
const SETUP_DAY = new Date(2026, 7, 15, 12, 0, 0);

describe('generateMilestonePlan day grid', () => {
  let consoleError;
  let consoleWarn;
  const savedKeys = {};

  beforeEach(() => {
    // No AI credentials -> fetchFromAi throws and the fallback plan is built
    // straight from the entry template, which is what we're asserting on.
    ['GEMINI_API_KEY', 'OPENROUTER_API_KEY'].forEach((key) => {
      savedKeys[key] = process.env[key];
      delete process.env[key];
    });
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.useFakeTimers().setSystemTime(SETUP_DAY);
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
    Object.keys(savedKeys).forEach((key) => {
      if (savedKeys[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedKeys[key];
      }
    });
  });

  it('starts a week plan on the day it is requested', async () => {
    const plan = await generateMilestonePlan(
      'a seven-day routine that helps me improve focus and exercise consistently',
      null,
      'week',
    );

    expect(plan.entries).toHaveLength(7);
    expect(plan.entries[0]).toMatchObject({ period: 'day', date: '15-08-2026', periodName: 'Saturday' });
    expect(plan.entries[6].date).toBe('21-08-2026');
  });

  it('starts an explicit day count on today', async () => {
    const plan = await generateMilestonePlan('plan the 2 days left to ship', null, 'week');

    expect(plan.entries.map((entry) => entry.date)).toEqual(['15-08-2026', '16-08-2026']);
  });

  it('still anchors a "next week" plan to the upcoming Sunday', async () => {
    const plan = await generateMilestonePlan('build a reading habit next week', null, 'week');

    expect(plan.entries[0].date).toBe('16-08-2026');
    expect(plan.entries[6].date).toBe('22-08-2026');
  });
});

// The chat's "Before you start" card appends a next step to the user's
// checklist verbatim, so the generator's shape is a contract and not a style
// preference. These assert the shape survives a model that ignores the prompt.

const geminiText = (text) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
});

const openRouterText = (content) => ({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content } }] }),
});

const errResponse = (status) => ({
  ok: false,
  status,
  text: async () => `upstream said ${status}`,
});

const ITEMS = [
  { body: 'Ship the dashboard redesign', period: 'week', date: '10-09-2026' },
  { body: 'Run 16 km long run', period: 'week', date: '12-09-2026' },
];

describe('Before-you-start card shape', () => {
  const savedKeys = {};
  let consoleError;
  let consoleWarn;

  beforeEach(() => {
    ['GEMINI_API_KEY', 'OPENROUTER_API_KEY'].forEach((key) => {
      savedKeys[key] = process.env[key];
    });
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    delete process.env.OPENROUTER_API_KEY;
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = undefined;
    consoleError.mockRestore();
    consoleWarn.mockRestore();
    Object.keys(savedKeys).forEach((key) => {
      if (savedKeys[key] === undefined) delete process.env[key];
      else process.env[key] = savedKeys[key];
    });
  });

  // The card has room for one line, and "a concise paragraph" is what the old
  // prompt asked for — so a paragraph is what the model returns.
  it('reduces a paragraph to a single sentence', async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiText(
      'These goals span product and engineering work across the quarter, covering the '
      + 'dashboard redesign, the billing migration and the hiring loop. Mornings are '
      + 'reserved for deep work. Reviews happen on Fridays.',
    ));

    const description = await getSummaryFromGoalItems(ITEMS);

    expect(description).toBe(
      'These goals span product and engineering work across the quarter, covering the '
      + 'dashboard redesign, the billing migration and the hiring loop.',
    );
    expect(description).not.toMatch(/Mornings|Fridays/);
  });

  // The design's own descriptions are two clipped clauses, so the guard is the
  // word budget rather than a hard first-sentence cut.
  it('keeps the two-clause register the design uses', () => {
    expect(normaliseDescription('Product + engineering. Mornings for the hardest thing.'))
      .toBe('Product + engineering. Mornings for the hardest thing.');
    expect(normaliseDescription('Lights out by 23:00; read, no screens.'))
      .toBe('Lights out by 23:00; read, no screens.');
  });

  it('clips a single runaway sentence rather than showing nothing', () => {
    const clipped = normaliseDescription(
      'This area covers absolutely everything the team has ever agreed to do about '
      + 'product, engineering, hiring, support, billing and the long tail of small '
      + 'requests that arrive every single week without fail.',
    );

    expect(clipped.endsWith('...')).toBe(true);
    expect(clipped.split(' ').length).toBeLessThanOrEqual(24);
  });

  it('strips a preamble line and a label the model prefixed', () => {
    expect(normaliseDescription('Description: Product + engineering.'))
      .toBe('Product + engineering.');
    expect(normaliseDescription('Here is the description:\nProduct + engineering.'))
      .toBe('Product + engineering.');
  });

  // The old prompt asked for "3-5 ... as a numbered list": the card shows 3,
  // and the numbering would land on the checklist as literal text.
  it('reduces a numbered five-item list to three clean fragments', async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiText([
      'Next steps:',
      '1. Clear inbox to zero.',
      '2. Log shoe mileage.',
      '3. Outline sections 2-3.',
      '4. Pick the next book.',
      '5. Draft the quarterly review deck for the leadership team.',
    ].join('\n')));

    await expect(getNextStepsListFromGoalItems(ITEMS)).resolves.toEqual([
      'Clear inbox to zero',
      'Log shoe mileage',
      'Outline sections 2-3',
    ]);
  });

  it('strips bullets, bold, quotes and trailing periods', () => {
    expect(normaliseNextSteps([
      '- **Clear inbox to zero.**',
      '• "Log shoe mileage";',
      '* Pick the next book!',
    ])).toEqual(['Clear inbox to zero', 'Log shoe mileage', 'Pick the next book']);
  });

  it('drops a step that is a sentence instead of a fragment', () => {
    expect(normaliseNextSteps([
      'Clear inbox to zero',
      'Write a detailed specification document for the new billing flow',
      'Log shoe mileage',
    ])).toEqual(['Clear inbox to zero', 'Log shoe mileage']);
  });

  it('never puts the same step on the checklist twice', () => {
    expect(normaliseNextSteps('Clear inbox to zero\nclear inbox to zero.\nLog shoe mileage'))
      .toEqual(['Clear inbox to zero', 'Log shoe mileage']);
  });

  // A blank list is the honest answer: apologetic copy returned here would be
  // appended to the checklist verbatim.
  it('returns no steps for an empty or garbage response', async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiText('   \n ### \n ---'));

    await expect(getNextStepsListFromGoalItems(ITEMS)).resolves.toEqual([]);
    expect(normaliseNextSteps(null)).toEqual([]);
    expect(normaliseDescription(undefined)).toBe('');
  });

  it('degrades to the fallback copy when both services are gone', async () => {
    delete process.env.GEMINI_API_KEY;
    global.fetch = jest.fn();

    await expect(getSummaryFromGoalItems(ITEMS)).resolves.toMatch(/Unable to generate summary/);
    await expect(getNextStepsFromGoalItems(ITEMS)).resolves.toMatch(/Unable to generate next steps/);
    await expect(getNextStepsListFromGoalItems(ITEMS)).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // The dashboard renders this string as markdown, which collapses a single
  // newline and would otherwise run the three fragments into one line.
  it('joins the string form on blank lines so markdown keeps three lines', async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiText(
      'Clear inbox to zero\nLog shoe mileage\nPick the next book',
    ));

    await expect(getNextStepsFromGoalItems(ITEMS)).resolves
      .toBe('Clear inbox to zero\n\nLog shoe mileage\n\nPick the next book');
  });

  it('caps the generation so a runaway answer cannot happen upstream', async () => {
    global.fetch = jest.fn().mockResolvedValue(geminiText('Product + engineering.'));

    await getSummaryFromGoalItems(ITEMS);

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.generationConfig.maxOutputTokens).toBe(400);
  });

  // This path is allowed to spend credits — the paid fallback must stay intact.
  it('still falls back to paid OpenRouter when Gemini fails', async () => {
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    global.fetch = jest.fn()
      .mockResolvedValueOnce(errResponse(503))
      .mockResolvedValueOnce(openRouterText('1. Clear inbox to zero.'));

    await expect(getNextStepsListFromGoalItems(ITEMS)).resolves.toEqual(['Clear inbox to zero']);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(global.fetch.mock.calls[1][1].body).max_tokens).toBe(400);
  });
});
