/* eslint-env jest */
/**
 * The goal editor on Goals and Year Goals names what an item rolls up into.
 * It used to pass no parent label, so every week and day goal read
 * "Not linked" although the page draws it under its parent.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Container = require('../GoalEditSheetContainer.vue').default;
const { GOAL_ITEM_PARENT_QUERY } = require('../../composables/graphql/goalItemQueries');

const { computed, apollo } = Container;

const ctx = (over = {}) => {
  const vm = {
    open: true, item: null, liveItem: null, parentItem: null, ...over,
  };
  vm.parentId = computed.parentId.call(vm);
  return vm;
};

describe('GoalEditSheetContainer — Linked to', () => {
  it('looks the parent up by the item’s goalRef', () => {
    const vm = ctx({ item: { id: 'w1', goalRef: 'm1' } });
    expect(vm.parentId).toBe('m1');
    expect(apollo.parentItem.query).toBe(GOAL_ITEM_PARENT_QUERY);
    expect(apollo.parentItem.variables.call(vm)).toEqual({ id: 'm1' });
    expect(apollo.parentItem.skip.call(vm)).toBe(false);
    expect(apollo.parentItem.skip.call(ctx({ item: { id: 'y1' } }))).toBe(true);
  });

  it('shows the parent’s title, and only for the parent asked for', () => {
    const vm = ctx({ item: { id: 'w1', goalRef: 'm1' }, parentItem: { id: 'm1', body: 'Launch mobile' } });
    expect(computed.goalRefLabel.call(vm)).toBe('Launch mobile');
    const stale = ctx({ item: { id: 'w2', goalRef: 'm2' }, parentItem: { id: 'm1', body: 'Launch mobile' } });
    expect(computed.goalRefLabel.call(stale)).toBe('');
  });
});
