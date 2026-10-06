/* eslint-env jest */
/**
 * Leaving the group is now confirmed in a sheet, not by a browser `confirm()`.
 *
 * Two things are asserted: the mutation runs only from the sheet's own confirm
 * event (so there is no path that leaves without being asked), and `window.confirm`
 * is never called — the old page's gate is gone, not merely hidden.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const fs = require('fs');
const path = require('path');
const Vue = require('vue');

const Container = require('../GroupLeaveContainer.vue').default;
const { LEAVE_GROUP_MUTATION } = require('../../composables/graphql/groupQueries');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const mountSheet = (mutate) => {
  const vm = new Vue({
    render: (h) => h(Container, {
      props: { open: true, shell: 'phone', othersNames: 'Priya and Sam' },
    }),
  }).$mount();
  const container = vm.$children[0];
  // vue-apollo is not installed in the unit environment, so the container's one
  // dependency is handed to it directly.
  container.$apollo = { mutate };
  return { vm, container, el: vm.$el };
};

describe('GroupLeaveContainer', () => {
  it('leaves only when the sheet’s own "Leave group" is pressed', async () => {
    const mutate = jest.fn(() => Promise.resolve({ data: {} }));
    const { container, el } = mountSheet(mutate);
    const left = [];
    container.$on('left', () => left.push('left'));

    el.querySelector('[data-testid="group-leave-stay"]').click();
    await flush();
    expect(mutate).not.toHaveBeenCalled();

    el.querySelector('[data-testid="group-leave-confirm"]').click();
    await flush();

    expect(mutate).toHaveBeenCalledWith({ mutation: LEAVE_GROUP_MUTATION });
    expect(left).toEqual(['left']);
  });

  it('never asks through window.confirm', async () => {
    const confirmSpy = jest.fn(() => true);
    window.confirm = confirmSpy;
    const { el } = mountSheet(jest.fn(() => Promise.resolve({ data: {} })));

    el.querySelector('[data-testid="group-leave-confirm"]').click();
    await flush();

    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('states the consequence by name in the sheet, which a confirm() could not', () => {
    const { el } = mountSheet(jest.fn());
    expect(el.querySelector('[data-testid="group-leave-body"]').textContent)
      .toContain('Priya and Sam');
  });

  it('reports a failed leave rather than clearing the group locally', async () => {
    const { container, el } = mountSheet(jest.fn(() => Promise.reject(new Error('offline'))));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const events = [];
    container.$on('failed', () => events.push('failed'));
    container.$on('left', () => events.push('left'));

    el.querySelector('[data-testid="group-leave-confirm"]').click();
    await flush();

    expect(events).toEqual(['failed']);
    console.error.mockRestore();
  });

  it('leaves no confirm() behind on the page either', () => {
    const page = fs.readFileSync(
      path.join(__dirname, '..', '..', 'pages', 'FamilyRoutine.vue'),
      'utf8',
    );
    // A `confirm(` with an argument is a real call. The page's prose mentions
    // bare `confirm()` only to record that it is gone.
    expect(page).not.toMatch(/confirm\s*\(\s*['"`]/);
  });
});
