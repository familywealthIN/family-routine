/* eslint-env jest */
/**
 * Home draws at once on every open: from the server's data when it has it,
 * else from what this device last saw (utils/homeSnapshot.js), else — a day
 * never read here, like the first open of a day — from the routine template.
 * And it never acts on that placeholder: taps wait for the server's day.
 *
 * Measured before: 12.4s to the first routine card on a first open of the day
 * (routineDate → null → addRoutine → routineDate, each on a cold server).
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const Vue = require('vue');
const moment = require('moment');
const RoutineFocus = require('../RoutineFocus.vue').default;
const { saveHomeDay, resetHomeSnapshotMemo } = require('../../utils/homeSnapshot');
const { pendingMutations } = require('../../utils/pendingMutations');

const { computed, methods } = RoutineFocus;

const ME = 'me@example.com';
const TODAY = '11-11-2026';
const at = (hhmm) => moment(`${TODAY} ${hhmm}`, 'DD-MM-YYYY HH:mm');

const task = (over) => ({
  __typename: 'RoutineItem',
  id: 'wake',
  name: 'Wake Up',
  time: '06:30',
  points: 15,
  ticked: false,
  passed: false,
  wait: false,
  redeemed: false,
  passedPoints: 0,
  stimuli: [{
    __typename: 'StimuliItem', name: 'D', splitRate: 15, earned: 0,
  }],
  ...over,
});
const routine = (date, tasks) => ({
  __typename: 'Routine', id: `doc-${date}`, date, skip: false, tasklist: tasks,
});

/** A vm with the page's computed properties wired up lazily, like Vue's. */
function vm(over = {}) {
  const ctx = {
    userEmail: ME,
    date: TODAY,
    todayDate: TODAY,
    now: at('09:00'),
    routineDate: undefined,
    goals: undefined,
    goalsDate: '',
    xpBalance: undefined,
    localTicks: {},
    ...over,
  };
  ['isToday', 'liveRoutine', 'placeholderRoutine', 'dayRoutine', 'showingPlaceholder',
    'homeGoals', 'homeXpBalance', 'tasklist'].forEach((name) => {
    if (Object.prototype.hasOwnProperty.call(over, name)) return;
    Object.defineProperty(ctx, name, { get: () => computed[name].call(ctx), configurable: true });
  });
  return ctx;
}

beforeEach(() => {
  localStorage.clear();
  resetHomeSnapshotMemo();
});

describe('what Home draws before the server answers', () => {
  it('draws the day this device last read, at once', () => {
    saveHomeDay(ME, TODAY, { routineDate: routine(TODAY, [task({ ticked: true })]) });
    const page = vm();
    expect(page.showingPlaceholder).toBe(true);
    expect(page.tasklist.map((t) => [t.id, t.ticked])).toEqual([['wake', true]]);
  });

  it('brings that day up to the clock, as the pass/wait sweep is about to', () => {
    saveHomeDay(ME, TODAY, { routineDate: routine(TODAY, [task({ time: '07:00', wait: true })]) });
    const [wake] = vm({ now: at('09:00') }).tasklist;
    expect(wake).toMatchObject({ passed: true, wait: false });
  });

  it('draws a day never read here from the routine template, started clean', () => {
    // Yesterday was read; today has not been.
    saveHomeDay(ME, '10-11-2026', { routineDate: routine('10-11-2026', [task({ ticked: true, redeemed: true })]) });
    const page = vm();
    expect(page.showingPlaceholder).toBe(true);
    const [wake] = page.tasklist;
    expect(wake).toMatchObject({
      id: 'wake', ticked: false, redeemed: false, passed: true,
    });
    expect(page.dayRoutine.id).toBe('');
  });

  it('draws nothing it would have to invent for a past day', () => {
    saveHomeDay(ME, '10-11-2026', { routineDate: routine('10-11-2026', [task()]) });
    const page = vm({ date: '05-11-2026' });
    expect(page.placeholderRoutine).toBeNull();
    expect(page.tasklist).toEqual([]);
  });

  it('draws nothing of another account', () => {
    saveHomeDay('someone@else.com', TODAY, { routineDate: routine(TODAY, [task()]) });
    expect(vm().tasklist).toEqual([]);
  });

  it("gives way to the server's day the moment it arrives", () => {
    saveHomeDay(ME, TODAY, { routineDate: routine(TODAY, [task({ name: 'Old name' })]) });
    const page = vm({ routineDate: routine(TODAY, [task({ name: 'Wake Up' })]) });
    expect(page.showingPlaceholder).toBe(false);
    expect(page.tasklist[0].name).toBe('Wake Up');
  });

  // Apollo keeps the previous date's routine while a new date loads.
  it("never draws one day's routine under another day's header", () => {
    const page = vm({ date: '12-11-2026', routineDate: routine(TODAY, [task({ ticked: true })]) });
    expect(page.liveRoutine).toBeNull();
  });

  it("draws the goals last seen for the day until the server's arrive", () => {
    const snapGoals = [{ id: 'g-snap', period: 'day', goalItems: [] }];
    saveHomeDay(ME, TODAY, { goals: snapGoals });
    expect(vm().homeGoals).toEqual(snapGoals);
    // Yesterday's list still in Apollo is not today's.
    expect(vm({ goals: [{ id: 'g-yesterday' }], goalsDate: '10-11-2026' }).homeGoals).toEqual(snapGoals);
    const live = [{ id: 'g-live', period: 'day', goalItems: [] }];
    expect(vm({ goals: live, goalsDate: TODAY }).homeGoals).toBe(live);
  });

  it('shows the last known points while the balance loads', () => {
    localStorage.clear();
    resetHomeSnapshotMemo();
    // eslint-disable-next-line global-require
    require('../../utils/homeSnapshot').saveHomeXp(ME, { available: 30 });
    expect(vm().homeXpBalance).toEqual({ available: 30 });
    expect(vm({ xpBalance: { available: 31 } }).homeXpBalance).toEqual({ available: 31 });
  });

  it('draws a routine ticked on the placeholder as ticked at once', () => {
    saveHomeDay(ME, TODAY, { routineDate: routine(TODAY, [task({ time: '09:00' })]) });
    const page = vm({ localTicks: { wake: true } });
    expect(page.tasklist[0].ticked).toBe(true);
  });
});

describe('the server answers into the snapshot', () => {
  it('remembers the routine, goals and points it was given', () => {
    const ctx = {
      userEmail: ME, date: TODAY, did: '', $routine: { setSkipDay: jest.fn() },
    };
    RoutineFocus.apollo.routineDate.update.call(ctx, { routineDate: routine(TODAY, [task()]) });
    RoutineFocus.apollo.goals.update.call(ctx, { optimizedDailyGoals: [{ id: 'g1' }] });
    RoutineFocus.apollo.xpBalance.update.call(ctx, { xpBalance: { available: 9 } });
    resetHomeSnapshotMemo();

    // eslint-disable-next-line global-require
    const snap = require('../../utils/homeSnapshot');
    expect(snap.homeDay(ME, TODAY).routineDate.id).toBe(`doc-${TODAY}`);
    expect(snap.homeDay(ME, TODAY).goals).toEqual([{ id: 'g1' }]);
    expect(snap.homeXp(ME)).toEqual({ available: 9 });
    expect(ctx.goalsDate).toBe(TODAY);
  });
});

describe('a tap on the placeholder', () => {
  const tickVm = (over = {}) => {
    const page = vm(over);
    Object.assign(page, {
      did: '',
      $set: Vue.set,
      $delete: Vue.delete,
      blockedBySkip: () => false,
      trackTaskEvent: jest.fn(),
      trackMutationPerformance: jest.fn(),
      measureFly: jest.fn(),
      clearFly: jest.fn(),
      onRoutineTicked: jest.fn(),
      notifyGeneric: jest.fn(),
      notifyRouteRefused: jest.fn(),
      redeemWhenSettled: jest.fn(),
      $notify: jest.fn(),
      settledTask: (id) => methods.settledTask.call(page, id),
      $apollo: {
        mutate: jest.fn(() => Promise.resolve({ data: { tickRoutineItem: { tasklist: [] } } })),
      },
    });
    page.localTicks = Vue.observable({});
    return page;
  };

  afterEach(() => {
    ['routine:wake'].forEach((k) => pendingMutations.remove(k));
  });

  it('turns green at once, then ticks the real document once it arrives', async () => {
    saveHomeDay(ME, TODAY, { routineDate: routine(TODAY, [task({ time: '08:45' })]) });
    const page = tickVm({ now: at('09:00') });
    let arrive;
    page.ensureRoutineId = () => new Promise((resolve) => { arrive = resolve; });

    const ticking = methods.tickRoutine.call(page, page.tasklist[0]);
    expect(page.localTicks.wake).toBe(true);
    expect(page.$apollo.mutate).not.toHaveBeenCalled();

    // The server's day arrives.
    page.routineDate = routine(TODAY, [task({ time: '08:45' })]);
    page.did = `doc-${TODAY}`;
    arrive(page.did);
    await ticking;

    expect(page.$apollo.mutate).toHaveBeenCalledTimes(1);
    expect(page.$apollo.mutate.mock.calls[0][0].variables).toEqual({ id: `doc-${TODAY}`, taskId: 'wake', ticked: true });
    expect(page.localTicks.wake).toBeUndefined();
  });

  it('sends nothing when the server says it was already ticked', async () => {
    saveHomeDay(ME, TODAY, { routineDate: routine(TODAY, [task({ time: '08:45' })]) });
    const page = tickVm({ now: at('09:00') });
    page.ensureRoutineId = () => {
      page.routineDate = routine(TODAY, [task({ time: '08:45', ticked: true })]);
      return Promise.resolve(`doc-${TODAY}`);
    };
    await methods.tickRoutine.call(page, page.tasklist[0]);
    expect(page.$apollo.mutate).not.toHaveBeenCalled();
    expect(page.localTicks.wake).toBeUndefined();
  });

  it('turns into a redeem when the window has gone by the time the day arrives', async () => {
    saveHomeDay(ME, TODAY, { routineDate: routine(TODAY, [task({ time: '08:45' })]) });
    const page = tickVm({ now: at('09:00') });
    page.ensureRoutineId = () => {
      page.routineDate = routine(TODAY, [task({ time: '08:00' })]); // moved earlier on another device
      return Promise.resolve(`doc-${TODAY}`);
    };
    await methods.tickRoutine.call(page, page.tasklist[0]);
    expect(page.$apollo.mutate).not.toHaveBeenCalled();
    expect(page.redeemWhenSettled).toHaveBeenCalledWith(expect.objectContaining({ id: 'wake', redeemable: true }), expect.anything());
  });

  it('redeem never goes out against the placeholder', () => {
    const page = tickVm();
    Object.defineProperty(page, 'showingPlaceholder', { value: true });
    methods.redeemRoutine.call(page, task({ passed: true }), {});
    expect(page.redeemWhenSettled).toHaveBeenCalled();
    expect(page.$apollo.mutate).not.toHaveBeenCalled();
  });
});

describe('a deep link while the placeholder shows', () => {
  it('only brings the routine into view; the action waits for the server', () => {
    const page = {
      $route: { params: { routineId: 'wake', action: 'complete' } },
      rows: [{ id: 'wake' }],
      showingPlaceholder: true,
      focusRoutineId: '',
      completeFromRoute: jest.fn(),
      $notify: jest.fn(),
      $router: { replace: jest.fn(() => Promise.resolve()) },
    };
    methods.maybeDispatchRouteAction.call(page);
    expect(page.focusRoutineId).toBe('wake');
    expect(page.completeFromRoute).not.toHaveBeenCalled();
    expect(page.$notify).not.toHaveBeenCalled();
  });

  it('never says a routine is missing from a guessed list', () => {
    const page = {
      $route: { params: { routineId: 'new-routine', action: 'focus' } },
      rows: [{ id: 'wake' }],
      showingPlaceholder: true,
      focusRoutineId: '',
      $notify: jest.fn(),
      $router: { replace: jest.fn(() => Promise.resolve()) },
    };
    methods.maybeDispatchRouteAction.call(page);
    expect(page.$notify).not.toHaveBeenCalled();
    expect(page.$router.replace).not.toHaveBeenCalled();
  });
});

describe('a redeem tapped on the placeholder', () => {
  const redeemVm = (live) => {
    const page = {
      ensureRoutineId: jest.fn(() => Promise.resolve('doc')),
      settledTask: jest.fn(() => ({ id: 'wake', name: 'Wake Up', redeemable: true })),
      untilServerTask: jest.fn(() => Promise.resolve(null)),
      rows: [live],
      redeemRoutine: jest.fn(),
      tickRoutine: jest.fn(),
      notifyRouteRefused: jest.fn(),
      $notify: jest.fn(),
    };
    return page;
  };

  it('redeems once the server has marked the routine passed', async () => {
    const page = redeemVm({ id: 'wake', name: 'Wake Up', redeemable: true });
    await methods.redeemWhenSettled.call(page, { id: 'wake' }, {});
    expect(page.redeemRoutine).toHaveBeenCalledWith(page.rows[0], {});
  });

  it('says so instead of going quiet when the server never got there', async () => {
    const page = redeemVm({
      id: 'wake', name: 'Wake Up', redeemable: false, ticked: false,
    });
    await methods.redeemWhenSettled.call(page, { id: 'wake' }, {});
    expect(page.redeemRoutine).not.toHaveBeenCalled();
    expect(page.$notify).toHaveBeenCalledWith(expect.objectContaining({ title: "Wake Up isn't ready to redeem yet" }));
  });

  it('waits once however often it is tapped, without pausing the app’s refreshes', async () => {
    const page = redeemVm({ id: 'wake', name: 'Wake Up', redeemable: true });
    await Promise.all([
      methods.redeemWhenSettled.call(page, { id: 'wake' }, {}),
      methods.redeemWhenSettled.call(page, { id: 'wake' }, {}),
    ]);
    expect(page.ensureRoutineId).toHaveBeenCalledTimes(1);
    expect(pendingMutations.empty()).toBe(true);
  });
});

describe('the checklist while another day loads', () => {
  const skeleton = (over) => computed.showGoalsSkeleton.call({
    $apollo: { queries: { goals: { loading: true } } },
    goalsFirstLoad: false,
    goalsDate: TODAY,
    date: TODAY,
    homeGoals: [],
    ...over,
  });

  it('shows its skeleton, not an empty list, until that day answers', () => {
    expect(skeleton({ date: '12-11-2026' })).toBe(true);
  });

  it('shows the day it has, and no skeleton once a day is drawn', () => {
    expect(skeleton({ date: '12-11-2026', homeGoals: [{ id: 'g' }] })).toBe(false);
    expect(skeleton({})).toBe(false);
  });
});
