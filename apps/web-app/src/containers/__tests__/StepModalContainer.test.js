/* eslint-env jest */
/**
 * D-04: the Routine Steps dialog listed another item's steps, each line
 * repeated. The list was keyed by `step.name`, so steps that share a name
 * collide on one key, and an item with no steps rendered nothing at all rather
 * than saying so.
 *
 * Rendered for real (plain Vue + Vuetify, as the agents suite does) because
 * what is being asserted is one row per step — a keying property.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Vue = require('vue');
const Vuetify = require('vuetify');

const StepModalContainer = require('../StepModalContainer.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

// Vuetify's detachable mixin looks for [data-app] when a dialog opens, and
// detaches the dialog's content to the body — so each test starts from a clean
// one and reads what it painted from there.
beforeEach(() => {
  document.body.innerHTML = '';
  document.body.setAttribute('data-app', 'true');
});

const open = (task) => {
  const vm = new Vue({ render: (h) => h(StepModalContainer) }).$mount();
  const modal = vm.$children[0];
  modal.open(task);
  return modal;
};

const dialog = () => document.body.querySelector('.v-dialog--active');

const lines = () => Array.from(dialog().querySelectorAll('li'))
  .map((li) => li.textContent.trim());

describe('StepModalContainer', () => {
  it('lists the task’s own steps, one row each, even when they share a name', async () => {
    open({
      id: 'morning-movement',
      name: 'Morning movement',
      steps: [{ name: 'Stretch - 5 min' }, { name: 'Stretch - 5 min' }],
    });
    await Vue.nextTick();

    expect(lines()).toEqual(['Stretch - 5 min', 'Stretch - 5 min']);
  });

  it('says so when the item has no steps', async () => {
    open({ id: 'wake-up', name: 'Wake Up', steps: [] });
    await Vue.nextTick();

    expect(lines()).toEqual([]);
    expect(dialog().querySelector('.step-modal-container__empty')).not.toBeNull();
  });

  it('shows the steps of the task it was last opened with', () => {
    const modal = open({ id: 'a', steps: [{ name: 'journal' }] });
    expect(modal.steps.map((s) => s.name)).toEqual(['journal']);

    modal.open({ id: 'b', steps: [{ name: 'Stretch - 5 min' }] });
    expect(modal.steps.map((s) => s.name)).toEqual(['Stretch - 5 min']);
  });

  it('reads an empty list off a task that carries no steps field', () => {
    expect(open({ id: 'wake-up' }).steps).toEqual([]);
    expect(open(null).steps).toEqual([]);
  });
});
