import CodeMirror from 'codemirror';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/gfm/gfm';
import 'codemirror/addon/edit/continuelist';
import registerListContinuationGuard from '../listContinuation';

// jsdom has no layout, so CodeMirror's character measuring needs a stub.
beforeAll(() => {
  Range.prototype.getBoundingClientRect = () => ({
    top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0,
  });
  Range.prototype.getClientRects = () => [];
});

/**
 * Builds a CodeMirror editor wired the way EasyMDE wires it (gfm mode, Enter
 * bound to the markdown list continuation command) with the guard attached.
 */
function createEditor() {
  const editor = CodeMirror(document.createElement('div'), {
    mode: { name: 'gfm', gitHubSpice: false },
    extraKeys: { Enter: 'newlineAndIndentContinueMarkdownList' },
  });
  registerListContinuationGuard(editor);
  return editor;
}

// One character at a time, the way a keyboard delivers it.
function type(editor, text) {
  text.split('').forEach((char) => editor.replaceSelection(char, 'end', '+input'));
}

function pressEnter(editor) {
  editor.execCommand('newlineAndIndentContinueMarkdownList');
}

function paste(editor, text) {
  editor.replaceSelection(text, 'end', 'paste');
}

describe('list continuation guard', () => {
  it('keeps one marker when the user types it on every line', () => {
    const editor = createEditor();

    type(editor, '- Morning: 45-minute strength training workout.');
    pressEnter(editor);
    type(editor, '- Afternoon: 1-hour study session on planned topic.');
    pressEnter(editor);
    type(editor, '- Evening: Journal for 15 minutes.');

    expect(editor.getValue()).toBe([
      '- Morning: 45-minute strength training workout.',
      '- Afternoon: 1-hour study session on planned topic.',
      '- Evening: Journal for 15 minutes.',
    ].join('\n'));
  });

  it('keeps one marker when list content is pasted onto a continued line', () => {
    const editor = createEditor();

    type(editor, '- Morning: workout.');
    pressEnter(editor);
    paste(editor, '- Afternoon: study.\n- Evening: journal.');

    expect(editor.getValue()).toBe([
      '- Morning: workout.',
      '- Afternoon: study.',
      '- Evening: journal.',
    ].join('\n'));
  });

  it('keeps one marker in an ordered list', () => {
    const editor = createEditor();

    type(editor, '1. Morning: workout.');
    pressEnter(editor);
    type(editor, '2. Afternoon: study.');

    expect(editor.getValue()).toBe('1. Morning: workout.\n2. Afternoon: study.');
  });

  it('keeps one marker in a task list', () => {
    const editor = createEditor();

    type(editor, '- [ ] Morning: workout.');
    pressEnter(editor);
    type(editor, '- [ ] Afternoon: study.');

    expect(editor.getValue()).toBe('- [ ] Morning: workout.\n- [ ] Afternoon: study.');
  });

  it('still auto-continues for users who omit the marker', () => {
    const editor = createEditor();

    type(editor, '- Morning: workout.');
    pressEnter(editor);
    type(editor, 'Afternoon: study.');

    expect(editor.getValue()).toBe('- Morning: workout.\n- Afternoon: study.');
  });

  it('leaves content that merely starts with a dash alone', () => {
    const editor = createEditor();

    type(editor, '- Morning: workout.');
    pressEnter(editor);
    type(editor, '-5 degrees outside.');

    expect(editor.getValue()).toBe('- Morning: workout.\n- -5 degrees outside.');
  });

  it('leaves a nested list indented by the user alone', () => {
    const editor = createEditor();

    editor.setValue('- Morning: workout.\n');
    editor.setCursor({ line: 1, ch: 0 });
    type(editor, '  - Treadmill.');

    expect(editor.getValue()).toBe('- Morning: workout.\n  - Treadmill.');
  });
});
