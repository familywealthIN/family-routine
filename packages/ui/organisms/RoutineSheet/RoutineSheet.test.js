/* eslint-env jest */
const Vue = require('vue');

const RoutineSheet = require('./RoutineSheet.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = (value) => {
  const closes = [];
  const vm = new Vue({
    data: () => ({ open: value }),
    render(h) {
      return h(RoutineSheet, {
        props: { value: this.open, title: 'Start Work' },
        on: { input: (v) => { closes.push(v); this.open = v; } },
      });
    },
  }).$mount();
  return { vm, closes };
};

const pressEscape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

describe('OrganismRoutineSheet — Escape', () => {
  it('closes an open sheet on Escape', async () => {
    const { vm, closes } = mount(true);
    pressEscape();
    expect(closes).toEqual([false]);
    await Vue.nextTick();
    // Closed: the listener is gone, so another Escape emits nothing.
    pressEscape();
    expect(closes).toEqual([false]);
    vm.$destroy();
  });

  it('ignores other keys and does nothing while closed', () => {
    const { vm, closes } = mount(false);
    pressEscape();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(closes).toEqual([]);
    vm.$destroy();
  });
});
