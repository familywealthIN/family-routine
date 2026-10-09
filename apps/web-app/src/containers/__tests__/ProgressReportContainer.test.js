/* eslint-env jest */
/**
 * ProgressReportContainer — the one read behind every figure on /progress.
 *
 * Computeds are exercised against a minimal vm-like context (no mount), matching
 * the MissedDayRecoveryContainer convention.
 *
 * The decisions worth pinning: that the container reads the server's efficiency
 * card instead of working the metric out a third time (D-13), that each period
 * gets its own scope wording, and that the figures the report does not return
 * leave as nulls rather than as plausible zeros.
 */
const fs = require('fs');
const path = require('path');

jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));

const Container = require('../ProgressReportContainer.vue').default;
const { PROGRESS_REPORT_QUERY } = require('../../composables/graphql/progressQueries');

const { computed, apollo } = Container;

const FORMULA = "Routine points earned ÷ routine points available, across this day's routines. Skipped days do not count.";

const progress = {
  progressStatement: 'Great Going!',
  period: 'week',
  startDate: '06-09-2026',
  endDate: '12-09-2026',
  cards: [
    {
      id: 'efficiency', name: 'Routine Efficiency', value: '72%', description: FORMULA,
    },
    { id: 'radar-chart', values: [{ name: 'D', value: '80' }, { name: 'K', value: '46' }, { name: 'G', value: '64' }] },
    { id: 'on-track', name: 'Goals on Track (Coming Soon)', value: '?' },
    {
      id: 'task-activities',
      values: [
        { name: 'Routine Items', value: '5', total: '7' },
        { name: 'Tasks', value: '8', total: '11' },
        { name: 'Milestones', value: '1', total: '2' },
      ],
    },
    { id: 'good', values: [{ id: 'r1', name: 'Family Dinner', value: '96' }] },
    { id: 'bad', values: [{ id: 'r5', name: 'Lunch Walk', value: '31' }] },
  ],
};

const ctx = (overrides = {}) => {
  const base = {
    period: 'week', today: '12-09-2026', progress, selectedIndex: null, ...overrides,
  };
  base.safePeriod = computed.safePeriod.call(base);
  base.reportWindow = computed.reportWindow.call(base);
  base.report = computed.report.call(base);
  return base;
};

const read = (name, overrides) => computed[name].call(ctx(overrides));

describe('ProgressReportContainer — the report', () => {
  it('owns exactly one operation: getProgress for one window', () => {
    expect(apollo.progress.query).toBe(PROGRESS_REPORT_QUERY);
    expect(Object.keys(apollo)).toEqual(['progress']);
  });

  it('reads it cache-and-network, so a stale report self-heals', () => {
    expect(apollo.progress.fetchPolicy).toBe('cache-and-network');
  });

  it('asks for the start of the period through today', () => {
    expect(apollo.progress.variables.call(ctx()))
      .toEqual({ period: 'week', startDate: '06-09-2026', endDate: '12-09-2026' });
    expect(apollo.progress.variables.call(ctx({ period: 'year' })))
      .toEqual({ period: 'year', startDate: '01-01-2026', endDate: '12-09-2026' });
  });

  it('waits for a signed-in user rather than querying as nobody', () => {
    expect(apollo.progress.skip.call({ $root: { $data: {} } })).toBe(true);
    expect(apollo.progress.skip.call({ $root: { $data: { email: 'a@b.c' } } })).toBe(false);
  });

  it('unwraps getProgress off the payload', () => {
    expect(apollo.progress.update({ getProgress: progress })).toBe(progress);
  });
});

describe('ProgressReportContainer — Routine Efficiency', () => {
  it('shows the server card, value and formula, rather than a third computation', () => {
    expect(read('efficiency')).toEqual({ value: 72, formula: FORMULA });
  });

  it('has nothing to show before the card arrives', () => {
    expect(read('efficiency', { progress: null })).toEqual({ value: null, formula: '' });
  });

  it('offers no delta, because one report is one window', () => {
    expect(read('previousEfficiency')).toBeNull();
    expect(read('previousPeriodLabel')).toBe('last week');
    expect(read('previousPeriodLabel', { period: 'month' })).toBe('August');
  });
});

describe('ProgressReportContainer — the scopes', () => {
  it('scopes COMPLETED per period', () => {
    expect(read('completedHeading', { period: 'day' })).toBe('COMPLETED · TODAY');
    expect(read('completedHeading', { period: 'week' })).toBe('COMPLETED · AVG PER DAY');
    expect(read('completedHeading', { period: 'month' })).toBe('COMPLETED · AVG PER DAY');
    expect(read('completedHeading', { period: 'year' }))
      .toBe('COMPLETED · AVG PER DAY · MILESTONES THIS YEAR');
  });

  it('scopes the stimulus balance the same way — a Day window is not a mean', () => {
    expect(read('balanceHeading', { period: 'day' })).toBe('BALANCE · TODAY');
    expect(read('balanceHeading', { period: 'year' })).toBe('BALANCE · AVG PER DAY');
  });
});

describe('ProgressReportContainer — the cards', () => {
  it('feeds the trio the stimulus figures', () => {
    expect(read('balance')).toEqual({ D: 80, K: 46, G: 64 });
  });

  it('hands the organism no balance at all before the card arrives', () => {
    expect(read('balance', { progress: null })).toBeNull();
  });

  it('turns task-activities into the three labelled bars', () => {
    expect(read('completed').map((row) => [row.label, row.value, row.total]))
      .toEqual([['Routine items', 5, 7], ['Tasks', 8, 11], ['Milestones', 1, 2]]);
  });

  it('splits the rankings and keeps the routine ids', () => {
    expect(read('rankings')).toEqual({
      good: [{ id: 'r1', name: 'Family Dinner', score: 96 }],
      bad: [{ id: 'r5', name: 'Lunch Walk', score: 31 }],
    });
  });

  it('leaves "Goals on Track" out — the report still answers it with "?"', () => {
    const rendered = JSON.stringify([read('completed'), read('rankings'), read('efficiency')]);
    expect(rendered).not.toContain('on-track');
    expect(rendered).not.toContain('?');
  });
});

describe('ProgressReportContainer — the trend it cannot draw', () => {
  it('passes no series, so the hero explains the absence instead of plotting it', () => {
    expect(read('series')).toEqual([]);
    expect(read('seriesLabels')).toEqual([]);
    expect(read('pointNames')).toEqual([]);
  });

  it('names the missing unit per period', () => {
    expect(read('trendNote', { period: 'day' }))
      .toBe('No routine-by-routine trend yet — this report returns one figure for the whole day.');
    expect(read('trendNote', { period: 'week' }))
      .toBe('No day-by-day trend yet — this report returns one figure for the whole week.');
  });

  it('forgets the scrubbed point when the period changes', () => {
    const vm = { selectedIndex: 4 };
    Container.watch.safePeriod.call(vm);
    expect(vm.selectedIndex).toBeNull();
  });
});

describe("ProgressReportContainer — never another period's figures (BUG-1)", () => {
  // vue-apollo keeps the previous result while the new variables load, and for
  // good when the new read fails. The week's report must not survive a switch
  // to Day under the Day labels.
  const state = (overrides) => {
    const vm = ctx(overrides);
    vm.loadError = computed.loadError.call(vm);
    vm.loading = computed.loading.call(vm);
    return vm;
  };

  it('shows the report when it answers the window on screen', () => {
    expect(ctx().report).toBe(progress);
    expect(state().loading).toBe(false);
  });

  it("withholds last period's report while the new one loads", () => {
    const vm = state({ period: 'day' });
    expect(vm.report).toBeNull();
    expect(vm.loading).toBe(true);
    expect(computed.efficiency.call(vm)).toEqual({ value: null, formula: '' });
    expect(computed.balance.call(vm)).toBeNull();
    expect(computed.statement.call(vm)).toBe('');
    expect(computed.rankings.call(vm)).toEqual({ good: [], bad: [] });
  });

  it('accepts a report whose dates the server did not echo (it returns them null)', () => {
    const undated = { ...progress, startDate: null, endDate: null };
    expect(ctx({ progress: undated }).report).toBe(undated);
    expect(ctx({ progress: undated, period: 'day' }).report).toBeNull();
  });

  it('withholds a report for the same period but another window (a new day)', () => {
    expect(ctx({ today: '13-09-2026', period: 'day' }).report).toBeNull();
    expect(ctx({ today: '14-09-2026' }).report).toBeNull();
  });

  it('turns a failed read into the D-10 error state, not stale figures', () => {
    const vm = { ...ctx({ period: 'day' }), readFailed: false };
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
    apollo.progress.error.call(vm, new Error('Network error: Failed to fetch'));
    quiet.mockRestore();
    expect(vm.readFailed).toBe(true);
    expect(computed.loadError.call(vm)).toBe(true);
    vm.loadError = true;
    expect(computed.loading.call(vm)).toBe(false);
  });

  it('keeps a working report on screen when only a refetch fails', () => {
    expect(computed.loadError.call({ ...ctx(), readFailed: true })).toBe(false);
  });

  it('clears the failure when a result arrives, and when the period changes', () => {
    const vm = { readFailed: true };
    apollo.progress.result.call(vm, { data: undefined });
    expect(vm.readFailed).toBe(true);
    apollo.progress.result.call(vm, { data: { getProgress: progress } });
    expect(vm.readFailed).toBe(false);
    const switched = { readFailed: true, selectedIndex: null };
    Container.watch.safePeriod.call(switched);
    expect(switched.readFailed).toBe(false);
  });

  it('spins the retry button only while a retry is in flight', () => {
    const q = (loading) => ({ $apollo: { queries: { progress: { loading } } } });
    expect(computed.retrying.call({ ...q(true), loadError: true })).toBe(true);
    expect(computed.retrying.call({ ...q(true), loadError: false })).toBe(false);
  });

  it('retries by refetching the one query', () => {
    const refetch = jest.fn(() => Promise.resolve());
    Container.methods.refresh.call({ $apollo: { queries: { progress: { refetch } } } });
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

// The page's On the clock card only lays out in two columns when the report's
// `wide` slot prop reaches it. This container re-exposes the slot, and once
// passed it on bare, so the card stayed single-column on its full-width row.
describe('ProgressReportContainer — the timing slot', () => {
  it('passes the report’s slot props through to the page', () => {
    const source = fs.readFileSync(path.join(__dirname, '../ProgressReportContainer.vue'), 'utf8');
    const slot = source.match(/<template v-slot:timing="(\w+)">\s*<slot name="timing" v-bind="(\w+)"/);
    expect(slot).not.toBeNull();
    expect(slot[1]).toBe(slot[2]);
  });
});
