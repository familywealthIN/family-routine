/**
 * EasyMDE binds Enter to CodeMirror's `newlineAndIndentContinueMarkdownList`
 * unconditionally, so pressing Enter inside a list copies the marker onto the
 * next line. A user who keeps typing their own marker — or pastes a block of
 * list lines onto the continued line — gets it twice ("- - item"), silently
 * corrupting the text. EasyMDE exposes no option to drop that binding, so
 * instead we let the marker we auto-inserted give way to the one the user
 * supplies.
 */

// The list openers continuelist reproduces, minus blockquotes: "> > " is a
// legitimate nested quote, "- - " never is.
const MARKER = '(?:[*+-] \\[[x ]\\]|[*+-]|\\d+[.)])';
// Indentation, the auto-inserted marker, then a second complete marker sitting
// where the item text should have started.
const DOUBLED_MARKER = new RegExp(`^(\\s*)(${MARKER}\\s+)(?:${MARKER}\\s)`);

// Edits a person made. Programmatic ones (setValue, undo, the continuation
// itself) have to pass through untouched.
const USER_ORIGINS = ['+input', 'paste'];

function dropDoubledListMarker(codemirror, change) {
  if (USER_ORIGINS.indexOf(change.origin) === -1) return;
  // Only plain insertions; a replacement already overwrites the marker.
  if (change.from.line !== change.to.line || change.from.ch !== change.to.ch) return;

  const line = codemirror.getLine(change.from.line);
  if (typeof line !== 'string') return;

  const before = line.slice(0, change.from.ch);
  const match = DOUBLED_MARKER.exec(before + change.text[0]);
  if (!match) return;

  const autoEnd = match[1].length + match[2].length;
  // The first marker has to be the one already in the document, and the text
  // before the caret has to be nothing but the two markers.
  if (before.length < autoEnd || before.length > match[0].length) return;

  const text = change.text.slice();
  text[0] = before.slice(autoEnd) + text[0];
  change.update({ line: change.from.line, ch: match[1].length }, change.to, text);
}

/**
 * Attaches the guard to an EasyMDE instance's CodeMirror editor.
 */
module.exports = function registerListContinuationGuard(codemirror) {
  codemirror.on('beforeChange', dropDoubledListMarker);
};
