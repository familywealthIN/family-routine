/* eslint-env jest */
/**
 * D-13: /progress said "15% Routine Efficiency" and /history said 6% for the
 * same account at the same instant.
 *
 * /history computed its own figure — the mean of every routine day ever
 * recorded — while /progress showed the server's card, which averaged only the
 * days that had scored. Neither screen could explain itself either. The number
 * now has one source: the `efficiency` card getProgress returns, carrying both
 * the value and the formula.
 *
 * Computeds are exercised against a minimal vm-like context (no mount),
 * matching the weekGoalStreakVisibility convention.
 */
// CheckHistory pulls the ui barrels, which transitively import third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in the efficiency card.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
// The page mounts the chassis now, so it also reaches the native sign-in
// plugins through `utils/signOut` and the gitignored blob config behind them.
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const CheckHistory = require('../CheckHistory.vue').default;

const card = (overrides = {}) => ({
  id: 'efficiency',
  value: '75%',
  description: "Routine points earned ÷ routine points available, across this week's days. Skipped days do not count.",
  ...overrides,
});

const efficiency = (progress) => CheckHistory.computed.efficiency.call({ progress });

describe('CheckHistory Routine Efficiency', () => {
  it('shows the server card verbatim rather than averaging the routines itself', () => {
    // The days that produced 6% here: a long history, most of it unscored.
    const routines = [
      { date: '16-08-2026', tasklist: [{ points: 30, ticked: true }] },
      { date: '17-08-2026', tasklist: [{ points: 30, ticked: false }] },
      { date: '18-08-2026', tasklist: [{ points: 30, ticked: false }] },
    ];
    const progress = { cards: [card({ value: '33%' })] };

    expect(efficiency(progress).value).toBe('33%');
    // The trend under the card is the share of each day's routine ticked, not
    // the raw points the old chart plotted: the number above it is a
    // percentage, so the line beneath should be the same unit and have a
    // ceiling to be read against.
    expect(CheckHistory.computed.trend.call({ progress, routines }).values)
      .toEqual([100, 0, 0]);
  });

  it('breaks the trend line on a day with no routine instead of plotting a zero', () => {
    const routines = [
      { date: '16-08-2026', tasklist: [{ ticked: true }] },
      { date: '17-08-2026', tasklist: [] },
    ];
    expect(CheckHistory.computed.trend.call({ routines }).values).toEqual([100, null]);
  });

  it('orders the trend oldest first whatever order the server sent', () => {
    const routines = [
      { date: '18-08-2026', tasklist: [{ ticked: true }] },
      { date: '16-08-2026', tasklist: [{ ticked: false }] },
    ];
    const { values, labels } = CheckHistory.computed.trend.call({ routines });
    expect(values).toEqual([0, 100]);
    expect(labels).toEqual(['16 Aug', '18 Aug']);
  });

  it('carries the formula the screen offers behind the info icon', () => {
    expect(efficiency({ cards: [card()] }).description).toContain('Routine points earned');
  });

  it('shows nothing rather than a made-up zero before the card arrives', () => {
    expect(efficiency(null).value).toBeUndefined();
    expect(efficiency({ cards: [] }).value).toBeUndefined();
    expect(efficiency({ cards: [null, card({ id: 'on-track', value: '?' })] }).value).toBeUndefined();
  });

  it('asks getProgress for the window /progress opens on, so the two agree', () => {
    const { variables } = CheckHistory.apollo.progress;

    expect(variables.call({}).period).toBe('week');
  });
});
