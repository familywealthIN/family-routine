/* eslint-env jest */
/**
 * The avatar drawer closes on Escape like the scrim does, and only listens while
 * it is open so it never swallows Escape meant for something else.
 */
const Vue = require('vue');

const UserDrawer = require('./UserDrawer.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = (value) => {
  const inputs = [];
  const host = new Vue({
    data: () => ({ value }),
    render(h) {
      return h(UserDrawer, {
        props: { value: this.value },
        on: { input: (v) => inputs.push(v) },
      });
    },
  }).$mount();
  return { host, inputs };
};

const press = (key, init = {}) => {
  const event = new KeyboardEvent('keydown', { key, cancelable: true, ...init });
  document.dispatchEvent(event);
  return event;
};

describe('OrganismUserDrawer — Escape', () => {
  it('asks to close on Escape while open', () => {
    const { host, inputs } = mount(true);
    press('Escape');
    expect(inputs).toEqual([false]);
    host.$destroy();
  });

  it('ignores Escape while closed', () => {
    const { host, inputs } = mount(false);
    press('Escape');
    expect(inputs).toEqual([]);
    host.$destroy();
  });

  it('ignores other keys and an Escape something else already handled', () => {
    const { host, inputs } = mount(true);
    press('Enter');
    const handled = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    handled.preventDefault();
    document.dispatchEvent(handled);
    expect(inputs).toEqual([]);
    host.$destroy();
  });

  it('stops listening once closed or destroyed', async () => {
    const { host, inputs } = mount(true);
    host.value = false;
    await Vue.nextTick();
    press('Escape');
    expect(inputs).toEqual([]);
    host.$destroy();
  });
});

describe('OrganismUserDrawer — list and timing', () => {
  const render = (props) => new Vue({
    render: (h) => h(UserDrawer, { props: { value: true, ...props } }),
  }).$mount();

  it('spaces every row of the list the same, whatever gap the More list carries', () => {
    const host = render({
      navItems: [
        { key: 'groups', icon: 'group', label: 'Groups' },
        {
          key: 'profile', icon: 'person', label: 'Profile', gap: '10px',
        },
      ],
    });
    const rows = host.$el.querySelectorAll('.rn-drawer__nav-row');
    expect([...rows].map((r) => r.style.marginTop)).toEqual(['', '']);
    host.$destroy();
  });

  it('shows the on-time ribbon only once the timing is known', () => {
    const none = render({});
    expect(none.$el.querySelector('[data-testid="timing-ribbon"]')).toBeNull();
    none.$destroy();
    const known = render({
      timing: {
        slots: [], counts: {}, nextIndex: -1, skip: false, rate: 80, delta: null,
      },
    });
    expect(known.$el.querySelector('[data-testid="timing-ribbon"]')).not.toBeNull();
    known.$destroy();
  });
});
