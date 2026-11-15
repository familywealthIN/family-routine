/* eslint-env jest */
import moment from 'moment';
import {
  ROUTINE_DATE_QUERY, DAILY_GOALS_QUERY, XP_BALANCE_QUERY,
} from '../../composables/graphql/queries';
import {
  startHomeSync, stopHomeSync, syncHome, RESUME_GAP_MS, INTERVAL_MS, RETRY_MS,
} from '../homeSync';
import { homeDay, homeXp, resetHomeSnapshotMemo } from '../../utils/homeSnapshot';
import { pendingMutations } from '../../utils/pendingMutations';

const ME = 'me@example.com';
const FORMAT = 'DD-MM-YYYY';

function fakeClient() {
  return {
    query: jest.fn(({ query, variables }) => {
      if (query === ROUTINE_DATE_QUERY) {
        return Promise.resolve({ data: { routineDate: { id: 'doc', date: variables.date, tasklist: [{ id: 'wake', time: '06:30' }] } } });
      }
      if (query === DAILY_GOALS_QUERY) {
        return Promise.resolve({ data: { optimizedDailyGoals: [{ id: `g-${variables.date}`, period: 'day', goalItems: [] }] } });
      }
      if (query === XP_BALANCE_QUERY) return Promise.resolve({ data: { xpBalance: { available: 42 } } });
      return Promise.reject(new Error('unexpected query'));
    }),
  };
}

const setVisibility = (state) => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

// Fake timers hold setTimeout; promise jobs still run, so drain those.
const flush = async () => {
  for (let i = 0; i < 30; i += 1) await Promise.resolve(); // eslint-disable-line no-await-in-loop
};

describe('homeSync', () => {
  let client;

  beforeEach(() => {
    localStorage.clear();
    resetHomeSnapshotMemo();
    pendingMutations.remove('routine:wake');
    client = fakeClient();
    jest.useFakeTimers('modern');
    jest.setSystemTime(moment('11-11-2026 08:00', `${FORMAT} HH:mm`).toDate());
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  afterEach(() => {
    stopHomeSync();
    jest.useRealTimers();
  });

  it("reads today's routine, goals and points from the network at start-up", async () => {
    await startHomeSync(client, { getEmail: () => ME });

    const calls = client.query.mock.calls.map(([opts]) => opts);
    expect(calls).toEqual(expect.arrayContaining([
      expect.objectContaining({ query: ROUTINE_DATE_QUERY, variables: { date: '11-11-2026' }, fetchPolicy: 'network-only' }),
      expect.objectContaining({ query: DAILY_GOALS_QUERY, variables: { date: '11-11-2026' }, fetchPolicy: 'network-only' }),
      expect.objectContaining({ query: XP_BALANCE_QUERY, fetchPolicy: 'network-only' }),
    ]));
    expect(homeDay(ME, '11-11-2026').routineDate.id).toBe('doc');
    expect(homeDay(ME, '11-11-2026').goals[0].id).toBe('g-11-11-2026');
    expect(homeXp(ME)).toEqual({ available: 42 });
  });

  // Home's own queries are the same documents, so Apollo folds them into these.
  it('uses the very query documents Home watches', () => {
    // eslint-disable-next-line global-require
    const page = require('fs').readFileSync(require.resolve('../../pages/RoutineFocus.vue'), 'utf8');
    expect(page).toMatch(/ROUTINE_DATE_QUERY,\s*\n\s*DAILY_GOALS_QUERY,\s*\n\s*XP_BALANCE_QUERY,[\s\S]*from '..\/composables\/graphql\/queries'/);
  });

  it('reads nothing while nobody is signed in', async () => {
    await startHomeSync(client, { getEmail: () => '' });
    expect(client.query).not.toHaveBeenCalled();
  });

  it('syncs again on coming back to the foreground, but not on every flicker', async () => {
    await startHomeSync(client, { getEmail: () => ME });
    client.query.mockClear();

    setVisibility('hidden');
    setVisibility('visible');
    await flush();
    expect(client.query).not.toHaveBeenCalled(); // inside RESUME_GAP_MS

    jest.advanceTimersByTime(RESUME_GAP_MS + 1);
    setVisibility('hidden');
    setVisibility('visible');
    await flush();
    expect(client.query).toHaveBeenCalledTimes(3);
  });

  it('syncs when the connection comes back', async () => {
    await startHomeSync(client, { getEmail: () => ME });
    client.query.mockClear();
    jest.advanceTimersByTime(RESUME_GAP_MS + 1);
    window.dispatchEvent(new Event('online'));
    await flush();
    expect(client.query).toHaveBeenCalled();
  });

  it('keeps syncing while the app is in view, and stops while it is hidden', async () => {
    await startHomeSync(client, { getEmail: () => ME });
    client.query.mockClear();

    jest.advanceTimersByTime(INTERVAL_MS);
    await flush();
    expect(client.query).toHaveBeenCalledTimes(3);

    client.query.mockClear();
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    jest.advanceTimersByTime(INTERVAL_MS);
    await flush();
    expect(client.query).not.toHaveBeenCalled();
  });

  it('never races a tap that is on the wire, and comes back once it settles', async () => {
    await startHomeSync(client, { getEmail: () => ME });
    client.query.mockClear();

    pendingMutations.add('routine:wake');
    await syncHome();
    expect(client.query).not.toHaveBeenCalled();

    pendingMutations.remove('routine:wake');
    jest.advanceTimersByTime(RETRY_MS);
    await flush();
    expect(client.query).toHaveBeenCalledTimes(3);
  });

  it('shares one run between callers', async () => {
    startHomeSync(client, { getEmail: () => ME });
    syncHome();
    syncHome();
    await flush();
    expect(client.query).toHaveBeenCalledTimes(3);
  });

  it("fetches tomorrow's goals in the evening, into the snapshot only", async () => {
    jest.setSystemTime(moment('11-11-2026 19:00', `${FORMAT} HH:mm`).toDate());
    await startHomeSync(client, { getEmail: () => ME });

    const tomorrow = client.query.mock.calls.map(([opts]) => opts)
      .find((opts) => opts.variables && opts.variables.date === '12-11-2026');
    expect(tomorrow).toMatchObject({ query: DAILY_GOALS_QUERY, fetchPolicy: 'no-cache' });
    expect(homeDay(ME, '12-11-2026').goals[0].id).toBe('g-12-11-2026');
    // Not tomorrow's routine: a read would create tomorrow's document now.
    const routineReads = client.query.mock.calls.filter(([opts]) => opts.query === ROUTINE_DATE_QUERY);
    routineReads.forEach(([opts]) => expect(opts.variables.date).toBe('11-11-2026'));
  });

  it('does not fetch tomorrow in the morning', async () => {
    await startHomeSync(client, { getEmail: () => ME });
    const dates = client.query.mock.calls.map(([opts]) => opts.variables && opts.variables.date);
    expect(dates).not.toContain('12-11-2026');
  });

  it('keeps going when the network fails', async () => {
    client.query.mockImplementation(() => Promise.reject(new Error('offline')));
    await expect(startHomeSync(client, { getEmail: () => ME })).resolves.toBe(true);
    expect(homeDay(ME, '11-11-2026')).toBeNull();
  });
});
