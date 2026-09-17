/* eslint-env jest */
/**
 * D-04: the Edit Item dialog listed no existing steps at all.
 *
 * A step's id is optional on the server and these items' steps had none, so the
 * Steps list was keyed `null`. `<transition-group>` keeps only children with a
 * key (`c.key != null`), so it dropped every row and the section rendered
 * empty — and removeStep, which matches on that same id, would have deleted all
 * of them at once. editItem now gives the dialog's own copy an id.
 *
 * Methods are exercised against a minimal vm-like context (no mount), matching
 * the page test convention; the list itself is rendered with plain Vue because
 * the defect was in how Vue treats the key, not in our data.
 */
// The page pulls the ui barrels, which transitively import third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in the steps list.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const Vue = require('vue/dist/vue.common.js');

const SettingsTime = require('../SettingsTime.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

// As the server returns them: a name, and an id that was never assigned.
const windDown = () => ({
  id: 'evening-wind-down',
  name: 'Evening wind-down',
  steps: [
    { id: null, name: 'journal' },
    { id: null, name: 'plan tomorrow' },
    { id: null, name: 'lights out' },
  ],
});

const openEditor = (item) => {
  const vm = {
    routineItems: [item],
    editedIndex: -1,
    editedItem: null,
    dialog: false,
    trackUserInteraction: () => {},
  };
  SettingsTime.methods.editItem.call(vm, item);
  return vm;
};

// The Steps section's markup, kept in step with SettingsTime.vue.
const renderSteps = (steps) => new Vue({
  data: () => ({ steps }),
  template: `
    <div>
      <transition-group>
        <li v-for="step in steps" :key="step.id">{{ step.name }}</li>
      </transition-group>
    </div>`,
}).$mount().$el;

describe('routine item steps editor', () => {
  it('loads the item’s existing steps, in order', () => {
    const { editedItem } = openEditor(windDown());

    expect(editedItem.steps.map((step) => step.name))
      .toEqual(['journal', 'plan tomorrow', 'lights out']);
  });

  it('gives every loaded step an id of its own', () => {
    const { editedItem } = openEditor(windDown());
    const ids = editedItem.steps.map((step) => step.id);

    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(3);
  });

  it('keeps the ids a step already has', () => {
    const item = windDown();
    item.steps[1].id = 'kept-id';

    expect(openEditor(item).editedItem.steps[1].id).toBe('kept-id');
  });

  it('does not hand the dialog the cached steps to edit in place', () => {
    const item = windDown();
    const { editedItem } = openEditor(item);

    expect(editedItem.steps).not.toBe(item.steps);
    expect(item.steps[0].id).toBeNull();
  });

  it('survives an item with no steps at all', () => {
    expect(openEditor({ id: 'wake-up', name: 'Wake Up' }).editedItem.steps).toEqual([]);
  });

  it('renders one row per step, which a null id does not', () => {
    const { editedItem } = openEditor(windDown());

    expect(renderSteps(editedItem.steps).textContent).toContain('plan tomorrow');
    expect(renderSteps(editedItem.steps).querySelectorAll('li')).toHaveLength(3);
    // The shape before the fix: no keys, so no rows.
    expect(renderSteps(windDown().steps).querySelectorAll('li')).toHaveLength(0);
  });

  it('removes only the step that was clicked', () => {
    const vm = openEditor(windDown());
    const { steps } = vm.editedItem;

    SettingsTime.methods.removeStep.call(vm, steps, steps[1].id);

    expect(vm.editedItem.steps.map((step) => step.name)).toEqual(['journal', 'lights out']);
  });
});
