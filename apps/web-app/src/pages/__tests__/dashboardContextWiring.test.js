/* eslint-env jest */
/**
 * Both home screens must generate the day's area/project AI context.
 *
 * The kick-off used to sit in DashBoard.vue only. Routine Focus then took over
 * `/home` and the dashboard moved to `/home/classic`, so on the screen users
 * land on the 24h cache was never filled and the AI Search Modal's "Build on
 * Next Steps" toggle could never be enabled. The mixin's own behaviour is
 * covered in mixins/__tests__/dashboardContextMixin.test.js — what is asserted
 * here is the wiring: each page registers it, and each page's tasklist watcher
 * calls it once the routine arrives.
 *
 * Watchers are exercised against a minimal vm-like context (no mount), matching
 * the page test convention.
 */
// Both pages pull the ui barrels, which transitively import third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in this wiring.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
// Same for the native sign-in plugins, which ship untranspiled ESM, and the
// gitignored blob config the drawer's Log out path reads client ids from.
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const { dashboardContextMixin } = require('../../mixins/dashboardContextMixin');

const RoutineFocus = require('../RoutineFocus.vue').default;
const DashBoard = require('../DashBoard.vue').default;

const TASKLIST = [{ id: 'sw', name: 'Start Work', tags: ['area:work'] }];

// Enough of a vm for the watcher body; `startDashboardCaching` is the spy.
const watcherVm = (overrides) => ({
  $currentTask: { setTasklist: jest.fn() },
  startDashboardCaching: jest.fn(),
  setPassedWait: jest.fn(),
  routineFirstLoad: true,
  ...overrides,
});

const fire = (page, vm, tasklist) => {
  page.watch['routineDate.tasklist'].handler.call(vm, tasklist);
  return vm;
};

describe.each([
  ['RoutineFocus', RoutineFocus, { isToday: true }],
  ['DashBoard', DashBoard, { isTodaySelected: true }],
])('%s area/project context', (name, page, todayFlag) => {
  it('registers the shared context mixin', () => {
    expect(page.mixins).toContain(dashboardContextMixin);
  });

  it('generates the context once the routine arrives', () => {
    const vm = fire(page, watcherVm(todayFlag), TASKLIST);
    expect(vm.startDashboardCaching).toHaveBeenCalledTimes(1);
  });

  // The routine list comes from Apollo, so the watcher fires empty first. There
  // are no routines to read tags off yet — generating then would cache nothing
  // and the 24h TTL would hold that emptiness for the rest of the day.
  it('waits for a non-empty routine', () => {
    expect(fire(page, watcherVm(todayFlag), []).startDashboardCaching).not.toHaveBeenCalled();
    expect(fire(page, watcherVm(todayFlag), null).startDashboardCaching).not.toHaveBeenCalled();
  });

  it('still publishes the task list to the global store', () => {
    const vm = fire(page, watcherVm(todayFlag), TASKLIST);
    expect(vm.$currentTask.setTasklist).toHaveBeenCalledWith(TASKLIST);
  });
});
