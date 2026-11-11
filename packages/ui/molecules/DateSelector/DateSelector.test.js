/**
 * The week maths runs on local-midnight Date objects, so these cases only mean
 * anything in a timezone that observes DST — August 2026 is summer time in
 * Europe/London, which is what the environment below pins.
 *
 * @jest-environment ./molecules/DateSelector/londonTimezoneEnvironment.js
 */
/* eslint-env jest */
// The atoms barrel reaches vue-radar, whose .vue entry point is shipped
// untransformed and cannot be parsed here. The date selector never renders it.
jest.mock('vue-radar', () => ({}));

const Vue = require('vue');
const Vuetify = require('vuetify');
const moment = require('moment');

const DateSelector = require('./DateSelector.vue').default;
const { periodGoalDates } = require('../../utils/getDates');

Vue.use(Vuetify);

// Thursday 20 Aug 2026, the day of the beta repro. The app's week 34 runs
// Sun 16 Aug - Sat 22 Aug, so "this week" is 2026-W34.
const BETA_DAY = new Date('2026-08-20T12:00:00+01:00');

// Mounts the molecule the way GoalTaskToolbar wires it in the AI builder:
// a controlled `value` plus an `input` listener carrying the new date up.
const mountWeekSelector = (value = '') => {
  // The menu detaches into the app root, which jsdom has to be given.
  document.body.setAttribute('data-app', 'true');
  const Ctor = Vue.extend(DateSelector);
  const vm = new Ctor({ propsData: { value, period: 'week', label: '' } }).$mount();
  const inputs = [];
  vm.$on('input', (v) => inputs.push(v));
  return { vm, inputs };
};

describe('MoleculeDateSelector week selection', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: BETA_DAY, doNotFake: ['nextTick', 'queueMicrotask'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs under summer time, where the defect showed up', () => {
    expect(new Date(2026, 7, 20).getTimezoneOffset()).toBe(-60);
  });

  it('emits the Friday of the clicked week, not of the current week', () => {
    const { vm, inputs } = mountWeekSelector();

    vm.handleWeekSelect('2026-W36');

    expect(inputs).toEqual(['04-09-2026']);
    expect(vm.displayValue).toBe('Week 36, 2026');
  });

  it('emits the current week when the current week is clicked', () => {
    const { vm, inputs } = mountWeekSelector();

    vm.handleWeekSelect('2026-W34');

    expect(inputs).toEqual(['21-08-2026']);
    expect(vm.displayValue).toBe('This Week');
  });

  it('flags the week that actually contains today as current', () => {
    const { vm } = mountWeekSelector();

    const current = vm.weekOptions.find((week) => week.isCurrent);

    expect(current.weekNum).toBe(34);
    expect(current.range).toBe('Aug 16 - Aug 22');
  });

  it('highlights the row matching the selected value', () => {
    const { vm } = mountWeekSelector('21-08-2026');

    expect(vm.internalWeekValue).toBe('2026-W34');
  });
});

// The app's week runs Sunday to Saturday and is keyed by its Friday (moment's
// `.week()`, getDates.js periodGoalDates, goalDatePeriod). The selector used ISO
// weeks, so on a Sunday it filed a new week goal under the previous Friday and
// the routine's WEEK tab never found it.
describe('MoleculeDateSelector Sunday-to-Saturday weeks', () => {
  const at = (iso) => jest.useFakeTimers({ now: new Date(iso), doNotFake: ['nextTick', 'queueMicrotask'] });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Sun 1 Nov - Sat 7 Nov 2026, each at the beta's 21:10 (GMT after 25 Oct).
  const FIRST_WEEK_OF_NOVEMBER = [
    ['Sunday', '2026-11-01', '01-11-2026'],
    ['Monday', '2026-11-02', '02-11-2026'],
    ['Tuesday', '2026-11-03', '03-11-2026'],
    ['Wednesday', '2026-11-04', '04-11-2026'],
    ['Thursday', '2026-11-05', '05-11-2026'],
    ['Friday', '2026-11-06', '06-11-2026'],
    ['Saturday', '2026-11-07', '07-11-2026'],
  ];

  it.each(FIRST_WEEK_OF_NOVEMBER)('on %s %s the current week is 1-7 Nov, keyed 06-11-2026', (_, iso, today) => {
    at(`${iso}T21:10:00Z`);
    // The toolbar holds today's date when the sheet switches to week mode.
    const { vm, inputs } = mountWeekSelector(today);

    expect(vm.getCurrentWeek()).toBe('06-11-2026');
    expect(vm.getCurrentWeek()).toBe(periodGoalDates('week', today));
    expect(vm.getCurrentWeekValue()).toBe(`2026-W${moment(today, 'DD-MM-YYYY').week()}`);
    expect(vm.getCurrentWeekValue()).toBe('2026-W45');
    expect(vm.displayValue).toBe('This Week');

    const current = vm.weekOptions.find((week) => week.isCurrent);
    expect(current.weekNum).toBe(45);
    expect(current.range).toBe('Nov 1 - Nov 7');

    vm.handleThisWeek();
    expect(inputs).toEqual(['06-11-2026']);
  });

  it('keeps Saturday 31 Oct in the week of 25-31 Oct and moves on at Sunday midnight', () => {
    at('2026-10-31T23:59:00Z');
    let { vm } = mountWeekSelector();
    expect(vm.getCurrentWeek()).toBe('30-10-2026');
    expect(vm.getCurrentWeekValue()).toBe('2026-W44');
    expect(vm.weekOptions.find((week) => week.isCurrent).range).toBe('Oct 25 - Oct 31');

    at('2026-11-01T00:00:00Z');
    ({ vm } = mountWeekSelector());
    expect(vm.getCurrentWeek()).toBe('06-11-2026');
    expect(vm.getCurrentWeekValue()).toBe('2026-W45');
  });

  it('still selects a week other than the current one (D-09)', () => {
    at('2026-11-01T21:10:00Z');
    const { vm, inputs } = mountWeekSelector('01-11-2026');

    vm.handleWeekSelect('2026-W46');

    expect(inputs).toEqual(['13-11-2026']);
    expect(vm.displayValue).toBe('Week 46, 2026');
    expect(vm.internalWeekValue).toBe('2026-W46');
    expect(vm.weekOptions.find((week) => week.weekNum === 46).range).toBe('Nov 8 - Nov 14');
  });

  it('hides weeks that ended before today when a minimum date is set', () => {
    at('2026-11-01T21:10:00Z');
    document.body.setAttribute('data-app', 'true');
    const Ctor = Vue.extend(DateSelector);
    const vm = new Ctor({ propsData: { value: '', period: 'week', minDate: '2026-11-01' } }).$mount();

    expect(vm.weekOptions[0].weekNum).toBe(45);
    expect(vm.weekOptions[0].range).toBe('Nov 1 - Nov 7');
  });

  it('crosses the year boundary the way moment .week() does', () => {
    // Sun 27 Dec 2026 opens 2027's week 1, the week of Friday 1 Jan 2027.
    at('2026-12-27T21:10:00Z');
    let { vm } = mountWeekSelector('27-12-2026');
    expect(vm.getCurrentWeek()).toBe('01-01-2027');
    expect(vm.getCurrentWeekValue()).toBe('2027-W01');
    expect(vm.displayValue).toBe('This Week');
    expect(vm.formatWeekDisplay('01-01-2027')).toBe('Week 1, 2027');

    // 2026 ends on its week 52, Sun 20 - Sat 26 Dec.
    const weeks2026 = vm.getWeeksOfYear(2026);
    expect(weeks2026).toHaveLength(52);
    expect(vm.getWeekDateRange(2026, 52)).toBe('Dec 20 - Dec 26');

    // Sun 3 Jan 2027 opens week 2, keyed Friday 8 Jan.
    at('2027-01-03T09:00:00Z');
    const next = mountWeekSelector();
    ({ vm } = next);
    expect(vm.getCurrentWeek()).toBe('08-01-2027');
    expect(vm.getCurrentWeek()).toBe(periodGoalDates('week', '03-01-2027'));
    expect(vm.getCurrentWeekValue()).toBe('2027-W02');
    expect(vm.weekOptions.find((week) => week.isCurrent).range).toBe('Jan 3 - Jan 9');
    vm.handleThisWeek();
    vm.handleWeekSelect('2027-W01');
    expect(next.inputs).toEqual(['08-01-2027', '01-01-2027']);
  });
});
