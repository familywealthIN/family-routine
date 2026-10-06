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

const DateSelector = require('./DateSelector.vue').default;

Vue.use(Vuetify);

// Thursday 20 Aug 2026, the day of the beta repro. ISO week 34 runs
// Mon 17 Aug - Sun 23 Aug, so "this week" is 2026-W34.
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
    expect(current.range).toBe('Aug 17 - Aug 23');
  });

  it('highlights the row matching the selected value', () => {
    const { vm } = mountWeekSelector('21-08-2026');

    expect(vm.internalWeekValue).toBe('2026-W34');
  });
});
