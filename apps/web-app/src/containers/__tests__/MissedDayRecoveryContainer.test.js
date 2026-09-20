/* eslint-env jest */
/**
 * D-17: the container turns the week strip's own per-day totals into the one
 * missed day the dashboard acknowledges, and remembers a "Not now" for the
 * session so the nudge supports rather than nags.
 *
 * Computeds/methods are exercised against a minimal vm-like context (no mount),
 * matching the GoalCreationContainerMissed.test.js convention.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));

const Container = require('../MissedDayRecoveryContainer.vue').default;
const { WEEK_STIMULI_QUERY } = require('../../composables/graphql/queries');

const TODAY = '16-09-2026';

const day = (date, D = 0) => ({
  date, D, K: 0, G: 0, skipped: false,
});

// Sunday started well, Monday and Tuesday are blank, today is still open.
const week = () => [
  day('13-09-2026', 40),
  day('14-09-2026'),
  day('15-09-2026'),
  day(TODAY),
];

const ctx = (overrides = {}) => ({
  date: TODAY, weekStimuli: week(), dismissedFor: '', ...overrides,
});

describe('MissedDayRecoveryContainer', () => {
  beforeEach(() => sessionStorage.clear());

  it('derives the most recent missed day from the week strip', () => {
    expect(Container.computed.missedDay.call(ctx()))
      .toEqual({ date: '15-09-2026', weekday: 'Tuesday' });
  });

  it('holds its silence once that day has been set aside', () => {
    expect(Container.computed.missedDay.call(ctx({ dismissedFor: '15-09-2026' }))).toBeNull();
  });

  it('still speaks up about a different day than the one set aside', () => {
    expect(Container.computed.missedDay.call(ctx({ dismissedFor: '14-09-2026' })))
      .toEqual({ date: '15-09-2026', weekday: 'Tuesday' });
  });

  it('remembers the dismissal for the session', () => {
    const vm = ctx();
    Container.methods.dismiss.call(vm, '15-09-2026');

    expect(vm.dismissedFor).toBe('15-09-2026');
    expect(sessionStorage.getItem('missedDayDismissedFor')).toBe('15-09-2026');
  });

  it('reads the week from the week start, so it shares the week strip cache entry', () => {
    expect(Container.computed.currentWeekStart.call(ctx())).toBe('13-09-2026');
    expect(Container.apollo.weekStimuli.query).toBe(WEEK_STIMULI_QUERY);
    expect(Container.apollo.weekStimuli.variables.call(ctx({ currentWeekStart: '13-09-2026' })))
      .toEqual({ date: '13-09-2026' });
  });

  it('asks the server for the skip flag the rest-day rule needs', () => {
    const [definition] = WEEK_STIMULI_QUERY.definitions;
    const [field] = definition.selectionSet.selections;
    const fields = field.selectionSet.selections.map((selection) => selection.name.value);

    expect(fields).toEqual(expect.arrayContaining(['date', 'D', 'K', 'G', 'skipped']));
  });
});
