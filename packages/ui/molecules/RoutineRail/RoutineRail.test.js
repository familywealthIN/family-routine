/* eslint-env jest */
const Vue = require('vue');

const RoutineRail = require('./RoutineRail.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}) => new Vue({
  render: (h) => h(RoutineRail, {
    props: {
      routines: [{ id: 'a', name: 'Wake Up', time: '06:00' }],
      tickedCount: 0,
      ...props,
    },
  }),
}).$mount().$el;

const header = (el) => el.querySelector('.rn-rail__header').textContent.replace(/\s+/g, ' ').trim();

describe('MoleculeRoutineRail header', () => {
  it('defaults to TODAY', () => {
    expect(header(render())).toBe('TODAY · 0 of 1 ticked');
  });

  // Viewing another day used to still say TODAY.
  it('names the viewed day when given one', () => {
    expect(header(render({ dayLabel: 'FRI 2 OCT' }))).toBe('FRI 2 OCT · 0 of 1 ticked');
  });
});

describe('MoleculeRoutineRail chips — focused routine slides to first', () => {
  const routines = [
    { id: 'a', name: 'Wake Up', time: '06:00' },
    { id: 'b', name: 'Jogging', time: '07:00' },
    {
      id: 'c', name: 'Start Work', time: '09:00', isFocus: true,
    },
  ];

  it('scrolls the strip so the focused chip leads it', async () => {
    const host = new Vue({
      render: (h) => h(RoutineRail, { props: { routines, layout: 'chips' } }),
    }).$mount();
    const rail = host.$children[0];
    const strip = rail.$refs.chips;
    const chip = rail.$refs['chip-c'][0];
    Object.defineProperty(chip, 'offsetLeft', { value: 260, configurable: true });
    rail.slideChipToStart('c', false);
    expect(strip.scrollLeft).toBe(260);
    expect(rail.focusId).toBe('c');
  });

  it('follows a change of focus', async () => {
    const data = Vue.observable({ routines });
    const host = new Vue({
      render: (h) => h(RoutineRail, { props: { routines: data.routines, layout: 'chips' } }),
    }).$mount();
    const rail = host.$children[0];
    const spy = jest.spyOn(rail, 'slideChipToStart');
    data.routines = routines.map((r) => ({ ...r, isFocus: r.id === 'b' }));
    await Vue.nextTick();
    await Vue.nextTick();
    expect(spy).toHaveBeenCalledWith('b', true);
  });
});
