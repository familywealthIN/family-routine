/* eslint-env jest */
/**
 * The day's area/project AI context.
 *
 * This generation step used to live in DashBoard.vue alone. When the Routine
 * Focus home screen took over `/home` and the dashboard moved to
 * `/home/classic`, nothing on the screen users actually land on ran it, so the
 * 24h cache stayed empty and the AI Search Modal's "Build on Next Steps" toggle
 * was permanently disabled. Both pages now share this mixin — these tests cover
 * which tags it picks, when it declines to run, and that two watcher fires
 * cannot double up the LLM round-trips.
 */
const { initDashboardCaching } = require('../../composables/useDashboardCaching');
const { readAiSearchSettings } = require('../../utils/aiSearchSettings');

jest.mock('../../composables/useDashboardCaching', () => ({
  initDashboardCaching: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../utils/aiSearchSettings', () => ({
  readAiSearchSettings: jest.fn(),
}));

const OFF = { aiEnhancedTask: false, associateParentGoal: false };

// Settings are per-routine localStorage, so drive them off the routine id.
const settingsFor = (byId) => (id) => byId[id] || OFF;

const load = () => {
  let mixin;
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require
    mixin = require('../dashboardContextMixin').dashboardContextMixin;
  });
  return mixin;
};

const vmWith = (overrides = {}) => ({
  $root: { $data: { email: 'user@example.com' } },
  tasklist: [],
  ...overrides,
});

// `this` for the mixin's methods: the real method bodies on a fake component,
// bound as Vue would bind them so startDashboardCaching can reach its sibling.
const hostFor = (mixin, overrides) => {
  const vm = vmWith(overrides);
  Object.keys(mixin.methods).forEach((name) => {
    vm[name] = mixin.methods[name].bind(vm);
  });
  return {
    vm,
    tags: () => vm.getAiEnabledRoutineTags(),
    start: () => vm.startDashboardCaching(),
  };
};

describe('getAiEnabledRoutineTags', () => {
  let mixin;

  beforeEach(() => {
    jest.clearAllMocks();
    mixin = load();
  });

  it('takes area and project tags from AI-enabled routines only', () => {
    readAiSearchSettings.mockImplementation(settingsFor({
      sw: { aiEnhancedTask: true, associateParentGoal: false },
      wd: { aiEnhancedTask: false, associateParentGoal: true },
    }));

    const host = hostFor(mixin, {
      tasklist: [
        { id: 'sw', tags: ['area:work', 'priority:high'] },
        { id: 'wd', tags: ['project:beta-launch'] },
        // Opted out — its tags must not generate context.
        { id: 'mp', tags: ['area:health'] },
      ],
    });

    expect(host.tags()).toEqual(['area:work', 'project:beta-launch']);
  });

  it('drops tags that are neither an area nor a project', () => {
    readAiSearchSettings.mockReturnValue({ aiEnhancedTask: true, associateParentGoal: false });

    const host = hostFor(mixin, {
      tasklist: [{ id: 'sw', tags: ['category:admin', 'type:deep'] }],
    });

    expect(host.tags()).toEqual([]);
  });

  it('reports the same tag once however many routines carry it', () => {
    readAiSearchSettings.mockReturnValue({ aiEnhancedTask: true, associateParentGoal: false });

    const host = hostFor(mixin, {
      tasklist: [
        { id: 'sw', tags: ['area:work'] },
        { id: 'wd', tags: ['area:work'] },
      ],
    });

    expect(host.tags()).toEqual(['area:work']);
  });

  // The global store is the authority once it has been populated; `tasklist` is
  // the fallback for the first watcher fire, before the store is written.
  it('prefers the global task list when it holds routines', () => {
    readAiSearchSettings.mockReturnValue({ aiEnhancedTask: true, associateParentGoal: false });

    const host = hostFor(mixin, {
      $currentTaskList: [{ id: 'sw', tags: ['area:work'] }],
      tasklist: [{ id: 'wd', tags: ['area:stale'] }],
    });

    expect(host.tags()).toEqual(['area:work']);
  });

  it('falls back to the page tasklist when the global store is empty', () => {
    readAiSearchSettings.mockReturnValue({ aiEnhancedTask: true, associateParentGoal: false });

    const host = hostFor(mixin, {
      $currentTaskList: [],
      tasklist: [{ id: 'wd', tags: ['area:health'] }],
    });

    expect(host.tags()).toEqual(['area:health']);
  });

  it('has nothing to offer before the routine loads', () => {
    expect(hostFor(mixin, { tasklist: [] }).tags()).toEqual([]);
    expect(hostFor(mixin, { tasklist: null }).tags()).toEqual([]);
  });

  it('survives a routine with no tags array', () => {
    readAiSearchSettings.mockReturnValue({ aiEnhancedTask: true, associateParentGoal: false });

    const host = hostFor(mixin, { tasklist: [{ id: 'sw' }] });

    expect(host.tags()).toEqual([]);
  });
});

describe('startDashboardCaching', () => {
  let mixin;

  beforeEach(() => {
    jest.clearAllMocks();
    initDashboardCaching.mockImplementation(() => Promise.resolve());
    readAiSearchSettings.mockReturnValue({ aiEnhancedTask: true, associateParentGoal: false });
    mixin = load();
  });

  it('generates context for the AI-enabled tags', () => {
    const host = hostFor(mixin, { tasklist: [{ id: 'sw', tags: ['area:work'] }] });

    host.start();

    expect(initDashboardCaching).toHaveBeenCalledTimes(1);
    expect(initDashboardCaching).toHaveBeenCalledWith(host.vm, { tags: ['area:work'] });
  });

  it('waits for a signed-in user', () => {
    const host = hostFor(mixin, {
      $root: { $data: {} },
      tasklist: [{ id: 'sw', tags: ['area:work'] }],
    });

    host.start();

    expect(initDashboardCaching).not.toHaveBeenCalled();
  });

  it('stays quiet when no routine opts into AI Search', () => {
    readAiSearchSettings.mockReturnValue(OFF);
    const host = hostFor(mixin, { tasklist: [{ id: 'sw', tags: ['area:work'] }] });

    host.start();

    expect(initDashboardCaching).not.toHaveBeenCalled();
  });

  // The tasklist watcher re-fires on every Apollo cache write and a run costs
  // one LLM round-trip per tag, so a second fire must not start a second run.
  it('does not start a second run while one is in flight', async () => {
    let release;
    initDashboardCaching.mockImplementation(() => new Promise((resolve) => {
      release = resolve;
    }));

    const host = hostFor(mixin, { tasklist: [{ id: 'sw', tags: ['area:work'] }] });

    host.start();
    host.start();
    host.start();
    expect(initDashboardCaching).toHaveBeenCalledTimes(1);

    release();
    await Promise.resolve();
    await Promise.resolve();

    // A new day, or a newly tagged routine, still gets its run.
    initDashboardCaching.mockImplementation(() => Promise.resolve());
    host.start();
    expect(initDashboardCaching).toHaveBeenCalledTimes(2);
  });

  it('reports a failed run and frees the guard for the next attempt', async () => {
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    initDashboardCaching.mockImplementationOnce(() => Promise.reject(new Error('offline')));

    const host = hostFor(mixin, { tasklist: [{ id: 'sw', tags: ['area:work'] }] });

    host.start();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(logged).toHaveBeenCalled();

    host.start();
    expect(initDashboardCaching).toHaveBeenCalledTimes(2);

    logged.mockRestore();
  });
});
