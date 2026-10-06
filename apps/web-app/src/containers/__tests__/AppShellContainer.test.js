/* eslint-env jest */
/**
 * AppShellContainer — the chassis shell's one read.
 *
 * AppShell's `points` prop defaults to 0, so a redesigned page that rendered the
 * shell without this container would print a confident "0 diamonds" at a user
 * who has hundreds. That is the unknown-vs-zero mistake D-10 fixed on the chip,
 * arriving again through the shell, so the semantics are pinned here: "…" while
 * there is nothing yet, "—" on a failed read, the number otherwise.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Container = require('../AppShellContainer.vue').default;
const { XP_BALANCE_QUERY } = require('../../composables/graphql/queries');

const { computed, apollo } = Container;

const ctx = (overrides = {}) => ({
  xpBalance: null,
  xpBalanceError: false,
  $root: { $data: {} },
  ...overrides,
});

const read = (name, overrides) => computed[name].call(ctx(overrides));

describe('AppShellContainer — the balance', () => {
  it('owns exactly one operation', () => {
    expect(apollo.xpBalance.query).toBe(XP_BALANCE_QUERY);
    expect(Object.keys(apollo)).toEqual(['xpBalance']);
    expect(apollo.xpBalance.fetchPolicy).toBe('cache-and-network');
  });

  it('shows the balance once it is in', () => {
    const balance = { available: 128, entitled: false };
    expect(read('points', { xpBalance: balance })).toBe(128);
    expect(read('pointsEntitled', { xpBalance: balance })).toBe(false);
    expect(read('pointsLoading', { xpBalance: balance })).toBe(false);
  });

  it('says "unknown" until a balance lands, derived from the data not the query', () => {
    expect(read('pointsLoading')).toBe(true);
    expect(read('pointsLoading', { xpBalance: { available: 128 } })).toBe(false);
    // A failed read is unknown too, but it is reported as an error, not a wait.
    expect(read('pointsLoading', { xpBalanceError: true })).toBe(false);
  });

  it('reports a failed read as unknown, not as zero', () => {
    expect(read('pointsError', { xpBalanceError: true })).toBe(true);
    expect(read('pointsError', { xpBalanceError: true, xpBalance: { available: 5 } })).toBe(false);
  });

  it('marks a subscriber entitled rather than printing a balance', () => {
    expect(read('pointsEntitled', { xpBalance: { available: 0, entitled: true } })).toBe(true);
  });

  it('waits for a signed-in user', () => {
    expect(apollo.xpBalance.skip.call({ $root: { $data: {} } })).toBe(true);
    expect(apollo.xpBalance.skip.call({ $root: { $data: { email: 'a@b.c' } } })).toBe(false);
  });

  it('clears a previous failure once a payload lands', () => {
    const vm = { xpBalanceError: true };
    apollo.xpBalance.result.call(vm, { data: { xpBalance: { available: 1 } } });
    expect(vm.xpBalanceError).toBe(false);
  });
});

describe('AppShellContainer — the user', () => {
  it('reads the signed-in user off the root instance, not a query', () => {
    const root = { $data: { name: 'Gaurav', email: 'g@example.com', picture: 'http://img' } };
    expect(read('user', { $root: root }))
      .toEqual({ name: 'Gaurav', email: 'g@example.com', picture: 'http://img' });
  });

  it('hands the shell empty strings rather than undefined before the session reads', () => {
    expect(read('user', { $root: {} })).toEqual({ name: '', email: '', picture: '' });
  });
});

describe('AppShellContainer — figures a page did not supply', () => {
  it('defaults D/K/G, the year average and the streak to unknown (null), not 0', () => {
    const { props } = Container;
    expect(props.scores.default).toBeNull();
    expect(props.yearAverage.default).toBeNull();
    expect(props.streakDays.default).toBeNull();
  });
});
