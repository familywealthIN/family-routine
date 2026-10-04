/* eslint-env jest */
/**
 * MarkdownField — the CONTRIBUTION field's Edit / Preview round trip.
 *
 * Preview is the resting state and the preview itself is the way into edit mode,
 * which is the whole interaction. The editor and the renderer are stubbed: this
 * file is about WHEN each one is mounted and what leaves the component, not about
 * EasyMDE or marked.
 *
 * `commit` firing exactly once, on the way OUT of edit mode, is the contract the
 * container depends on — it saves on commit, so a commit per keystroke would be a
 * mutation per keystroke.
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

const MarkdownField = require('./MarkdownField.vue').default;

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
  it('input fires per keystroke, commit does not', async () => {
    const { el, events } = render();
    q(el, 'markdown-preview').click();
    await Vue.nextTick();

    const editor = q(el, 'stub-editor');
    editor.value = 'Closes the blocker. Now with tests.';
    editor.dispatchEvent(new Event('input'));
    expect(events.input).toEqual(['Closes the blocker. Now with tests.']);
    expect(events.commit).toEqual([]);
  });

  it('leaving edit mode commits once', async () => {
    const { el, events } = render();
    q(el, 'markdown-preview').click();
    await Vue.nextTick();
    q(el, 'markdown-toggle').dispatchEvent(new MouseEvent('mousedown'));
    await Vue.nextTick();
    expect(events.commit).toEqual(['Closes the **blocker**.']);
    expect(q(el, 'markdown-preview')).toBeTruthy();
  });

  it('flush() commits an open editor, and is a no-op when closed', async () => {
    const { field, events } = render();
    field.flush();
    expect(events.commit).toEqual([]);

    field.setEditing(true);
    await Vue.nextTick();
    field.flush();
    expect(events.commit).toEqual(['Closes the **blocker**.']);
  });

  it('a different item closes the editor rather than carrying it over', async () => {
    // The parent owns editorKey, so swapping it is a real prop change — the
    // guard exists because a sheet reused for the next goal item would otherwise
    // open on that item mid-edit.
    const host = new Vue({
      data: () => ({ editorKey: 'g1' }),
      render(h) {
        return h(MarkdownField, { props: { value: 'text', editorKey: this.editorKey } });
      },
    }).$mount();
    const field = host.$children[0];
    field.setEditing(true);
    await Vue.nextTick();
    expect(field.editing).toBe(true);

    host.editorKey = 'g2';
    await Vue.nextTick();
    expect(field.editing).toBe(false);
  });
});

describe('MarkdownField — stats', () => {
  it('counts lines and words', () => {
    const { field } = render({ value: 'one two\nthree' });
    expect(field.stats).toBe('2 lines · 3 words');
  });
});
