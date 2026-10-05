/* eslint-env jest */
import Vue from 'vue';
import Vuetify from 'vuetify';
import AtomSwitch from './Switch.vue';

Vue.use(Vuetify);

// Mounts the atom exactly the way the dashboard wires the Skip Day control:
// `v-model` (so the value is controlled by the parent) plus a separate
// `@change` listener that carries the new value to the mutation.
const mountControlled = () => {
  const changes = [];
  const vm = new Vue({
    data: () => ({ value: false }),
    render(h) {
      return h('div', [
        h(AtomSwitch, {
          props: { value: this.value, label: 'Skip Day', hideDetails: true },
          on: {
            input: (v) => { this.value = v; },
            change: (v) => { changes.push(v); },
          },
        }),
      ]);
    },
  }).$mount();

  return {
    vm,
    changes,
    input: () => vm.$el.querySelector('input'),
    // A pointer click on a v-switch lands on the ripple, not on the (opacity 0)
    // input — the ripple is painted over it. That is the path the user takes.
    ripple: () => vm.$el.querySelector('.v-input--selection-controls__ripple'),
  };
};

describe('AtomSwitch', () => {
  it('has the correct component name and models on value/input', () => {
    expect(AtomSwitch.name).toBe('AtomSwitch');
    expect(AtomSwitch.model).toEqual({ prop: 'value', event: 'input' });
  });

  it('renders the clickable ripple that receives the pointer click', () => {
    const { ripple } = mountControlled();
    expect(ripple()).not.toBeNull();
  });

  it('emits input and change with the new value when clicked', async () => {
    const {
      vm, changes, input, ripple,
    } = mountControlled();

    expect(input().checked).toBe(false);

    ripple().click();
    await Vue.nextTick();

    expect(changes).toEqual([true]);
    expect(vm.value).toBe(true);
    expect(input().checked).toBe(true);
    expect(input().getAttribute('aria-checked')).toBe('true');
  });

  it('toggles back off on a second click', async () => {
    const {
      vm, changes, input, ripple,
    } = mountControlled();

    ripple().click();
    await Vue.nextTick();
    ripple().click();
    await Vue.nextTick();

    expect(changes).toEqual([true, false]);
    expect(vm.value).toBe(false);
    expect(input().checked).toBe(false);
  });

  it('does not toggle while disabled', async () => {
    const changes = [];
    const vm = new Vue({
      data: () => ({ value: false }),
      render(h) {
        return h('div', [
          h(AtomSwitch, {
            props: { value: this.value, label: 'Skip Day', disabled: true },
            on: {
              input: (v) => { this.value = v; },
              change: (v) => { changes.push(v); },
            },
          }),
        ]);
      },
    }).$mount();

    vm.$el.querySelector('.v-input--selection-controls__ripple').click();
    await Vue.nextTick();

    expect(changes).toEqual([]);
    expect(vm.value).toBe(false);
  });
});
