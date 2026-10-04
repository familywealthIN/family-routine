/* eslint-env jest */
/**
 * Unit tests for MoleculeHierarchicalTagInput.
 *
 * The keyboard is the heart of this component — areas and projects are typed,
 * not picked from a list — so every key path in
 * docs/redesign/chassis.md § "Hierarchical `:` tags" is covered here: the four
 * commit keys, the swallowed comma/space, Backspace, the arrow highlight and
 * the ArrowRight drill-in.
 *
 * Mounted for real (matching RoutineFocusCard.test.js) because the suggestion
 * list is a computed over the props, and the drill-in/usage rows are what the
 * user actually reads.
 */
const Vue = require('vue');

const HierarchicalTagInput = require('./HierarchicalTagInput.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const UNIVERSE = [
  'area:health:fitness',
  'area:health:sleep',
  'area:health:nutrition',
  'area:work',
  'area:work:writing',
  'area:family',
  'project:essays',
  'project:half-marathon',
  'morning',
  'evening',
  'deep-focus',
];

/**
 * Mounts the input inside a host that behaves like `v-model`: the emitted array
 * becomes the next `value`, and every emission is recorded.
 */
const render = (props = {}) => {
  const host = new Vue({
    data() {
      return { tags: props.value || [], emitted: [] };
    },
    render(h) {
      return h(HierarchicalTagInput, {
        props: Object.assign({ universe: UNIVERSE }, props, { value: this.tags }),
        on: {
          input: (next) => {
            this.emitted.push(next);
            this.tags = next;
          },
        },
      });
    },
  }).$mount();
  return { host, cmp: host.$children[0], el: host.$el };
};

/** Type into the field and open the menu, then settle the DOM. */
const type = async (cmp, text) => {
  cmp.focused = true;
  cmp.inputValue = text;
  await Vue.nextTick();
};

const makeEvent = (key, overrides = {}) => Object.assign({
  key,
  preventDefault: jest.fn(),
  target: { selectionStart: 0, blur: jest.fn() },
}, overrides);

/**
 * The tag each suggestion row stands for. A row draws one span per level and
 * replaces the `:` with a border, so the separator is put back here.
 */
const rowText = (el) => [...el.querySelectorAll('[data-testid="tag-suggestion"]')]
  .map((row) => [...row.querySelectorAll('.rn-tag-input__row-label .rn-tag-input__segment')]
    .map((s) => s.textContent)
    .join(':'));

describe('MoleculeHierarchicalTagInput — chips', () => {
  it('renders one chip per tag, split into a span per `:` segment', () => {
    const { el } = render({ value: ['area:health:fitness', 'morning'] });
    const chips = el.querySelectorAll('[data-testid="tag-chip"]');
    expect(chips).toHaveLength(2);
    expect([...chips[0].querySelectorAll('.rn-tag-input__segment')].map((s) => s.textContent))
      .toEqual(['area', 'health', 'fitness']);
    expect(chips[1].querySelectorAll('.rn-tag-input__segment')).toHaveLength(1);
  });

  it('weights segment 0 at 600 only when the tag has levels', () => {
    const { el } = render({ value: ['area:health', 'morning'] });
    const [levelled, flat] = el.querySelectorAll('[data-testid="tag-chip"]');
    expect(levelled.querySelectorAll('.rn-tag-input__segment')[0].style.fontWeight).toBe('600');
    expect(flat.querySelectorAll('.rn-tag-input__segment')[0].style.fontWeight).toBe('500');
  });

  it('divides later segments with a 1px left border and 5px of padding', () => {
    const { el } = render({ value: ['area:health:fitness'] });
    const segments = el.querySelectorAll('.rn-tag-input__segment');
    expect(segments[0].style.borderLeft).toBe('0px');
    expect(segments[0].style.paddingLeft).toBe('0px');
    expect(segments[1].style.fontWeight).toBe('500');
    expect(segments[1].style.borderLeftWidth).toBe('1px');
    expect(segments[1].style.borderLeftStyle).toBe('solid');
    expect(segments[1].style.paddingLeft).toBe('5px');
    // 5px on each side between segments; the last one does not pad right.
    expect(segments[1].style.paddingRight).toBe('5px');
    expect(segments[2].style.paddingRight).toBe('0px');
  });

  it('flashes a just-added chip blue for ~500ms, then settles', async () => {
    jest.useFakeTimers();
    try {
      const { cmp, el } = render({ value: ['morning'] });
      cmp.addTag('evening');
      await Vue.nextTick();
      const chips = el.querySelectorAll('[data-testid="tag-chip"]');
      expect(chips[1].className).toContain('rn-tag-input__chip--new');
      expect(chips[0].className).not.toContain('rn-tag-input__chip--new');

      jest.advanceTimersByTime(500);
      await Vue.nextTick();
      expect(el.querySelector('.rn-tag-input__chip--new')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('removes a chip from its round × without emitting anything else', () => {
    const { host, el } = render({ value: ['morning', 'evening'] });
    el.querySelectorAll('[data-testid="tag-remove"]')[0].click();
    expect(host.emitted).toEqual([['evening']]);
  });
});

describe('MoleculeHierarchicalTagInput — level-aware autocomplete', () => {
  it('offers only the children one level below the typed scope', async () => {
    const { cmp, el } = render();
    await type(cmp, 'area:');
    expect(rowText(el).sort()).toEqual(['area:family', 'area:health', 'area:work']);
    expect(rowText(el).some((t) => t.split(':').length > 2)).toBe(false);
  });

  it('narrows within the scope as more of the child is typed', async () => {
    const { cmp, el } = render();
    await type(cmp, 'area:health:s');
    expect(rowText(el)).toEqual(['area:health:sleep']);
  });

  it('puts top-level matches first, then deeper partials shortest-first', async () => {
    const { cmp, el } = render({
      universe: ['work', 'area:work', 'area:work:writing', 'project:workshop'],
    });
    await type(cmp, 'work');
    expect(rowText(el)).toEqual(['work', 'area:work', 'project:workshop', 'area:work:writing']);
  });

  it('excludes tags that are already applied', async () => {
    const { cmp, el } = render({ value: ['area:work'] });
    await type(cmp, 'area:');
    expect(rowText(el)).not.toContain('area:work');
  });

  it('shows at most 6 rows', async () => {
    const { cmp, el } = render({
      universe: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'],
    });
    await type(cmp, 't');
    expect(el.querySelectorAll('[data-testid="tag-suggestion"]')).toHaveLength(6);
  });

  it('keeps the menu shut until something is typed', async () => {
    const { cmp, el } = render();
    cmp.focused = true;
    await Vue.nextTick();
    expect(el.querySelector('[data-testid="tag-menu"]')).toBeNull();
  });

  it('heads the menu with the scope when the input names a level', async () => {
    const { cmp, el } = render();
    await type(cmp, 'area:health:f');
    expect(el.querySelector('[data-testid="tag-scope"]').textContent.replace(/\s+/g, ' ').trim())
      .toBe('subdirectory_arrow_right Inside area › health');
  });

  it('has no scope header while the input is still a single segment', async () => {
    const { cmp, el } = render();
    await type(cmp, 'area');
    expect(el.querySelector('[data-testid="tag-scope"]')).toBeNull();
  });
});

describe('MoleculeHierarchicalTagInput — drill-in and usage', () => {
  it('shows a `{n} inside` pill on a suggestion that has children', async () => {
    const { cmp, el } = render();
    await type(cmp, 'area:');
    const health = [...el.querySelectorAll('[data-testid="tag-suggestion"]')]
      .find((row) => row.textContent.indexOf('health') >= 0);
    expect(health.querySelector('[data-testid="tag-drill"]').textContent).toContain('3 inside');
  });

  it('drills into the pill instead of selecting the tag', async () => {
    const { cmp, host, el } = render();
    await type(cmp, 'area:');
    const health = [...el.querySelectorAll('[data-testid="tag-suggestion"]')]
      .find((row) => row.textContent.indexOf('health') >= 0);
    health.querySelector('[data-testid="tag-drill"]')
      .dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    await Vue.nextTick();
    expect(cmp.inputValue).toBe('area:health:');
    expect(host.emitted).toEqual([]);
  });

  it('selects the tag when the row itself is pressed', async () => {
    const { cmp, host, el } = render();
    await type(cmp, 'area:f');
    el.querySelector('[data-testid="tag-suggestion"]')
      .dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    expect(host.emitted).toEqual([['area:family']]);
  });

  it('shows a usage count on a leaf and never alongside the drill pill', async () => {
    const { cmp, el } = render({ usage: { 'area:family': 2, 'area:work': 7 } });
    await type(cmp, 'area:');
    const rows = [...el.querySelectorAll('[data-testid="tag-suggestion"]')];
    const family = rows.find((r) => r.textContent.indexOf('family') >= 0);
    const work = rows.find((r) => r.textContent.indexOf('work') >= 0);
    expect(family.querySelector('[data-testid="tag-usage"]').textContent).toBe('2 routines');
    expect(family.querySelector('[data-testid="tag-drill"]')).toBeNull();
    // area:work has a child, so it offers the drill pill rather than its count.
    expect(work.querySelector('[data-testid="tag-usage"]')).toBeNull();
    expect(work.querySelector('[data-testid="tag-drill"]')).not.toBeNull();
  });

  it('singularises the usage count', async () => {
    const { cmp, el } = render({ usage: { 'area:family': 1 } });
    await type(cmp, 'area:f');
    expect(el.querySelector('[data-testid="tag-usage"]').textContent).toBe('1 routine');
  });

  it('counts a tag known only through the usage map as part of the vocabulary', async () => {
    const { cmp, el } = render({ universe: [], usage: { 'area:health:sleep': 4 } });
    await type(cmp, 'area:');
    // The usage map named a leaf; its ancestors joined the universe with it.
    expect(rowText(el)).toEqual(['area:health']);
    expect(el.querySelector('[data-testid="tag-drill"]').textContent).toContain('1 inside');
  });
});

describe('MoleculeHierarchicalTagInput — the Create row', () => {
  it('offers to create a value that is new', async () => {
    const { cmp, el } = render();
    await type(cmp, 'area:health:yoga');
    const create = el.querySelector('[data-testid="tag-create"]');
    expect(create.textContent.replace(/\s+/g, ' ')).toContain('Create');
    // The value is drawn with the same per-segment chrome as a chip.
    expect([...create.querySelectorAll('.rn-tag-input__segment')].map((s) => s.textContent))
      .toEqual(['area', 'health', 'yoga']);
  });

  it('does not offer to create a tag that already exists', async () => {
    const { cmp, el } = render();
    await type(cmp, 'morning');
    expect(el.querySelector('[data-testid="tag-create"]')).toBeNull();
  });

  it('does not offer to create a tag that is already applied', async () => {
    const { cmp, el } = render({ value: ['yoga'], universe: [] });
    await type(cmp, 'yoga');
    expect(el.querySelector('[data-testid="tag-create"]')).toBeNull();
  });

  it('adds the normalised value when pressed', async () => {
    const { cmp, host, el } = render();
    await type(cmp, 'area::health::yoga');
    el.querySelector('[data-testid="tag-create"]')
      .dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
    expect(host.emitted).toEqual([['area:health:yoga']]);
  });
});

describe('MoleculeHierarchicalTagInput — keys that add', () => {
  ['Enter', 'Tab', ',', ' '].forEach((key) => {
    const label = {
      Enter: 'Enter', Tab: 'Tab', ',': 'Comma', ' ': 'Space',
    }[key];

    it(`adds the raw text on ${label}`, () => {
      const { cmp, host } = render({ value: ['morning'] });
      cmp.inputValue = 'deep-focus';
      cmp.onKeydown(makeEvent(key));
      expect(host.emitted).toEqual([['morning', 'deep-focus']]);
      expect(cmp.inputValue).toBe('');
    });
  });

  it('normalises what it adds', () => {
    const { cmp, host } = render();
    cmp.inputValue = ':area::health:';
    cmp.onKeydown(makeEvent('Enter'));
    expect(host.emitted).toEqual([['area:health']]);
  });

  it('prefers the arrow-highlighted suggestion over the typed text', async () => {
    const { cmp, host } = render();
    await type(cmp, 'area:');
    cmp.onKeydown(makeEvent('ArrowDown'));
    const highlighted = cmp.suggestions[0];
    cmp.onKeydown(makeEvent('Enter'));
    expect(host.emitted).toEqual([[highlighted]]);
  });

  it('is a silent no-op when the tag is already applied', () => {
    const { cmp, host } = render({ value: ['morning'] });
    cmp.inputValue = 'morning';
    cmp.onKeydown(makeEvent('Enter'));
    expect(host.emitted).toEqual([]);
    expect(cmp.inputValue).toBe('');
  });

  it('swallows a comma or space typed into an empty field', () => {
    [',', ' '].forEach((key) => {
      const { cmp, host } = render({ value: ['morning'] });
      const e = makeEvent(key);
      cmp.onKeydown(e);
      expect(e.preventDefault).toHaveBeenCalled();
      expect(host.emitted).toEqual([]);
    });
  });

  it('lets Tab traverse focus out of an empty field', () => {
    const { cmp, host } = render({ value: ['morning'] });
    const e = makeEvent('Tab');
    cmp.onKeydown(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(host.emitted).toEqual([]);
  });
});

describe('MoleculeHierarchicalTagInput — keys that navigate', () => {
  it('removes the last chip on Backspace over an empty field', () => {
    const { cmp, host } = render({ value: ['morning', 'evening'] });
    cmp.onKeydown(makeEvent('Backspace'));
    expect(host.emitted).toEqual([['morning']]);
  });

  it('leaves the chips alone on Backspace while text is being typed', () => {
    const { cmp, host } = render({ value: ['morning'] });
    cmp.inputValue = 'ev';
    cmp.onKeydown(makeEvent('Backspace'));
    expect(host.emitted).toEqual([]);
  });

  it('moves the highlight down on ArrowDown, clamped to the last row', async () => {
    const { cmp } = render();
    await type(cmp, 'area:');
    expect(cmp.suggestions).toHaveLength(3);
    cmp.onKeydown(makeEvent('ArrowDown'));
    expect(cmp.highlight).toBe(0);
    cmp.onKeydown(makeEvent('ArrowDown'));
    cmp.onKeydown(makeEvent('ArrowDown'));
    cmp.onKeydown(makeEvent('ArrowDown'));
    expect(cmp.highlight).toBe(2);
  });

  it('moves the highlight up on ArrowUp, clamped back to the typed text', async () => {
    const { cmp } = render();
    await type(cmp, 'area:');
    cmp.highlight = 1;
    cmp.onKeydown(makeEvent('ArrowUp'));
    expect(cmp.highlight).toBe(0);
    cmp.onKeydown(makeEvent('ArrowUp'));
    cmp.onKeydown(makeEvent('ArrowUp'));
    expect(cmp.highlight).toBe(-1);
  });

  it('marks the highlighted row so the eye can follow the arrows', async () => {
    const { cmp, el } = render();
    await type(cmp, 'area:');
    cmp.onKeydown(makeEvent('ArrowDown'));
    await Vue.nextTick();
    const rows = el.querySelectorAll('[data-testid="tag-suggestion"]');
    expect(rows[0].className).toContain('rn-tag-input__row--active');
    expect(rows[1].className).not.toContain('rn-tag-input__row--active');
  });

  it('drops the highlight when the text changes under it', async () => {
    const { cmp } = render();
    await type(cmp, 'area:');
    cmp.onKeydown(makeEvent('ArrowDown'));
    expect(cmp.highlight).toBe(0);
    await type(cmp, 'area:h');
    expect(cmp.highlight).toBe(-1);
  });

  it('drills into a highlighted parent on ArrowRight at the end of the text', async () => {
    const { cmp, host } = render();
    await type(cmp, 'area:h');
    cmp.onKeydown(makeEvent('ArrowDown'));
    expect(cmp.highlighted).toBe('area:health');
    const e = makeEvent('ArrowRight', { target: { selectionStart: 'area:h'.length } });
    cmp.onKeydown(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(cmp.inputValue).toBe('area:health:');
    expect(cmp.highlight).toBe(-1);
    expect(host.emitted).toEqual([]);
  });

  it('lets ArrowRight move the caret when it is not at the end of the text', async () => {
    const { cmp } = render();
    await type(cmp, 'area:h');
    cmp.onKeydown(makeEvent('ArrowDown'));
    const e = makeEvent('ArrowRight', { target: { selectionStart: 2 } });
    cmp.onKeydown(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(cmp.inputValue).toBe('area:h');
  });

  it('does not drill into a highlighted leaf', async () => {
    const { cmp } = render();
    await type(cmp, 'area:health:s');
    cmp.onKeydown(makeEvent('ArrowDown'));
    expect(cmp.highlighted).toBe('area:health:sleep');
    const e = makeEvent('ArrowRight', { target: { selectionStart: 'area:health:s'.length } });
    cmp.onKeydown(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(cmp.inputValue).toBe('area:health:s');
  });

  it('does nothing on ArrowRight with no highlight', async () => {
    const { cmp } = render();
    await type(cmp, 'area:h');
    const e = makeEvent('ArrowRight', { target: { selectionStart: 'area:h'.length } });
    cmp.onKeydown(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(cmp.inputValue).toBe('area:h');
  });

  it('clears the highlight and blurs on Escape', async () => {
    const { cmp } = render();
    await type(cmp, 'area:');
    cmp.highlight = 1;
    const e = makeEvent('Escape');
    cmp.onKeydown(e);
    expect(cmp.highlight).toBe(-1);
    expect(e.target.blur).toHaveBeenCalled();
  });

  it('claims Escape while suggestions are open so an enclosing sheet stays open', async () => {
    const { cmp } = render();
    await type(cmp, 'area:');
    expect(cmp.suggestions.length).toBeGreaterThan(0);
    const e = makeEvent('Escape');
    cmp.onKeydown(e);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('lets Escape through to the sheet when no suggestions are showing', () => {
    const { cmp } = render();
    const e = makeEvent('Escape');
    cmp.onKeydown(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});

describe('MoleculeHierarchicalTagInput — copy and chrome', () => {
  it('invites the first tag when the field is empty', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="tag-text-input"]').placeholder)
      .toBe('Empty · type area:work…');
  });

  it('switches to the short placeholder once a tag is there', () => {
    const { el } = render({ value: ['morning'] });
    expect(el.querySelector('[data-testid="tag-text-input"]').placeholder).toBe('Add tag…');
  });

  it('spells out the keys under the field', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="tag-hint"]').textContent)
      .toBe('Enter, Tab, comma or space adds · Backspace removes the last tag');
  });

  it('lets the host replace or drop the helper line', () => {
    const { el } = render({ hint: '' });
    expect(el.querySelector('[data-testid="tag-hint"]').textContent).toBe('');
  });

  it('never lets a space reach the value', () => {
    const { cmp } = render();
    cmp.onInput({ target: { value: 'area: health work' } });
    expect(cmp.inputValue).toBe('area:healthwork');
  });

  it('keeps focus visible on the field while the input has it', async () => {
    const { cmp, el } = render();
    cmp.focused = true;
    await Vue.nextTick();
    expect(el.querySelector('[data-testid="tag-field"]').className)
      .toContain('rn-tag-input__field--focused');
  });
});
