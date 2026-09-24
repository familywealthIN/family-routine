/* eslint-env jest */
/**
 * Contract tests for GoalDeleteConfirmContainer — the confirmation the
 * destructive goal delete goes through (D-15).
 *
 * The delete used to fire straight from the trash icon and strand every
 * milestone hanging off the goal. The dialog has to hold the delete back until
 * it is confirmed, and its wording has to match what the server actually does
 * (cascade), so both are asserted here.
 *
 * Methods/computeds are exercised against a minimal vm-like context (no mount),
 * matching the GoalItemListContainer.test.js convention.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Container = require('../GoalDeleteConfirmContainer.vue').default;

const makeCtx = (overrides = {}) => {
  const emitted = [];
  return {
    isOpen: false,
    target: null,
    goalItemMilestones: [],
    $apollo: { queries: { goalItemMilestones: { loading: false } } },
    $emit: (evt, payload) => emitted.push({ evt, payload }),
    close: Container.methods.close,
    // `summary` / `confirmText` read the container's other computeds through
    // `this`, which a bare context object does not provide.
    get milestoneCount() { return Container.computed.milestoneCount.call(this); },
    get isLoadingMilestones() { return Container.computed.isLoadingMilestones.call(this); },
    emitted,
    ...overrides,
  };
};

const computedOf = (name, ctx) => Container.computed[name].call(ctx);

const WEEK_TARGET = {
  id: 'w1', period: 'week', date: '17-08-2026', body: 'Run every day',
};

describe('GoalDeleteConfirmContainer', () => {
  describe('contract', () => {
    it('wraps exactly one organism (the shared confirm dialog)', () => {
      expect(Object.keys(Container.components)).toEqual(['OrganismSimpleDialog']);
    });
  });

  describe('open/confirm/cancel', () => {
    it('opens on a target without deleting anything', () => {
      const ctx = makeCtx();
      Container.methods.open.call(ctx, WEEK_TARGET);

      expect(ctx.isOpen).toBe(true);
      expect(ctx.target).toEqual(WEEK_TARGET);
      expect(ctx.emitted).toEqual([]);
    });

    it('emits confirm with the target and closes', () => {
      const ctx = makeCtx();
      Container.methods.open.call(ctx, WEEK_TARGET);
      Container.methods.onConfirm.call(ctx);

      expect(ctx.emitted).toEqual([{ evt: 'confirm', payload: WEEK_TARGET }]);
      expect(ctx.isOpen).toBe(false);
      expect(ctx.target).toBe(null);
    });

    it('emits nothing on cancel', () => {
      const ctx = makeCtx();
      Container.methods.open.call(ctx, WEEK_TARGET);
      Container.methods.close.call(ctx);

      expect(ctx.emitted).toEqual([]);
      expect(ctx.isOpen).toBe(false);
    });

    it('drops the previous milestone read when it opens on a new target', () => {
      const ctx = makeCtx({ goalItemMilestones: [{ id: 'd16', body: 'stale' }] });
      Container.methods.open.call(ctx, WEEK_TARGET);

      expect(ctx.goalItemMilestones).toEqual([]);
    });
  });

  describe('wording matches the server cascade', () => {
    const withMilestones = (count) => makeCtx({
      target: WEEK_TARGET,
      goalItemMilestones: Array.from({ length: count }, (unused, i) => ({
        id: `d${i}`, body: `Run day ${i}`,
      })),
    });

    it('says how many milestones go with the goal', () => {
      const ctx = withMilestones(7);
      expect(computedOf('summary', ctx))
        .toBe('"Run every day" has 7 milestones. Deleting it deletes them too. This cannot be undone.');
      expect(computedOf('confirmText', ctx)).toBe('Delete goal + 7');
    });

    it('speaks of a single milestone in the singular', () => {
      const ctx = withMilestones(1);
      expect(computedOf('summary', ctx))
        .toBe('"Run every day" has 1 milestone. Deleting it deletes that one too. This cannot be undone.');
    });

    it('promises no cascade when there are no milestones', () => {
      const ctx = withMilestones(0);
      expect(computedOf('summary', ctx)).toBe('"Run every day" will be deleted. This cannot be undone.');
      expect(computedOf('confirmText', ctx)).toBe('Delete');
    });

    it('claims nothing while the milestone read is still in flight', () => {
      const ctx = makeCtx({
        target: WEEK_TARGET,
        $apollo: { queries: { goalItemMilestones: { loading: true } } },
      });
      expect(computedOf('summary', ctx)).toBe('Checking what "Run every day" has hanging off it…');
    });

    it('previews the first five milestones and counts the rest', () => {
      const ctx = withMilestones(7);
      expect(computedOf('milestoneBodies', ctx).map((m) => m.id))
        .toEqual(['d0', 'd1', 'd2', 'd3', 'd4']);
      expect(computedOf('hiddenCount', ctx)).toBe(2);
    });
  });
});
