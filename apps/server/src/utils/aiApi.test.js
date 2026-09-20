// D-19: a week plan's day grid started at today + 1, so a seven-day routine
// requested on Sat 15 Aug was templated for Sun 16 - Sat 22 and the setup day
// had nothing to execute. The grid must start on the day the user asks.

const { generateMilestonePlan } = require('./aiApi');

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
