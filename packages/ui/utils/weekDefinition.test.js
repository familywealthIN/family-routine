/**
 * The two surfaces that name a week — Home's week strip and the week goal
 * picker — have to agree on which seven days "this week" is. Pinned to
 * Europe/London so the local-midnight maths in the picker is deterministic.
 *
 * @jest-environment ./molecules/DateSelector/londonTimezoneEnvironment.js
 */
/* eslint-env jest */
// The atoms barrel the picker imports reaches vue-radar, whose .vue entry point
// is shipped untransformed and cannot be parsed here.
jest.mock('vue-radar', () => ({}));

const Vue = require('vue');
const Vuetify = require('vuetify');

const { getPeriodDate } = require('./getDates');
const DateSelector = require('../molecules/DateSelector/DateSelector.vue').default;
const WeekdaySelector = require('../organisms/WeekdaySelector/WeekdaySelector.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

// Sunday 16 Aug 2026, the day of the beta repro. This is the day the two
// definitions part company: the Sunday-start week runs 16-22 Aug, while a
// Monday-start week ends today.
const BETA_DAY = new Date('2026-08-16T12:00:00+01:00');

const mountPicker = (value = '') => {
  // The menu detaches into the app root, which jsdom has to be given.
  document.body.setAttribute('data-app', 'true');
  const Ctor = Vue.extend(DateSelector);
  const vm = new Ctor({ propsData: { value, period: 'week', label: '' } }).$mount();
  const inputs = [];
  vm.$on('input', (v) => inputs.push(v));
  return { vm, inputs };
};

const mountStrip = (selectedDate) => {
  const Parent = Vue.extend({
    data: () => ({ date: selectedDate }),
    render(h) {
      return h(WeekdaySelector, { props: { selectedDate: this.date } });
    },
  });
  const parent = new Parent().$mount();
  return { parent, strip: parent.$children[0] };
};

describe('one week definition across the app', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: BETA_DAY, doNotFake: ['nextTick', 'queueMicrotask'] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('the week goal picker calls Sun 16 - Sat 22 the current week', () => {
    const { vm } = mountPicker();

    const current = vm.weekOptions.find((week) => week.isCurrent);

    expect(current.weekNum).toBe(34);
    expect(current.range).toBe('Aug 16 - Aug 22');
  });

  it('"This Week" picks the Friday inside the week the picker ranged', () => {
    const { vm, inputs } = mountPicker();

    vm.handleThisWeek();

    expect(inputs).toEqual(['21-08-2026']);
    expect(vm.displayValue).toBe('This Week');
  });

  it("Home's week strip draws exactly the days the picker ranged", () => {
    const { strip } = mountStrip('16-08-2026');

    expect(strip.weekDays.map((weekDay) => weekDay.fullDate)).toEqual([
      '16-08-2026',
      '17-08-2026',
      '18-08-2026',
      '19-08-2026',
      '20-08-2026',
      '21-08-2026',
      '22-08-2026',
    ]);
  });

  it('names the saved week the same way the goals page does', () => {
    const { vm } = mountPicker('21-08-2026');

    expect(vm.displayValue).toBe('This Week');
    expect(vm.formatWeekDisplay('21-08-2026')).toBe('Week 34, 2026');
    expect(getPeriodDate('week', '21-08-2026', '')).toBe('Week 34');
  });

  it('moves the strip on when the selection crosses from Saturday to Sunday', async () => {
    const { parent, strip } = mountStrip('15-08-2026');

    expect(strip.weekDays[0].fullDate).toBe('09-08-2026');

    parent.date = '16-08-2026';
    await Vue.nextTick();

    expect(strip.weekDays[0].fullDate).toBe('16-08-2026');
    expect(strip.weekDays[0].isActive).toBe(true);
  });
});
