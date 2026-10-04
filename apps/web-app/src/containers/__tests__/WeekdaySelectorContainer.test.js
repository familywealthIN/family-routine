/* eslint-env jest */
/**
 * D-24: the week strip drew the missed Wednesday exactly like the Friday and
 * Saturday that had not happened yet. The container owns the signal — the same
 * weekStimuli read and the same utils/missedDay rule the recovery card uses —
 * and hands it to the organism.
 *
 * Mounted without vue-apollo, so the `apollo` option is inert and the week can
 * be set directly, as the query's `update` would.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));

const Vue = require('vue');

const Container = require('../WeekdaySelectorContainer.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

// Thursday 20 Aug 2026, the day of the beta repro. The week runs Sun 16 Aug -
// Sat 22 Aug: 16/17/18 went to plan, Wednesday 19 got away, 21/22 are still
// to come.
const BETA_DAY = new Date('2026-08-20T12:00:00Z');
const TODAY = '20-08-2026';
const MISSED = '19-08-2026';

const day = (date, overrides = {}) => ({
  date, D: 0, K: 0, G: 0, skipped: false, ...overrides,
});

const betaWeek = (overrides = {}) => [
  '16-08-2026', '17-08-2026', '18-08-2026', '19-08-2026',
  '20-08-2026', '21-08-2026', '22-08-2026',
].map((date) => day(date, overrides[date] || {}));

const week = (overrides = {}) => betaWeek({
  '16-08-2026': { D: 40 }, '17-08-2026': { D: 35 }, '18-08-2026': { K: 20 }, ...overrides,
});

const ctx = (weekStimuli, selectedDate = TODAY) => ({ selectedDate, weekStimuli });

describe('WeekdaySelectorContainer', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: BETA_DAY, doNotFake: ['nextTick', 'queueMicrotask'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('names the day that got away, and not the days still to come', () => {
    expect(Container.computed.missedDates.call(ctx(week()))).toEqual([MISSED]);
  });

  it('grades the week against today, not the day the user has selected', () => {
    // Selecting Monday must not turn the rest of the week back into days that
    // have not happened yet.
    expect(Container.computed.missedDates.call(ctx(week(), '17-08-2026'))).toEqual([MISSED]);
  });

  it('never marks a deliberate Skip Day', () => {
    const weekStimuli = week({ '19-08-2026': { skipped: true } });

    expect(Container.computed.missedDates.call(ctx(weekStimuli))).toEqual([]);
  });

  it('names no missed day before the week has any activity', () => {
    expect(Container.computed.missedDates.call(ctx(betaWeek()))).toEqual([]);
  });

  it('hands the missed days to the strip, which marks only those columns', async () => {
    const vm = new (Vue.extend(Container))({ propsData: { selectedDate: TODAY } }).$mount();
    vm.weekStimuli = week();
    await vm.$nextTick();

    const marked = Array.from(vm.$el.querySelectorAll('.day-column.missed'))
      .map((column) => column.querySelector('.day-number').textContent);

    expect(marked).toEqual(['19']);
  });
});
