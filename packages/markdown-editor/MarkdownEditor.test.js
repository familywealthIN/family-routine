/* eslint-env jest */
/**
 * MarkdownEditor — the contract with vue-easymde.
 *
 * This wrapper's only job is to carry text in and out of EasyMDE, and both
 * directions go through vue-easymde 2.x's `modelValue` / `update:modelValue`
 * pair rather than the Vue 2 `value` / `input` pair the rest of the codebase
 * uses. Nothing else in the repo speaks that protocol, so a rename on either
 * side would silently stop forwarding keystrokes — and every consumer above
 * (MarkdownField, the goal sheet's CONTRIBUTION) saves on text it never got,
 * with no error anywhere. D-05 was filed against exactly that failure shape.
 *
 * So the real EasyMDE is mounted here, not a stub: the seam under test IS the
 * third-party component.
 */

// CodeMirror measures text with Range#getBoundingClientRect, which jsdom lacks.
const emptyRect = () => ({
  top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0,
});
window.Range.prototype.getBoundingClientRect = emptyRect;
window.Range.prototype.getClientRects = () => ({ length: 0, item: () => null });

const Vue = require('vue');

const MarkdownEditor = require('./MarkdownEditor.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = (value = '') => {
  const host = new Vue({
    data: () => ({ value }),
    render(h) {
      return h(MarkdownEditor, { props: { value: this.value } });
    },
  }).$mount();
  document.body.appendChild(host.$el);
  const editor = host.$children[0];
  const inputs = [];
  editor.$on('input', (text) => inputs.push(text));
  return { host, editor, inputs };
};

describe('MarkdownEditor — text in and out of EasyMDE', () => {
  it('seeds CodeMirror with the value it was given', async () => {
    const { editor } = mount('Closes the last blocker.');
    await Vue.nextTick();
    expect(editor.getEditorInstance().value()).toBe('Closes the last blocker.');
  });

  it('emits input with the TYPED text, so a parent can own the draft', async () => {
    const { editor, inputs } = mount('Closes the last blocker.');
    await Vue.nextTick();
    const cm = editor.getEditorInstance().codemirror;
    cm.setCursor({ line: 0, ch: 24 });
    cm.replaceSelection('\n- and the new bullet');
    await Vue.nextTick();

    expect(cm.getValue()).toBe('Closes the last blocker.\n- and the new bullet');
    expect(inputs[inputs.length - 1]).toBe('Closes the last blocker.\n- and the new bullet');
  });

  it('writes an outside change back into CodeMirror', async () => {
    const { host, editor } = mount('first');
    await Vue.nextTick();
    host.value = 'second';
    await Vue.nextTick();
    expect(editor.getEditorInstance().value()).toBe('second');
  });
});
