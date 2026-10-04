/* eslint-env jest */
import Vue from 'vue';
import Vuetify from 'vuetify';
import AtomCheckbox from './Checkbox.vue';

Vue.use(Vuetify);

// Mounts the atom the way SubTaskItemList wires it: v-model plus a separate
// @change that reads the bound field to persist the tick.
const mountControlled = ({ withChange = true } = {}) => {
  const inputs = [];
  const changes = [];
  const seenAtChange = [];
  const state = Vue.observable({ value: false });
  const on = {
    input: (v) => { inputs.push(v); state.value = v; },
  };
  if (withChange) {
    on.change = (v) => { changes.push(v); seenAtChange.push(state.value); };
  }
  const vm = new Vue({
    render(h) {
      return h('div', [h(AtomCheckbox, { props: { value: state.value }, on })]);
    },
  }).$mount();

  return {
    vm: state,
    inputs,
    changes,
    seenAtChange,
    ripple: () => vm.$el.querySelector('.v-input--selection-controls__ripple'),
  };
};

describe('AtomCheckbox', () => {
  it('models on value/input', () => {
    expect(AtomCheckbox.name).toBe('AtomCheckbox');
    expect(AtomCheckbox.model).toEqual({ prop: 'value', event: 'input' });
  });

  it('forwards a parent @change exactly once per toggle, after v-model updated', async () => {
    const {
      vm, inputs, changes, seenAtChange, ripple,
    } = mountControlled();

    ripple().click();
    await Vue.nextTick();

    expect(inputs).toEqual([true]);
    expect(changes).toEqual([true]);
    expect(seenAtChange).toEqual([true]);
    expect(vm.value).toBe(true);

    ripple().click();
    await Vue.nextTick();

    expect(inputs).toEqual([true, false]);
    expect(changes).toEqual([true, false]);
  });

  it('emits input once for an input-only consumer (GoalItemList tick)', async () => {
    const { inputs, ripple } = mountControlled({ withChange: false });

    ripple().click();
    await Vue.nextTick();

    expect(inputs).toEqual([true]);
  });
});
