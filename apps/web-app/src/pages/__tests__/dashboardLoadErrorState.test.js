/* eslint-env jest */
/**
 * D-10: an unreachable API rendered as "you have no data".
 *
 * AgendaTaskList grew the shared LoadErrorState, but nothing on the dashboard
 * produced the flag that turns it on: the `routineDate` / `agendaGoals` error
 * hooks only logged, and the day watcher lets Apollo refetch rather than going
 * through `$routine.fetchRoutine`, so the store's own error never fires either.
 * Clicking a never-loaded day while offline therefore painted "No Day Tasks".
 *
 * Hooks are exercised against a minimal vm-like context (no mount), matching
 * the loadErrorState convention.
 */
// DashBoard pulls the ui barrels, which transitively import third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in the error handling.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const DashBoard = require('../DashBoard.vue').default;

describe('DashBoard day strip load error', () => {
  it('flags a routine failure so the day strip can say so', () => {
    const vm = { loadError: false };
    DashBoard.apollo.routineDate.error.call(vm, new Error('Failed to fetch'));
    expect(vm.loadError).toBe(true);
  });

  it('flags an agenda failure and stops the page spinning', () => {
    const vm = { loadError: false, isLoading: true };
    DashBoard.apollo.agendaGoals.error.call(vm);
    expect(vm.loadError).toBe(true);
    expect(vm.isLoading).toBe(false);
  });

  it('clears the failure once the routine arrives', () => {
    const vm = { loadError: true };
    DashBoard.apollo.routineDate.result.call(vm, { data: { routineDate: { id: 'r1' } } });
    expect(vm.loadError).toBe(false);
  });

  it('clears the failure for a day that genuinely has no routine document', () => {
    const vm = { loadError: true };
    DashBoard.apollo.routineDate.result.call(vm, { data: { routineDate: null } });
    expect(vm.loadError).toBe(false);
  });

  it('keeps the failure when a result carries no data', () => {
    const vm = { loadError: true };
    DashBoard.apollo.routineDate.result.call(vm, { data: undefined });
    expect(vm.loadError).toBe(true);
  });

  it('clears the failure once the agenda arrives', () => {
    const vm = { loadError: true };
    DashBoard.apollo.agendaGoals.result.call(vm, { data: { agendaGoals: [] } });
    expect(vm.loadError).toBe(false);
  });
});
