/* eslint-env jest */
/**
 * Deleting the account.
 *
 * The gate is the whole test: it must arm on an exact "DELETE" and on nothing
 * else, it must not survive a close, and `confirm` must be unreachable while it
 * is shut — a disabled attribute alone would still fire on a programmatic click.
 */
const Vue = require('vue');

const DeleteAccountPanel = require('./DeleteAccountPanel.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = (props = {}) => {
  const vm = new Vue({
    data: { open: !!props.open },
    render(h) {
      return h(DeleteAccountPanel, { props: { ...props, open: this.open } });
    },
  }).$mount();
  const panel = vm.$children[0];
  const events = [];
  ['open', 'close', 'confirm'].forEach((name) => panel.$on(name, () => events.push(name)));
  return {
    vm, panel, el: vm.$el, events,
  };
};

const node = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);

/** Type into the gate the way a user does — v-model listens for `input`. */
const type = async (vm, el, value) => {
  const input = node(el, 'delete-account-input');
  input.value = value;
  input.dispatchEvent(new Event('input'));
  await vm.$nextTick();
};

describe('OrganismDeleteAccountPanel — the row', () => {
  it('states what is lost before anything is opened', () => {
    const { el } = mount();
    expect(node(el, 'delete-account-open').textContent)
      .toContain('Removes routines, goals, agents and points for good');
  });

  it('asks the page to open the gate rather than opening itself', () => {
    const { el, events } = mount();
    node(el, 'delete-account-open').click();
    expect(events).toEqual(['open']);
    expect(node(el, 'delete-account-sheet')).toBeNull();
  });
});

describe('OrganismDeleteAccountPanel — the type-DELETE gate', () => {
  it('opens shut, with the button dead', () => {
    const { el } = mount({ open: true });
    const go = node(el, 'delete-account-confirm');
    expect(go.disabled).toBe(true);
    expect(go.className).not.toContain('rn-pdel__go--armed');
  });

  it('refuses to confirm while it is shut, even on a direct click', async () => {
    const { vm, el, events } = mount({ open: true });
    await type(vm, el, 'delete');
    node(el, 'delete-account-confirm').click();
    expect(events).toEqual([]);
  });

  it('arms on an exact DELETE', async () => {
    const { vm, el, events } = mount({ open: true });
    await type(vm, el, 'DELETE');
    const go = node(el, 'delete-account-confirm');
    expect(go.disabled).toBe(false);
    expect(go.className).toContain('rn-pdel__go--armed');
    go.click();
    expect(events).toEqual(['confirm']);
  });

  it('tolerates surrounding whitespace but nothing else', async () => {
    const { vm, el, panel } = mount({ open: true });
    const states = {};
    const probe = async (value) => {
      await type(vm, el, value);
      states[value] = panel.confirmed;
    };
    await probe('  DELETE ');
    await probe('Delete');
    await probe('DELETEE');
    await probe('DELETE account');
    await probe('');
    expect(states).toEqual({
      '  DELETE ': true,
      Delete: false,
      DELETEE: false,
      'DELETE account': false,
      '': false,
    });
  });

  it('forgets what was typed when it closes, so it cannot reopen armed', async () => {
    const { vm, el, panel } = mount({ open: true });
    await type(vm, el, 'DELETE');
    expect(panel.confirmed).toBe(true);

    vm.open = false;
    await vm.$nextTick();
    vm.open = true;
    await vm.$nextTick();
    expect(panel.confirmed).toBe(false);
    expect(node(el, 'delete-account-input').value).toBe('');
  });

  it('offers Keep account as the way out', () => {
    const { el, events } = mount({ open: true });
    node(el, 'delete-account-keep').click();
    expect(events).toEqual(['close']);
  });

  it('says it cannot be undone', () => {
    expect(mount({ open: true }).el.textContent).toContain('This can’t be undone');
  });

  // Chassis: one component, two presentations. The design draws the Profile
  // dialog at 520px rather than the default 720/860.
  it('is a bottom sheet on the phone and a 520px dialog above it', () => {
    expect(mount({ open: true, shell: 'phone' }).el
      .querySelector('.rn-rsheet__panel--sheet')).not.toBeNull();
    const dialog = mount({ open: true, shell: 'desktop' }).el
      .querySelector('.rn-rsheet__panel--dialog');
    expect(dialog).not.toBeNull();
    expect(dialog.style.width).toBe('520px');
  });
});
