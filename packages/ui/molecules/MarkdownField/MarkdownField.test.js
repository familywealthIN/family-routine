/* eslint-env jest */
/**
 * MarkdownField — the CONTRIBUTION field's Edit / Preview round trip.
 *
 * Preview is the resting state and the preview itself is the way into edit mode,
 * which is the whole interaction. The editor and the renderer are stubbed: this
 * file is about WHEN each one is mounted and what leaves the component, not about
 * EasyMDE or marked.
 *
 * `commit` is the save signal the container depends on. It must carry the
 * TYPED text, fire once typing pauses (autosave) or edit mode is left, and never
 * fire for unchanged text — a commit per keystroke would be a mutation per
 * keystroke. Every old test here committed without typing, which is how a field
 * that always committed the stale prop (and so never saved) passed them all.
 */
jest.mock('@routine-notes/markdown-editor', () => ({
  __esModule: true,
  MarkdownEditor: {
    name: 'MarkdownEditor',
    props: ['value', 'variant', 'editorKey'],
    render(h) {
      return h('textarea', {
        attrs: { 'data-testid': 'stub-editor' },
        domProps: { value: this.value },
        on: { input: (e) => this.$emit('input', e.target.value) },
      });
    },
  },
}));

jest.mock('vue-markdown', () => ({
  __esModule: true,
  default: {
    name: 'VueMarkdown',
    props: ['source', 'html'],
    render(h) {
      return h('div', { attrs: { 'data-testid': 'stub-rendered' } }, this.source);
    },
  },
}));

const Vue = require('vue');

const { default: MarkdownField, AUTOSAVE_MS } = require('./MarkdownField.vue');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const render = (props = {}) => {
  const vm = new Vue({
    render(h) {
      return h(MarkdownField, { props: { value: 'Closes the **blocker**.', ...props } });
    },
  }).$mount();
  const field = vm.$children[0];
  const events = { input: [], commit: [], editing: [] };
  Object.keys(events).forEach((name) => {
    field.$on(name, (payload) => events[name].push(payload));
  });
  return { vm, el: vm.$el, field, events };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);

describe('MarkdownField — preview is the resting state', () => {
  it('renders the preview, not the editor', () => {
    const { el } = render();
    expect(q(el, 'markdown-preview')).toBeTruthy();
    expect(q(el, 'markdown-editor')).toBeNull();
    expect(q(el, 'markdown-toggle').textContent.trim()).toContain('Edit');
  });

  it('renders the markdown with html turned OFF', () => {
    const { el, field } = render();
    const renderer = field.$children.find((child) => child.$options.name === 'VueMarkdown');
    expect(renderer.source).toBe('Closes the **blocker**.');
    expect(renderer.html).toBe(false);
    expect(q(el, 'stub-rendered')).toBeTruthy();
  });

  it('renders under the shared rn-markdown styles the editor preview also uses', () => {
    // Same class as the EasyMDE preview pane, so Preview here and the editor's
    // eye button look identical and images are width-capped in both.
    const { el } = render();
    expect(q(el, 'stub-rendered').classList.contains('rn-markdown')).toBe(true);
  });

  it('shows the placeholder instead of an empty preview', () => {
    const { el } = render({ value: '   ' });
    expect(q(el, 'markdown-preview').textContent.trim())
      .toBe('Click to add a contribution…');
    expect(q(el, 'stub-rendered')).toBeNull();
  });
});

describe('MarkdownField — entering edit mode', () => {
  it('clicking the preview opens the editor', async () => {
    const { el, field, events } = render();
    q(el, 'markdown-preview').click();
    await Vue.nextTick();
    expect(field.editing).toBe(true);
    expect(q(el, 'markdown-editor')).toBeTruthy();
    expect(q(el, 'markdown-preview')).toBeNull();
    expect(events.editing).toEqual([true]);
  });

  it('the toggle opens it too, and relabels itself', async () => {
    const { el, field } = render();
    q(el, 'markdown-toggle').dispatchEvent(new MouseEvent('mousedown'));
    await Vue.nextTick();
    expect(field.editing).toBe(true);
    expect(q(el, 'markdown-toggle').textContent.trim()).toContain('Preview');
  });

  it('a click on a link inside the rendered text is a link, not an edit', async () => {
    const { el, field } = render();
    const preview = q(el, 'markdown-preview');
    const anchor = document.createElement('a');
    preview.appendChild(anchor);
    anchor.click();
    await Vue.nextTick();
    expect(field.editing).toBe(false);
  });
});

describe('MarkdownField — typing and committing', () => {
  afterEach(() => jest.useRealTimers());

  const openAndType = async (el, text) => {
    q(el, 'markdown-preview').click();
    await Vue.nextTick();
    const editor = q(el, 'stub-editor');
    editor.value = text;
    editor.dispatchEvent(new Event('input'));
  };

  it('input fires per keystroke, commit does not', async () => {
    const { el, events } = render();
    await openAndType(el, 'Closes the blocker. Now with tests.');
    expect(events.input).toEqual(['Closes the blocker. Now with tests.']);
    expect(events.commit).toEqual([]);
  });

  it('autosaves the typed text once typing pauses', async () => {
    jest.useFakeTimers();
    const { el, field, events } = render();
    await openAndType(el, 'First draft');
    jest.advanceTimersByTime(AUTOSAVE_MS - 1);
    expect(events.commit).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(events.commit).toEqual(['First draft']);
    // Still editing — an autosave does not close the editor.
    expect(field.editing).toBe(true);
  });

  it('restarts the autosave on every keystroke, then commits the latest text', async () => {
    jest.useFakeTimers();
    const { el, events } = render();
    await openAndType(el, 'One');
    jest.advanceTimersByTime(AUTOSAVE_MS - 100);
    const editor = q(el, 'stub-editor');
    editor.value = 'One two';
    editor.dispatchEvent(new Event('input'));
    jest.advanceTimersByTime(AUTOSAVE_MS - 100);
    expect(events.commit).toEqual([]);
    jest.advanceTimersByTime(100);
    expect(events.commit).toEqual(['One two']);
  });

  it('leaving edit mode commits the TYPED text, not the old prop', async () => {
    const { el, events } = render();
    await openAndType(el, 'Closes the blocker. Now with tests.');
    q(el, 'markdown-toggle').dispatchEvent(new MouseEvent('mousedown'));
    await Vue.nextTick();
    expect(events.commit).toEqual(['Closes the blocker. Now with tests.']);
    expect(q(el, 'stub-rendered').textContent).toBe('Closes the blocker. Now with tests.');
  });

  it('commits nothing when the text did not change', async () => {
    const { el, events } = render();
    q(el, 'markdown-preview').click();
    await Vue.nextTick();
    q(el, 'markdown-toggle').dispatchEvent(new MouseEvent('mousedown'));
    await Vue.nextTick();
    expect(events.commit).toEqual([]);
  });

  it('does not commit the same text twice (autosave, then leaving)', async () => {
    jest.useFakeTimers();
    const { el, field, events } = render();
    await openAndType(el, 'Saved once');
    jest.advanceTimersByTime(AUTOSAVE_MS);
    field.setEditing(false);
    expect(events.commit).toEqual(['Saved once']);
  });

  it('flush() commits an open edit, and is a no-op with nothing typed', async () => {
    const { el, field, events } = render();
    field.flush();
    expect(events.commit).toEqual([]);

    await openAndType(el, 'Typed then closed');
    field.flush();
    expect(events.commit).toEqual(['Typed then closed']);
    expect(field.editing).toBe(false);
  });

  it('a save landing mid-edit does not reseed the editor', async () => {
    const host = new Vue({
      data: () => ({ value: 'old' }),
      render(h) {
        return h(MarkdownField, { props: { value: this.value } });
      },
    }).$mount();
    const field = host.$children[0];
    field.setEditing(true);
    await Vue.nextTick();
    field.onInput('old plus more typed');
    host.value = 'old plus';
    await Vue.nextTick();
    expect(field.draft).toBe('old plus more typed');
  });

  it('a different item closes the editor and drops its pending autosave', async () => {
    jest.useFakeTimers();
    // The parent owns editorKey, so swapping it is a real prop change — the
    // guard exists because a sheet reused for the next goal item would otherwise
    // open on that item mid-edit, or save the old text onto it.
    const host = new Vue({
      data: () => ({ editorKey: 'g1', value: 'text' }),
      render(h) {
        return h(MarkdownField, { props: { value: this.value, editorKey: this.editorKey } });
      },
    }).$mount();
    const field = host.$children[0];
    const commits = [];
    field.$on('commit', (text) => commits.push(text));
    field.setEditing(true);
    await Vue.nextTick();
    field.onInput('typed for g1');

    host.editorKey = 'g2';
    host.value = 'g2 text';
    await Vue.nextTick();
    jest.advanceTimersByTime(AUTOSAVE_MS);
    expect(field.editing).toBe(false);
    expect(commits).toEqual([]);
    expect(field.draft).toBe('g2 text');
  });

  it('commits a pending draft when it is destroyed', async () => {
    const { el, vm, events } = render();
    await openAndType(el, 'Typed then navigated away');
    vm.$destroy();
    expect(events.commit).toEqual(['Typed then navigated away']);
  });
});

describe('MarkdownField — stats', () => {
  it('counts lines and words', () => {
    const { field } = render({ value: 'one two\nthree' });
    expect(field.stats).toBe('2 lines · 3 words');
  });
});
