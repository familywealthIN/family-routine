/* eslint-env jest */
/**
 * RoutineFocus push deep links (/home/:routineId/:action?src=push), exercised
 * against a minimal vm-like context (no mount), matching the page test
 * convention.
 *
 * A push button must do exactly what the same action does in the app. The
 * 26 Oct 2026 notifications run found three ways it did not: Start agent ticked
 * a routine with no goal item and then timed out waiting for one; Complete on
 * the first open of a day was consumed while the row still carried the
 * template's `wait`; and Complete on a missed routine ticked it for free
 * because `passed` had not landed yet.
 */
// Same stubs as routineFocusPage.test.js — the page pulls the ui barrels.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const moment = require('moment');

const RoutineFocus = require('../RoutineFocus.vue').default;
const { buildRoutineRows } = require('../../utils/routineFocusModel');

const { methods } = RoutineFocus;

// 10:00 on the day under test: 09:50 is open, 09:00 is 60 min past (missed),
// 12:00 is two hours ahead (still waiting).
const NOW = new Date(2026, 10, 8, 10, 0, 0);

const routine = (over = {}) => ({
  id: 'r1',
  name: 'Wake Up',
  time: '09:50',
  points: 16,
  ticked: false,
  passed: false,
  wait: false,
  redeemed: false,
  stimuli: [{ name: 'D', splitRate: 16, earned: 0 }],
  ...over,
});

const rowsFor = (tasklist, itemsByTask = {}) => buildRoutineRows(tasklist, {
  now: moment(), itemsByTask, isToday: true, isPastDay: false,
});

const vmFor = (tasklist, { action = 'complete', itemsByTask = {}, over = {} } = {}) => {
  const vm = {
    $route: { params: { routineId: 'r1', action }, query: { src: 'push' } },
    $router: { replace: jest.fn(() => Promise.resolve()) },
    $notify: jest.fn(),
    $agent: { fireStartEventIfPresent: jest.fn() },
    rows: rowsFor(tasklist, itemsByTask),
    canMaintainPassWait: true,
    goalsFirstLoad: false,
    isSkippedDay: false,
    xpBalance: null,
    date: '08-11-2026',
    dispatchedRouteAction: '',
    routeSettleKey: '',
    routeSettleExpired: '',
    routeSettleTimer: null,
    focusRoutineId: '',
    actionSheetOpen: false,
    paywallDrawerOpen: false,
    paywallCost: 0,
    tickRoutine: jest.fn(),
    redeemRoutine: jest.fn(),
    onBuildAgent: jest.fn(),
    onMiniClick: jest.fn(),
    findFirstGoalIdForRoutine: jest.fn(() => 'g1'),
    refuseAgentWithoutPoints: jest.fn(() => false),
    ...over,
  };
  [
    'maybeDispatchRouteAction', 'routeRowSettled', 'awaitRouteSettle', 'completeFromRoute',
    'startFromRoute', 'notifyRouteRefused', 'onRingAction', 'onStartAgent', 'blockedBySkip',
    'canAffordRedeem', 'getRedeemCost',
  ].forEach((name) => { vm[name] = methods[name].bind(vm); });
  // The page's `focusRow` follows `focusRoutineId` through the rows.
  Object.defineProperty(vm, 'focusRow', {
    get() { return this.rows.find((r) => r.id === this.focusRoutineId) || null; },
  });
  return vm;
};

/** What the rows watcher does when a pass/wait response lands. */
const land = (vm, tasklist, itemsByTask) => {
  Object.assign(vm, { rows: rowsFor(tasklist, itemsByTask) });
  vm.maybeDispatchRouteAction();
};

describe('RoutineFocus deep links', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('/start', () => {
    it('opens the Start sheet and ticks nothing when the routine has no open goal item', () => {
      const vm = vmFor([routine()], { action: 'start' });
      vm.maybeDispatchRouteAction();
      expect(vm.actionSheetOpen).toBe(true);
      expect(vm.focusRoutineId).toBe('r1');
      expect(vm.tickRoutine).not.toHaveBeenCalled();
      expect(vm.redeemRoutine).not.toHaveBeenCalled();
      expect(vm.$agent.fireStartEventIfPresent).not.toHaveBeenCalled();
    });

    // A completed item is nothing for the agent to work on.
    it('treats a routine whose only item is complete as having none', () => {
      const vm = vmFor([routine()], {
        action: 'start',
        itemsByTask: { r1: [{ id: 'g1', taskRef: 'r1', isComplete: true }] },
      });
      vm.maybeDispatchRouteAction();
      expect(vm.actionSheetOpen).toBe(true);
      expect(vm.tickRoutine).not.toHaveBeenCalled();
    });

    it("starts the agent exactly as the sheet's Start Agent does when an item is open", () => {
      const vm = vmFor([routine()], {
        action: 'start',
        itemsByTask: { r1: [{ id: 'g1', taskRef: 'r1', isComplete: false }] },
      });
      vm.maybeDispatchRouteAction();
      expect(vm.actionSheetOpen).toBe(false);
      expect(vm.tickRoutine).toHaveBeenCalledTimes(1);
      expect(vm.tickRoutine.mock.calls[0][0].id).toBe('r1');
      expect(vm.tickRoutine.mock.calls[0][1]).toEqual({ agentImplicit: false });
    });

    // Without the day's goal items a routine that HAS one reads as empty, and
    // the sheet would open in its place.
    it('waits for the goal items before deciding', () => {
      const items = { r1: [{ id: 'g1', taskRef: 'r1', isComplete: false }] };
      const vm = vmFor([routine()], { action: 'start', over: { goalsFirstLoad: true } });
      vm.maybeDispatchRouteAction();
      expect(vm.actionSheetOpen).toBe(false);
      expect(vm.tickRoutine).not.toHaveBeenCalled();

      vm.goalsFirstLoad = false;
      land(vm, [routine()], items);
      expect(vm.tickRoutine).toHaveBeenCalledTimes(1);
      expect(vm.actionSheetOpen).toBe(false);
    });

    it('sends a passed routine through the late check-in sheet, even with an item', () => {
      const vm = vmFor([routine({ time: '09:00', passed: true })], {
        action: 'start',
        itemsByTask: { r1: [{ id: 'g1', taskRef: 'r1', isComplete: false }] },
      });
      vm.maybeDispatchRouteAction();
      expect(vm.actionSheetOpen).toBe(true);
      expect(vm.tickRoutine).not.toHaveBeenCalled();
      expect(vm.redeemRoutine).not.toHaveBeenCalled();
    });
  });

  describe('/complete', () => {
    it('ticks exactly once, after the first open\'s wait flag clears', () => {
      // A new day's rows carry the template's `wait` until waitRoutineItem lands.
      const vm = vmFor([routine({ wait: true })]);
      vm.maybeDispatchRouteAction();
      vm.maybeDispatchRouteAction();
      expect(vm.tickRoutine).not.toHaveBeenCalled();
      expect(vm.dispatchedRouteAction).toBe('');

      land(vm, [routine({ wait: false })]);
      land(vm, [routine({ wait: false })]);
      expect(vm.tickRoutine).toHaveBeenCalledTimes(1);
      expect(vm.tickRoutine.mock.calls[0][0].id).toBe('r1');
      // Complete is Start Task: no agent start, and no agent warning on a
      // routine that has none.
      expect(vm.tickRoutine.mock.calls[0][1]).toEqual({ fireAgent: false });
    });

    it('waits for the routine document before deciding', () => {
      const vm = vmFor([routine()], { over: { canMaintainPassWait: false } });
      vm.maybeDispatchRouteAction();
      expect(vm.tickRoutine).not.toHaveBeenCalled();

      vm.canMaintainPassWait = true;
      land(vm, [routine()]);
      expect(vm.tickRoutine).toHaveBeenCalledTimes(1);
    });

    it('shows the late check-in sheet on a passed routine and never ticks it', () => {
      // 60 min past: the sweep has not stamped `passed` yet on the first rows.
      const vm = vmFor([routine({ time: '09:00' })]);
      vm.maybeDispatchRouteAction();
      expect(vm.tickRoutine).not.toHaveBeenCalled();
      expect(vm.actionSheetOpen).toBe(false);

      land(vm, [routine({ time: '09:00', passed: true })]);
      expect(vm.actionSheetOpen).toBe(true);
      expect(vm.tickRoutine).not.toHaveBeenCalled();
      expect(vm.redeemRoutine).not.toHaveBeenCalled();
    });

    it('shows the paywall rather than the sheet when the late check-in is unaffordable', () => {
      const vm = vmFor([routine({ time: '09:00', passed: true, passedPoints: 40 })], {
        over: { xpBalance: { available: 10, used: 0, entitled: false } },
      });
      vm.maybeDispatchRouteAction();
      expect(vm.paywallDrawerOpen).toBe(true);
      expect(vm.paywallCost).toBe(40);
      expect(vm.actionSheetOpen).toBe(false);
      expect(vm.tickRoutine).not.toHaveBeenCalled();
      expect(vm.redeemRoutine).not.toHaveBeenCalled();
    });

    it('says why when the routine has not opened yet', () => {
      const vm = vmFor([routine({ time: '12:00', wait: true })]);
      vm.maybeDispatchRouteAction();
      expect(vm.tickRoutine).not.toHaveBeenCalled();
      expect(vm.$notify).toHaveBeenCalledWith(expect.objectContaining({
        title: "Wake Up isn't open yet",
      }));
    });

    it('does nothing on a routine already ticked', () => {
      const vm = vmFor([routine({ ticked: true })]);
      vm.maybeDispatchRouteAction();
      expect(vm.tickRoutine).not.toHaveBeenCalled();
      expect(vm.$notify).not.toHaveBeenCalled();
    });

    it('explains, and does not tick, when the flags never settle', () => {
      const vm = vmFor([routine({ wait: true })]);
      vm.maybeDispatchRouteAction();
      jest.advanceTimersByTime(15000);
      expect(vm.tickRoutine).not.toHaveBeenCalled();
      expect(vm.$notify).toHaveBeenCalledWith(expect.objectContaining({
        title: "Couldn't open Wake Up",
        type: 'warning',
      }));
      // Consumed: a late landing does not tick behind the toast.
      land(vm, [routine({ wait: false })]);
      expect(vm.tickRoutine).not.toHaveBeenCalled();
    });
  });
});
