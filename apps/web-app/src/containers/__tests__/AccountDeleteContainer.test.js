/* eslint-env jest */
/**
 * Deleting the account keeps the REAL behaviour.
 *
 * The design's handler toasts "Prototype only — nothing was removed".
 * `docs/redesign/chassis.md` § Conflicts keeps the mutation, the cleared
 * localStorage and the cleared Apollo store; the page does the redirect.
 *
 * The gate is also asserted end to end here: the mutation must be unreachable
 * until an exact "DELETE" has been typed.
 */
const Vue = require('vue');

const Container = require('../AccountDeleteContainer.vue').default;
const { DELETE_ACCOUNT_MUTATION } = require('../../composables/graphql/profileQueries');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const mount = (mutate, clearStore = () => Promise.resolve()) => {
  const vm = new Vue({
    render: (h) => h(Container, { props: { open: true, shell: 'phone' } }),
  }).$mount();
  const container = vm.$children[0];
  container.$apollo = { mutate, provider: { defaultClient: { clearStore } } };
  const events = [];
  ['deleted', 'failed'].forEach((name) => {
    container.$on(name, (...args) => events.push([name, ...args]));
  });
  return {
    vm, container, el: vm.$el, events,
  };
};

const type = async (vm, el, value) => {
  const input = el.querySelector('[data-testid="delete-account-input"]');
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await vm.$nextTick();
};

const confirm = (el) => el.querySelector('[data-testid="delete-account-confirm"]').click();

describe('AccountDeleteContainer — the gate', () => {
  it('does not call the mutation until DELETE is typed exactly', async () => {
    const mutate = jest.fn(() => Promise.resolve({ data: { deleteAccount: { success: 'true' } } }));
    const { vm, el } = mount(mutate);

    confirm(el);
    await flush();
    expect(mutate).not.toHaveBeenCalled();

    await type(vm, el, 'delete');
    confirm(el);
    await flush();
    expect(mutate).not.toHaveBeenCalled();

    await type(vm, el, 'DELETE');
    confirm(el);
    await flush();
    expect(mutate).toHaveBeenCalledWith({ mutation: DELETE_ACCOUNT_MUTATION });
  });

  it('never asks through window.confirm', async () => {
    window.confirm = jest.fn(() => true);
    const { vm, el } = mount(() => Promise.resolve({ data: { deleteAccount: { success: 'true' } } }));
    await type(vm, el, 'DELETE');
    confirm(el);
    await flush();
    expect(window.confirm).not.toHaveBeenCalled();
  });
});

describe('AccountDeleteContainer — a successful delete', () => {
  const run = async (response) => {
    const clearStore = jest.fn(() => Promise.resolve());
    const harness = mount(() => Promise.resolve({ data: { deleteAccount: response } }), clearStore);
    localStorage.setItem('timeFormat', '12');
    await type(harness.vm, harness.el, 'DELETE');
    confirm(harness.el);
    await flush();
    return { ...harness, clearStore };
  };

  it('clears local data and the Apollo store, then reports the message', async () => {
    const { events, clearStore } = await run({ success: 'true', message: 'Account removed' });
    expect(localStorage.getItem('timeFormat')).toBeNull();
    expect(clearStore).toHaveBeenCalled();
    expect(events).toEqual([['deleted', 'Account removed']]);
  });

  it('reads `success` as the String the server actually returns', async () => {
    const { events } = await run({ success: 'true', message: '' });
    expect(events[0][0]).toBe('deleted');
  });
});

describe('AccountDeleteContainer — a refused delete', () => {
  it('keeps the local session when the server says it did not delete', async () => {
    localStorage.setItem('timeFormat', '12');
    const clearStore = jest.fn();
    const { vm, el, events } = mount(
      () => Promise.resolve({ data: { deleteAccount: { success: 'false', message: 'Nope' } } }),
      clearStore,
    );
    await type(vm, el, 'DELETE');
    confirm(el);
    await flush();

    expect(events).toEqual([['failed', 'Nope']]);
    expect(clearStore).not.toHaveBeenCalled();
    expect(localStorage.getItem('timeFormat')).toBe('12');
  });

  it('reports a thrown mutation without wiping anything', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('timeFormat', '12');
    const { vm, el, events } = mount(() => Promise.reject(new Error('offline')));
    await type(vm, el, 'DELETE');
    confirm(el);
    await flush();

    expect(events).toEqual([
      ['failed', 'Nothing was deleted — try again or contact support'],
    ]);
    expect(localStorage.getItem('timeFormat')).toBe('12');
    console.error.mockRestore();
  });
});
