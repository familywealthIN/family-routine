const { generateMilestonePlan } = require('../src/utils/aiApi');

/**
 * These run against the offline path: with no AI key configured
 * `fetchFromAi` throws and `generateMilestonePlan` returns its fallback
 * plan, which is built from the very same entry template the AI path is
 * pinned to. That makes the period/date grid deterministic to assert on
 * without touching the network.
 */
describe('generateMilestonePlan period handling', () => {
  const savedKeys = {
    gemini: process.env.GEMINI_API_KEY,
    openRouter: process.env.OPENROUTER_API_KEY,
  };
  let consoleError;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    if (savedKeys.gemini) process.env.GEMINI_API_KEY = savedKeys.gemini;
    if (savedKeys.openRouter) process.env.OPENROUTER_API_KEY = savedKeys.openRouter;
  });

  const parse = (date) => {
    const [day, month, year] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  it('plans a month as the week goals inside that month', async () => {
    // No period word anywhere in the objective — the toolbar period is the
    // only thing that says "month". Before the fix this fell through to the
    // week default and produced seven day entries under the month goal.
    const plan = await generateMilestonePlan('Ship the onboarding revamp', null, 'month');

    expect(plan.period).toBe('month');
    expect(plan.entries.length).toBeGreaterThan(0);
    expect(plan.entries.length).toBeLessThanOrEqual(5);

    const targetMonth = parse(plan.entries[0].date).getMonth();
    plan.entries.forEach((entry, index) => {
      const entryDate = parse(entry.date);
      expect(entry.period).toBe('week');
      expect(entry.periodName).toBe(`Week ${index + 1}`);
      // Friday is the week-goal anchor, and every week belongs to the
      // parent month goal.
      expect(entryDate.getDay()).toBe(5);
      expect(entryDate.getMonth()).toBe(targetMonth);
    });
  });

  it('keeps the month period when the objective talks in days', async () => {
    const plan = await generateMilestonePlan('Run a 7 day writing sprint', null, 'month');

    expect(plan.period).toBe('month');
    plan.entries.forEach((entry) => expect(entry.period).toBe('week'));
  });

  it('still steps a week plan down to days', async () => {
    const plan = await generateMilestonePlan('Ship the onboarding revamp', null, 'week');

    expect(plan.period).toBe('week');
    expect(plan.entries).toHaveLength(7);
    plan.entries.forEach((entry) => expect(entry.period).toBe('day'));
  });

  it('falls back to reading the period from the query when none is given', async () => {
    const plan = await generateMilestonePlan('Plan the next 3 weeks of launch prep');

    expect(plan.period).toBe('month');
    plan.entries.forEach((entry) => expect(entry.period).toBe('week'));
  });
});
