/* eslint-env jest */
/**
 * RoutineDayPlanContainer — the Routines screen's one read.
 *
 * What is locked:
 *   1. one operation, `cache-and-network` (ARCHITECTURE.md §2, §3.4),
 *   2. the list reaches the organism de-duped and schedule-ordered — a routine
 *      item's `_id` is reused across days, and a duplicate id is a duplicate
 *      `:key` (§3.6),
 *   3. the list is published to the page exactly ONCE per payload: the page needs
 *      it for the header and for the slot-change notice, and a double emit would
 *      make that notice fire twice,
 *   4. the agent chip reads the `$agent` store rather than a query of its own —
 *      the agent domain has one owner.
 */
jest.mock(
  '@routine-notes/ui/organisms/RoutineDayPlan/RoutineDayPlan.vue',
  () => ({ __esModule: true, default: { name: 'RoutineDayPlan', render() {} } }),
);

const Container = require('../RoutineDayPlanContainer.vue').default;
const { ROUTINE_SETTINGS_ITEMS_QUERY } = require('../../composables/graphql/routineSettingsQueries');

const { apollo, computed, methods } = Container;

const ITEMS = [
  { id: 'lw', name: 'Lunch Walk', time: '12:30' },
  { id: 'mp', name: 'Morning Pages', time: '06:30' },
  { id: 'sw', name: 'Start Work', time: '09:00' },
];

const ctx = (over = {}) => ({
  routineItems: ITEMS,
  $agent: { agents: [] },
  $emit: jest.fn(),
  ...over,
});

describe('the read', () => {
  it('owns exactly one operation, cache-and-network', () => {
    expect(Object.keys(apollo)).toEqual(['routineItems']);
    expect(apollo.routineItems.query).toBe(ROUTINE_SETTINGS_ITEMS_QUERY);
    expect(apollo.routineItems.fetchPolicy).toBe('cache-and-network');
  });

  it('never hands the organism an undefined list', () => {
    expect(apollo.routineItems.update(null)).toEqual([]);
    expect(apollo.routineItems.update({})).toEqual([]);
    expect(apollo.routineItems.update({ routineItems: ITEMS })).toBe(ITEMS);
  });

  it('sorts by start time before the organism sees it', () => {
    expect(computed.items.call(ctx()).map((r) => r.id)).toEqual(['mp', 'sw', 'lw']);
  });

  it('drops a repeated id', () => {
    const dupes = [ITEMS[1], { ...ITEMS[1] }, ITEMS[2]];
    expect(computed.items.call(ctx({ routineItems: dupes })).map((r) => r.id)).toEqual(['mp', 'sw']);
  });
});

describe('the agent chips', () => {
  it('maps routine id -> agent name off the store', () => {
    const c = ctx({
      $agent: {
        agents: [
          { id: 'a1', name: 'PR Summarizer', taskRef: 'sw' },
          { id: 'a2', name: '', taskRef: 'mp' },
          { id: 'a3', name: 'Orphan', taskRef: '' },
        ],
      },
    });
    expect(computed.agentNames.call(c)).toEqual({ sw: 'PR Summarizer' });
  });

  it('copes with no store at all', () => {
    expect(computed.agentNames.call(ctx({ $agent: null }))).toEqual({});
  });
});

describe('publishing to the page', () => {
  it('emits the list once, with the sorted shape', () => {
    const c = ctx();
    const list = computed.items.call(c);
    Container.watch.published.handler.call(c, list);
    expect(c.$emit).toHaveBeenCalledTimes(1);
    expect(c.$emit).toHaveBeenCalledWith('items', list);
  });

  it('publishes on mount too, so a cache hit is not missed', () => {
    expect(Container.watch.published.immediate).toBe(true);
  });

  // E2E BUG-5: an unloaded `[]` reached the page as "0 routines · 0 points" and
  // let New routine work the budget out against an empty day.
  it('publishes nothing until the first result has landed', () => {
    const c = ctx({ routineItems: [], loaded: false });
    c.items = computed.items.call(c);
    expect(computed.published.call(c)).toBe(null);
    Container.watch.published.handler.call(c, computed.published.call(c));
    expect(c.$emit).not.toHaveBeenCalled();
  });

  it('publishes the list itself once loaded', () => {
    const c = ctx({ loaded: true });
    c.items = computed.items.call(c);
    expect(computed.published.call(c)).toBe(c.items);
  });

  it('counts a result carrying the list as loaded — an empty one included', () => {
    const c = ctx({ loaded: false });
    apollo.routineItems.result.call(c, { data: {} });
    expect(c.loaded).toBe(false);
    apollo.routineItems.result.call(c, { data: { routineItems: [] } });
    expect(c.loaded).toBe(true);
  });

  it('falls back to loaded on a failed read rather than loading forever', () => {
    const c = ctx({ loaded: false });
    apollo.routineItems.error.call(c, new Error('boom'));
    expect(c.loaded).toBe(true);
  });
});

describe('refresh', () => {
  it('refetches its own query — never a hand-cloned list', () => {
    const refetch = jest.fn(() => Promise.resolve());
    const c = ctx({ $apollo: { queries: { routineItems: { refetch } } } });
    methods.refresh.call(c);
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('is a no-op before the query exists', async () => {
    await expect(methods.refresh.call(ctx({ $apollo: null }))).resolves.toBeUndefined();
  });
});
