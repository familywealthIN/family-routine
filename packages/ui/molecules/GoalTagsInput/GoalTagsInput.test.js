/* eslint-env jest */
/**
 * Unit tests for MoleculeGoalTagsInput.
 *
 * GoalTagsInput is no longer an implementation — it is the legacy-contract shim
 * over MoleculeHierarchicalTagInput (see that component's test for the chips,
 * the level-aware autocomplete and every key path). What matters here is the
 * adapter itself: the four existing call sites pass `goalTags` / `userTags` and
 * listen for `update-new-tag-items`, and must keep working unchanged.
 */
const Vue = require('vue');

const GoalTagsInput = require('./GoalTagsInput.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}) => {
  const host = new Vue({
    data() {
      return { emitted: [] };
    },
    render(h) {
      return h(GoalTagsInput, {
        props,
        on: { 'update-new-tag-items': (next) => this.emitted.push(next) },
      });
    },
  }).$mount();
  return { host, cmp: host.$children[0], el: host.$el };
};

describe('MoleculeGoalTagsInput', () => {
  describe('Component contract', () => {
    it('is still named GoalTagsInput for the existing call sites', () => {
      expect(GoalTagsInput.name).toBe('GoalTagsInput');
    });

    it('delegates to the one shared tag editor instead of reimplementing it', () => {
      const { cmp } = render();
      expect(cmp.$children).toHaveLength(1);
      expect(cmp.$children[0].$options.name).toBe('MoleculeHierarchicalTagInput');
    });
  });

  describe('Prop mapping', () => {
    it('renders goalTags as chips, one segment span per `:` level', () => {
      const { el } = render({ goalTags: ['area:health', 'morning'] });
      const chips = el.querySelectorAll('[data-testid="tag-chip"]');
      expect(chips).toHaveLength(2);
      expect(chips[0].querySelectorAll('.rn-tag-input__segment')).toHaveLength(2);
    });

    it('feeds userTags in as the suggestion vocabulary', async () => {
      const { el, cmp } = render({ userTags: ['area:health:sleep'] });
      const input = cmp.$children[0];
      input.focused = true;
      input.inputValue = 'area:';
      await Vue.nextTick();
      // The leaf's ancestors join the universe, so `area:` can be drilled into.
      expect(el.querySelectorAll('[data-testid="tag-suggestion"]')).toHaveLength(1);
      expect(el.querySelector('[data-testid="tag-drill"]').textContent).toContain('1 inside');
    });

    it('tolerates a null or non-array goalTags', () => {
      expect(render({ goalTags: null }).el.querySelectorAll('[data-testid="tag-chip"]'))
        .toHaveLength(0);
    });

    it('keeps the dense goal forms their original height by hiding the hint', () => {
      const { el } = render();
      expect(el.querySelector('[data-testid="tag-hint"]').textContent).toBe('');
    });

    it('counts usage in goals, not routines, when a host supplies counts', () => {
      const { cmp } = render();
      expect(cmp.$children[0].usageNoun).toBe('goal');
    });
  });

  describe('Event mapping', () => {
    it('re-emits an added tag as update-new-tag-items with the full list', () => {
      const { host, cmp } = render({ goalTags: ['a'] });
      const input = cmp.$children[0];
      input.inputValue = 'focus';
      input.onKeydown({ key: 'Enter', preventDefault: jest.fn(), target: { selectionStart: 5 } });
      expect(host.emitted).toEqual([['a', 'focus']]);
    });

    it('re-emits a removal as update-new-tag-items without that tag', () => {
      const { host, el } = render({ goalTags: ['a', 'b'] });
      el.querySelectorAll('[data-testid="tag-remove"]')[1].click();
      expect(host.emitted).toEqual([['a']]);
    });
  });
});
