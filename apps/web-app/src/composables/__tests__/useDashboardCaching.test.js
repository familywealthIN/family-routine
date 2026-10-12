/* eslint-env jest */
/**
 * Area/project context: the daily sweep and the on-demand path.
 *
 * Both write the same `DASHBOARD_CACHE:<tag>` entry with the same 24h TTL, and
 * both go through one in-flight registry — a context run is three network calls
 * and two of them hit a model, so a duplicate is real money. The on-demand path
 * exists because the sweep only covers routines opted into AI Search, which left
 * the routine thread's "Before you start" card missing for most tagged routines
 * (docs/redesign/STATUS.md gap 16).
 */
const moment = require('moment');
const { CACHE_KEY_PREFIX } = require('@routine-notes/ui/utils/dashboardCache');

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Module state (the registry, the attempted set) is per-session; reset it. */
const load = () => {
  let mod;
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require
    mod = require('../useDashboardCaching');
  });
  return mod;
};

const opName = (query) => {
  const def = (query.definitions || []).find((d) => d.kind === 'OperationDefinition');
  return (def && def.name && def.name.value) || '';
};

const GOALS = [
  // Newest first is NOT the input order — the derivation sorts.
  {
    date: '09-09-2026',
    period: 'day',
    goalItems: [{ body: 'Rest day', isComplete: false }],
  },
  {
    date: '11-09-2026',
    period: 'day',
    goalItems: [
      { body: '3.1 km', isComplete: true },
      { body: 'Stretch', isComplete: false },
    ],
  },
  {
    date: '10-09-2026',
    period: 'day',
    goalItems: [{ body: 'Missed · meeting ran over', isComplete: false }],
  },
  { date: '11-09-2026', period: 'week', goalItems: [{ body: 'Run 20 km', isComplete: false }] },
];

/**
 * A component stub the composable can run against. `fail` names the operation
 * that should reject; `gate` holds `goalsByTag` open so a second caller can be
 * caught mid-run.
 */
const makeVm = ({
  goals = GOALS,
  description = 'About 3 km every lunch break toward Walk 1,000 km.',
  nextSteps = 'Try the river loop\n\nLog shoe mileage',
  fail = null,
  gate = false,
  areaTags = [],
  projectTags = [],
} = {}) => {
  const calls = [];
  const gates = [];
  const data = {
    goalsByTag: () => ({ goalsByTag: goals }),
    GetGoalsSummary: () => ({ getGoalsSummary: { description } }),
    GetGoalsNextSteps: () => ({ getGoalsNextSteps: { nextSteps } }),
    areaTags: () => ({ areaTags }),
    projectTags: () => ({ projectTags }),
  };

  const vm = {
    $apollo: {
      query: (options) => {
        const name = opName(options.query);
        calls.push({ name, variables: options.variables });
        if (fail === name) return Promise.reject(new Error('offline'));
        const reply = { data: data[name]() };
        if (gate && name === 'goalsByTag') {
          return new Promise((resolve) => gates.push(() => resolve(reply)));
        }
        return Promise.resolve(reply);
      },
    },
  };

  return {
    vm,
    calls,
    openGates: () => gates.splice(0).forEach((open) => open()),
    countOf: (name) => calls.filter((c) => c.name === name).length,
  };
};

const stored = (tag) => {
  const raw = localStorage.getItem(CACHE_KEY_PREFIX + tag);
  return raw ? JSON.parse(raw) : null;
};

const seed = (tag, entry, age = 0) => localStorage.setItem(
  CACHE_KEY_PREFIX + tag,
  JSON.stringify({
    description: 'cached', nextSteps: 'cached step', activity: [], ...entry, timestamp: Date.now() - age,
  }),
);

beforeEach(() => {
  localStorage.clear();
});

describe('ensureTagContext', () => {
  it('builds a tag on demand into the same store the sweep writes', async () => {
    const { ensureTagContext } = load();
    const api = makeVm();

    await expect(ensureTagContext(api.vm, 'area:health:fitness')).resolves.toBe(true);

    const entry = stored('area:health:fitness');
    expect(entry.description).toBe('About 3 km every lunch break toward Walk 1,000 km.');
    expect(entry.nextSteps).toBe('Try the river loop\n\nLog shoe mileage');
    expect(typeof entry.timestamp).toBe('number');
    expect(api.calls.map((c) => c.name).sort())
      .toEqual(['GetGoalsNextSteps', 'GetGoalsSummary', 'goalsByTag']);
    expect(api.calls[0].variables).toEqual({ tag: 'area:health:fitness' });
  });

  // PAST ACTIVITY is derived from the same goalsByTag response the model input
  // comes from — one pass, three newest day-items, newest first.
  it('derives PAST ACTIVITY as the three newest day items', async () => {
    const { ensureTagContext } = load();
    const api = makeVm();

    await ensureTagContext(api.vm, 'area:health:fitness');

    expect(stored('area:health:fitness').activity).toEqual([
      { date: 'Fri', text: '3.1 km', done: true },
      { date: 'Fri', text: 'Stretch', done: false },
      { date: 'Thu', text: 'Missed · meeting ran over', done: false },
    ]);
  });

  // D-06: `goalsByTag` returns the whole tag, future days included, and an
  // unticked FUTURE goal carries `isComplete: false` exactly like a missed one.
  // Listing it under PAST ACTIVITY painted work the user had not reached yet
  // with the missed icon, so planning a week ahead read as a week of failure.
  it('leaves future-dated goals out of PAST ACTIVITY', async () => {
    const { ensureTagContext } = load();
    // Built relative to the clock so the case cannot rot into the past.
    const day = (offset) => moment().add(offset, 'days').format('DD-MM-YYYY');
    const api = makeVm({
      goals: [
        { date: day(-1), period: 'day', goalItems: [{ body: 'Yesterday ran', isComplete: true }] },
        { date: day(2), period: 'day', goalItems: [{ body: 'Planned long run', isComplete: false }] },
        { date: day(5), period: 'day', goalItems: [{ body: 'Planned rest', isComplete: false }] },
      ],
    });

    await ensureTagContext(api.vm, 'area:health:fitness');

    expect(stored('area:health:fitness').activity)
      .toEqual([{ date: moment().add(-1, 'days').format('ddd'), text: 'Yesterday ran', done: true }]);
  });

  // Today is not past either — the brief is read before the day's work is done,
  // so today's own items would all show as missed.
  it('leaves today out of PAST ACTIVITY', async () => {
    const { ensureTagContext } = load();
    const api = makeVm({
      goals: [{
        date: moment().format('DD-MM-YYYY'),
        period: 'day',
        goalItems: [{ body: "Today's run", isComplete: false }],
      }],
    });

    await ensureTagContext(api.vm, 'area:health:fitness');

    expect(stored('area:health:fitness').activity).toEqual([]);
  });

  it('asks once for a tag, however many routines carry it', async () => {
    const { ensureTagContext } = load();
    const api = makeVm({ gate: true });

    // Two routines sharing `area:health` focused one after the other, the
    // second before the first's run has come back.
    const first = ensureTagContext(api.vm, 'area:health');
    const second = ensureTagContext(api.vm, 'area:health');
    expect(api.countOf('goalsByTag')).toBe(1);

    api.openGates();
    await Promise.all([first, second]);
    expect(api.countOf('goalsByTag')).toBe(1);

    // And a third focus after it settled is served by the TTL.
    await ensureTagContext(api.vm, 'area:health');
    expect(api.countOf('goalsByTag')).toBe(1);
  });

  it('does not refetch inside the 24h TTL', async () => {
    const { ensureTagContext } = load();
    seed('area:work', { description: 'Mornings for the hardest thing.' });
    const api = makeVm();

    await expect(ensureTagContext(api.vm, 'area:work')).resolves.toBe(true);

    expect(api.calls).toHaveLength(0);
    expect(stored('area:work').description).toBe('Mornings for the hardest thing.');
  });

  it('does fetch once the entry has aged past the TTL', async () => {
    const { ensureTagContext } = load();
    seed('area:work', { description: 'stale' }, 25 * 60 * 60 * 1000);
    const api = makeVm();

    await ensureTagContext(api.vm, 'area:work');

    expect(api.countOf('goalsByTag')).toBe(1);
    expect(stored('area:work').description)
      .toBe('About 3 km every lunch break toward Walk 1,000 km.');
  });

  // The thread must be left exactly as it was: nothing cached, so no block,
  // and a resolved promise so the caller has no error to surface.
  it('resolves false and writes nothing when the fetch fails', async () => {
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { ensureTagContext } = load();
    const api = makeVm({ fail: 'goalsByTag' });

    await expect(ensureTagContext(api.vm, 'area:work')).resolves.toBe(false);

    expect(stored('area:work')).toBeNull();
    logged.mockRestore();
  });

  it('resolves false when only the model call fails', async () => {
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { ensureTagContext } = load();
    const api = makeVm({ fail: 'GetGoalsNextSteps' });

    await expect(ensureTagContext(api.vm, 'area:work')).resolves.toBe(false);

    expect(stored('area:work')).toBeNull();
    logged.mockRestore();
  });

  // It fires on every focus change, so "once" has to mean once — a reload gets
  // a fresh attempt, a routine switch does not.
  it('does not retry a failed tag for the rest of the session', async () => {
    const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { ensureTagContext } = load();
    const api = makeVm({ fail: 'goalsByTag' });

    await ensureTagContext(api.vm, 'area:work');
    await ensureTagContext(api.vm, 'area:work');
    await ensureTagContext(api.vm, 'area:work');

    expect(api.countOf('goalsByTag')).toBe(1);
    logged.mockRestore();
  });

  it('caches an empty entry for a tag with no goals rather than retrying it', async () => {
    const { ensureTagContext } = load();
    const api = makeVm({ goals: [] });

    await expect(ensureTagContext(api.vm, 'area:new')).resolves.toBe(true);

    expect(stored('area:new')).toEqual(expect.objectContaining({
      description: '', nextSteps: '', activity: [],
    }));
    // No model call for a tag with nothing to summarise.
    expect(api.countOf('GetGoalsSummary')).toBe(0);
  });

  it('refuses anything that is not an area or project tag', async () => {
    const { ensureTagContext } = load();
    const api = makeVm();

    await expect(ensureTagContext(api.vm, 'context:home')).resolves.toBe(false);
    await expect(ensureTagContext(api.vm, '')).resolves.toBe(false);
    await expect(ensureTagContext(api.vm, null)).resolves.toBe(false);

    expect(api.calls).toHaveLength(0);
  });
});

describe('initDashboardCaching — the daily sweep, unchanged', () => {
  it('builds every tag it is handed, sequentially', async () => {
    const { initDashboardCaching } = load();
    const api = makeVm();

    await initDashboardCaching(api.vm, { tags: ['area:work', 'project:dashboard', 'context:home'] });

    // The non-area/project tag is dropped as before.
    expect(api.calls.filter((c) => c.name === 'goalsByTag').map((c) => c.variables.tag))
      .toEqual(['area:work', 'project:dashboard']);
    expect(stored('area:work').nextSteps).toBe('Try the river loop\n\nLog shoe mileage');
    expect(stored('project:dashboard').description)
      .toBe('About 3 km every lunch break toward Walk 1,000 km.');
    expect(stored('context:home')).toBeNull();
  });

  it('skips a tag that is still inside its TTL', async () => {
    const { initDashboardCaching } = load();
    seed('area:work', {});
    const api = makeVm();

    await initDashboardCaching(api.vm, { tags: ['area:work', 'project:dashboard'] });

    expect(api.calls.filter((c) => c.name === 'goalsByTag').map((c) => c.variables.tag))
      .toEqual(['project:dashboard']);
  });

  it('falls back to the server tag lists when given no explicit tags', async () => {
    const { initDashboardCaching } = load();
    const api = makeVm({ areaTags: ['area:work'], projectTags: ['project:dashboard'] });

    await initDashboardCaching(api.vm);

    expect(api.countOf('areaTags')).toBe(1);
    expect(api.countOf('projectTags')).toBe(1);
    expect(api.countOf('goalsByTag')).toBe(2);
  });

  // The whole point of one shared registry: a focus landing on a tag the sweep
  // is already mid-run on joins that run instead of paying for a second one.
  it('shares one run with an on-demand focus on the same tag', async () => {
    const { initDashboardCaching, ensureTagContext } = load();
    const api = makeVm({ gate: true });

    const sweep = initDashboardCaching(api.vm, { tags: ['area:work'] });
    await flush();
    expect(api.countOf('goalsByTag')).toBe(1);

    const lazy = ensureTagContext(api.vm, 'area:work');
    api.openGates();
    await Promise.all([sweep, lazy]);

    expect(api.countOf('goalsByTag')).toBe(1);
    await expect(lazy).resolves.toBe(true);
  });
});
