/* eslint-env jest */
/**
 * D-18: /search opened pre-scoped to the current routine task and the Routine
 * filter could not be cleared or replaced.
 *
 * The filter is exercised through a real router so the URL round-trip the page
 * used to depend on is part of the test, and through the real v-autocomplete so
 * the clear button and the selection behave as they do in the app.
 */
// The page pulls the goal-creation container, which reaches third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub it — it plays no part in searching.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('../../containers/GoalCreationContainer.vue', () => ({
  __esModule: true,
  default: { render: (h) => h('div') },
}));

const mockSearchGoals = jest.fn(() => Promise.resolve([]));
jest.mock('../../composables/useGoalQueries', () => ({
  useSearchGoals: () => ({ searchGoals: mockSearchGoals, clearResults: jest.fn() }),
}));

const Vue = require('vue');
const Vuetify = require('vuetify');
const VueRouter = require('vue-router');

const SearchTime = require('../SearchTime.vue').default;

Vue.use(Vuetify);
Vue.use(VueRouter);

const TASKLIST = [
  { id: 'r1', name: 'Meditation' },
  { id: 'r2', name: 'Wind-down' },
];

// Vuetify menus detach into the app root, which jsdom has to be given.
document.body.setAttribute('data-app', 'true');

const flush = async () => {
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Vue.nextTick();
  }
};

// Mounts the page behind a real router, with the routine list already loaded
// so the Routine filter has items to show.
const mountSearchPage = async (query) => {
  const Page = Vue.extend({
    extends: SearchTime,
    data() {
      return { routineData: { tasklist: TASKLIST } };
    },
  });
  const router = new VueRouter({
    mode: 'abstract',
    routes: [{ path: '/search', name: 'search', component: Page }],
  });
  const root = new Vue({ router, render: (h) => h('router-view') }).$mount();
  router.push({ name: 'search', query });
  await flush();
  const vm = root.$children[0];
  return {
    vm,
    router,
    routineFilter: vm.$children.find((c) => c.$options.name === 'v-autocomplete'),
  };
};

describe('SearchTime routine filter', () => {
  beforeEach(() => {
    mockSearchGoals.mockClear();
    Object.defineProperty(Vue.prototype, '$apollo', {
      get: () => ({ queries: {} }),
      configurable: true,
    });
  });

  it('searches unscoped when no routine is asked for', async () => {
    await mountSearchPage({ q: 'Seven-Day' });

    expect(mockSearchGoals).toHaveBeenCalledWith('Seven-Day', {});
  });

  it('clears the routine filter for good, and re-runs the search unscoped', async () => {
    const { vm, routineFilter } = await mountSearchPage({ q: 'Seven-Day', taskRef: 'r1' });
    expect(routineFilter.internalSearch).toBe('Meditation');

    routineFilter.clearableCallback();
    await flush();

    expect(vm.selectedRoutine).toBeNull();
    expect(routineFilter.internalSearch).toBeFalsy();
    expect(vm.$route.query.taskRef).toBeUndefined();
    expect(mockSearchGoals).toHaveBeenLastCalledWith('Seven-Day', {});
  });

  it('replaces the routine instead of concatenating it', async () => {
    const { vm, routineFilter } = await mountSearchPage({ q: 'Seven-Day', taskRef: 'r1' });

    routineFilter.selectItem(TASKLIST[1]);
    await flush();

    expect(vm.selectedRoutine).toBe('r2');
    expect(routineFilter.internalSearch).toBe('Wind-down');
    expect(vm.$route.query.taskRef).toBe('r2');
    expect(mockSearchGoals).toHaveBeenLastCalledWith('Seven-Day', { taskRef: 'r2' });
  });

  it('does not let a cleared filter come back through the URL', async () => {
    const { vm, routineFilter } = await mountSearchPage({ q: 'Seven-Day', taskRef: 'r1' });

    routineFilter.clearableCallback();
    await flush();
    // A fresh term, as the tester typed it after clearing the filter.
    vm.searchQuery = 'Meditation goals';
    await vm.executeSearch();
    await flush();

    expect(vm.$route.query.taskRef).toBeUndefined();
    expect(mockSearchGoals).toHaveBeenLastCalledWith('Meditation goals', {});
  });

  it('stops the empty state naming the previous term while a new one is typed', async () => {
    const { vm } = await mountSearchPage({ q: 'Seven-Day' });
    expect(vm.executedQuery).toBe('Seven-Day');

    vm.searchQuery = 'Seven-Day plan';
    await flush();

    expect(vm.executedQuery).toBe('');
    expect(vm.results).toEqual([]);
  });
});
