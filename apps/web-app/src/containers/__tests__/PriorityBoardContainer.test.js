/* eslint-env jest */
/**
 * Contract tests for PriorityBoardContainer.
 *
 * It owns ONE organism and ONE operation, derives the board from them and emits
 * the summary the page's header + drawer need. The interesting rules are: the
 * query is `cache-and-network` (principle #4), the AUTOMATE chip's "already a
 * routine task" is read off the real tasklist rather than a client flag, and the
 * skeleton signal is "there is no data" — never "a query is loading"
 * (principle #7, the skeleton-is-a-disable-flag note).
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Container = require('../PriorityBoardContainer.vue').default;

const { computed } = Container;
const call = (name, ctx) => computed[name].call(ctx);

const TASKLIST = [
  {
    id: 'sw', name: 'Start Work', time: '09:00', ticked: true,
  },
  {
    id: 'wd', name: 'Wind Down', time: '21:30', ticked: false,
  },
];

const ctx = (over = {}) => ({
  date: '12-09-2026',
  agentStatuses: {},
  now: null,
  skipped: [],
  priorityBoard: { goals: [], routine: { tasklist: TASKLIST } },
  goals: [],
  tasklist: TASKLIST,
  routineNames: {},
  board: {
    quadrants: [], triage: [], openTotal: 0, rows: [],
  },
  yearAverage: 0,
  ...over,
});

describe('PriorityBoardContainer contract', () => {
  it('mounts exactly one organism (plus the shared D-10 error state)', () => {
    expect(Object.keys(Container.components)).toEqual(['PriorityBoard', 'LoadErrorState']);
  });

  it('owns exactly one operation, read cache-and-network', () => {
    expect(Object.keys(Container.apollo)).toEqual(['priorityBoard']);
    expect(Container.apollo.priorityBoard.fetchPolicy).toBe('cache-and-network');
  });

  it('skips the read until there is a session and a date', () => {
    const { skip } = Container.apollo.priorityBoard;
    expect(skip.call({ $root: { $data: {} }, date: '12-09-2026' })).toBe(true);
    expect(skip.call({ $root: { $data: { email: 'a@b.c' } }, date: '' })).toBe(true);
    expect(skip.call({ $root: { $data: { email: 'a@b.c' } }, date: '12-09-2026' })).toBe(false);
  });

  it('varies only by date, so the cache entry is stable', () => {
    expect(Container.apollo.priorityBoard.variables.call({ date: '12-09-2026' }))
      .toEqual({ date: '12-09-2026' });
  });

  it('keeps both root fields of the one payload', () => {
    const { update } = Container.apollo.priorityBoard;
    const out = update.call({}, {
      optimizedDailyGoals: [{ id: 'g1' }],
      routineDate: { id: 'r1', tasklist: TASKLIST },
    });
    expect(out.goals).toHaveLength(1);
    expect(out.routine.id).toBe('r1');
  });

  it('survives a null payload', () => {
    const out = Container.apollo.priorityBoard.update.call({}, null);
    expect(out).toEqual({ goals: [], routine: null });
  });
});

describe('PriorityBoardContainer derivations', () => {
  // The chip says "Routine task" because a routine task with that name exists —
  // `routineDate` re-syncs the day's tasklist from routineItems on every read.
  it('indexes routine names case- and space-insensitively', () => {
    const names = call('routineNames', ctx());
    expect(names['start work']).toBe(true);
    expect(call('routineNames', ctx({ tasklist: [{ id: 'x', name: '  Water Plants ' }] })))
      .toEqual({ 'water plants': true });
  });

  it('ignores a task with no name', () => {
    expect(call('routineNames', ctx({ tasklist: [{ id: 'x' }] }))).toEqual({});
  });

  it('averages the year goals for the Goals nav ring', () => {
    const goals = [
      { id: 'y', period: 'year', goalItems: [{ id: 'a', progress: 83 }, { id: 'b', progress: 17 }] },
      { id: 'd', period: 'day', goalItems: [{ id: 'c', progress: 100 }] },
    ];
    expect(call('yearAverage', ctx({ goals }))).toBe(50);
  });

  it('is a zero ring with no year goals at all', () => {
    expect(call('yearAverage', ctx({ goals: [] }))).toBe(0);
  });

  it('counts ticked routines toward the day streak', () => {
    const three = [...TASKLIST, { id: 'a', name: 'A', ticked: true }, { id: 'b', name: 'B', ticked: true }];
    expect(call('summary', ctx()).streakDays).toBe(0);
    expect(call('summary', ctx({ tasklist: three })).streakDays).toBe(1);
  });

  // "hasData" must never be derived from `loading`: with cache-and-network,
  // loading stays true while cached data is already on screen.
  it('reports data from the payload, not from a loading flag', () => {
    expect(call('summary', ctx({ goals: [], tasklist: [] })).hasData).toBe(false);
    expect(call('summary', ctx({ goals: [], tasklist: TASKLIST })).hasData).toBe(true);
    expect(call('summary', ctx({ goals: [{ id: 'g' }], tasklist: [] })).hasData).toBe(true);
  });

  it('passes the open and triage counts the header reads', () => {
    const summary = call('summary', ctx({
      board: {
        quadrants: [], triage: [{ id: 'x1' }, { id: 'x2' }], openTotal: 7, rows: [],
      },
    }));
    expect(summary).toMatchObject({ openTotal: 7, triageCount: 2 });
  });
});

describe('PriorityBoardContainer load + error states (D-10)', () => {
  const { apollo: { priorityBoard: hooks }, methods } = Container;

  // Loading must never paint "Inbox clear / 0 open / Nothing here".
  it('is not loaded until a payload lands, whatever the lists hold', () => {
    expect(call('loaded', { priorityBoard: null })).toBe(false);
    expect(call('loaded', { priorityBoard: { goals: [], routine: null } })).toBe(true);
  });

  it('shows the error state only for a failed read with nothing to show', () => {
    expect(call('loadError', { readFailed: true, loaded: false })).toBe(true);
    expect(call('loadError', { readFailed: true, loaded: true })).toBe(false);
    expect(call('loadError', { readFailed: false, loaded: false })).toBe(false);
  });

  it('flags a failed read and still emits load-error', () => {
    const emitted = [];
    const vm = { readFailed: false, $emit: (...args) => emitted.push(args) };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    hooks.error.call(vm, new Error('Failed to fetch'));
    spy.mockRestore();
    expect(vm.readFailed).toBe(true);
    expect(emitted[0][0]).toBe('load-error');
  });

  it('clears the failure once a result with data arrives, not before', () => {
    const vm = { readFailed: true };
    hooks.result.call(vm, { data: undefined });
    expect(vm.readFailed).toBe(true);
    hooks.result.call(vm, { data: { optimizedDailyGoals: [] } });
    expect(vm.readFailed).toBe(false);
  });

  it('tells the header whether it has read the board', () => {
    expect(call('summary', ctx({ loaded: false, loadError: true }))).toMatchObject({
      loaded: false, loadError: true,
    });
    expect(call('summary', ctx({ loaded: true, loadError: false })).loaded).toBe(true);
  });

  // Apollo 2 re-delivers a failed read's networkError on every cache broadcast,
  // so after one failure the board ignores writes until it re-fetches.
  it('re-fetches on recover() only when the last read failed', async () => {
    let refetches = 0;
    const vm = (readFailed) => ({
      readFailed,
      refetch: () => { refetches += 1; return Promise.reject(new Error('still down')); },
    });
    expect(methods.recover.call(vm(false))).toBeNull();
    expect(refetches).toBe(0);
    await expect(methods.recover.call(vm(true))).resolves.toBeNull();
    expect(refetches).toBe(1);
  });

  it('recovers when the browser comes back online', () => {
    const added = [];
    const spy = jest.spyOn(window, 'addEventListener')
      .mockImplementation((type, fn) => added.push([type, fn]));
    const vm = { recover: () => {} };
    Container.mounted.call(vm);
    spy.mockRestore();
    expect(added).toEqual([['online', vm.recover]]);
  });
});
