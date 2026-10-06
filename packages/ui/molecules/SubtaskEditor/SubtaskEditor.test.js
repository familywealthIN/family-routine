/* eslint-env jest */
/**
 * SubtaskEditor — the five gestures the goal-item page needs on a subtask.
 *
 * Add, rename, tick, move up, remove. The two that are easy to get wrong and are
 * therefore pinned hardest:
 *
 *   * **Backspace on an empty row removes it.** The guard reads the value BEFORE
 *     the keystroke, so it must not fire while there is still a character to
 *     delete — otherwise typing a name and backspacing a typo would delete the
 *     row out from under the cursor.
 *   * **Move up is dead on the first row.** It cannot emit, because a reorder
 *     round trip that changes nothing still rewrites the parent's array.
 */
const Vue = require('vue');

const SubtaskEditor = require('./SubtaskEditor.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const SUBTASKS = [
  { id: 's1', body: 'Fix ring offsets', isComplete: true },
  { id: 's2', body: 'Add tests', isComplete: false },
  { id: 's3', body: 'Request review', isComplete: false },
];

const render = (props = {}) => {
  const vm = new Vue({
    render(h) {
      return h(SubtaskEditor, { props: { subtasks: SUBTASKS, ...props } });
    },
  }).$mount();
  const editor = vm.$children[0];
  const events = {};
  ['add', 'rename', 'toggle', 'move-up', 'remove'].forEach((name) => {
    events[name] = [];
    editor.$on(name, (payload) => events[name].push(payload));
  });
  return { vm, el: vm.$el, editor, events };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);
const all = (el, testid) => Array.from(el.querySelectorAll(`[data-testid="${testid}"]`));

describe('SubtaskEditor — progress', () => {
  it('counts done over total', () => {
    const { el } = render();
    expect(q(el, 'subtask-count').textContent).toBe('1/3 done');
    expect(q(el, 'subtask-progress').style.width).toBe('33%');
  });

  it('says "None yet" rather than 0/0 when there are none', () => {
    const { el } = render({ subtasks: [] });
    expect(q(el, 'subtask-count').textContent).toBe('None yet');
    expect(q(el, 'subtask-progress').style.width).toBe('0%');
  });

  it('drops a duplicated id so two rows cannot share a :key', () => {
    const { el } = render({
      subtasks: [...SUBTASKS, { id: 's1', body: 'Fix ring offsets', isComplete: true }],
    });
    expect(all(el, 'subtask-row')).toHaveLength(3);
  });
});

describe('SubtaskEditor — add', () => {
  it('Enter emits the trimmed body and clears the draft', () => {
    const { el, editor, events } = render();
    const input = q(el, 'subtask-add-input');
    input.value = '  Ship it  ';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(events.add).toEqual(['Ship it']);
    expect(editor.draft).toBe('');
  });

  it('Enter on an empty draft does nothing', () => {
    const { el, events } = render();
    q(el, 'subtask-add-input')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(events.add).toEqual([]);
  });
});

describe('SubtaskEditor — rename', () => {
  it('emits the subtask and its new body on change', () => {
    const { el, events } = render();
    const input = all(el, 'subtask-input')[1];
    input.value = 'Add tests for the routine query';
    input.dispatchEvent(new Event('change'));
    expect(events.rename).toEqual([
      { subtask: SUBTASKS[1], body: 'Add tests for the routine query' },
    ]);
  });

  it('stays quiet when the text did not actually change', () => {
    const { el, events } = render();
    const input = all(el, 'subtask-input')[1];
    input.value = '  Add tests  ';
    input.dispatchEvent(new Event('change'));
    expect(events.rename).toEqual([]);
  });

  it('treats an emptied row as a removal, not a rename to ""', () => {
    const { el, events } = render();
    const input = all(el, 'subtask-input')[1];
    input.value = '';
    input.dispatchEvent(new Event('change'));
    expect(events.rename).toEqual([]);
    expect(events.remove).toEqual([SUBTASKS[1]]);
  });
});

describe('SubtaskEditor — Backspace on an empty row', () => {
  it('removes the row', () => {
    const { el, events } = render({
      subtasks: [{ id: 's9', body: '', isComplete: false }],
    });
    const input = all(el, 'subtask-input')[0];
    input.value = '';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(events.remove).toEqual([{ id: 's9', body: '', isComplete: false }]);
  });

  it('does nothing while there is still a character to delete', () => {
    const { el, events } = render();
    const input = all(el, 'subtask-input')[1];
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(events.remove).toEqual([]);
  });
});

describe('SubtaskEditor — move up and remove', () => {
  it('emits move-up for any row but the first', () => {
    const { el, events } = render();
    all(el, 'subtask-up')[2].click();
    expect(events['move-up']).toEqual([SUBTASKS[2]]);
  });

  it('is inert on the first row', () => {
    const { el, events } = render();
    const first = all(el, 'subtask-up')[0];
    expect(first.className).toContain('rn-subed__up--off');
    first.click();
    expect(events['move-up']).toEqual([]);
  });

  it('emits remove from the close icon', () => {
    const { el, events } = render();
    all(el, 'subtask-remove')[0].click();
    expect(events.remove).toEqual([SUBTASKS[0]]);
  });

  it('emits toggle from the checkbox', () => {
    const { el, events } = render();
    all(el, 'subtask-toggle')[1].click();
    expect(events.toggle).toEqual([SUBTASKS[1]]);
  });
});
