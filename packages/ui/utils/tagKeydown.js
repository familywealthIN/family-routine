/**
 * Shared keydown routing for inline tag inputs (GoalTagsInput, AiSearchModal, …).
 *
 * Keeps every tag input's commit behaviour identical so they can't drift apart
 * (which is how one input ended up committing on comma while another didn't).
 *
 * Behaviour:
 * - Enter / Tab / Comma / Space commit the current value as a tag.
 * - Tab on an empty field is left untouched so focus can traverse normally.
 * - Comma / Space always have their literal character prevented (never typed).
 * - Backspace over an empty field removes the trailing tag.
 *
 * State access is delegated so each host keeps its own data shape.
 */

/**
 * Keys that commit the current tag.
 * @type {string[]}
 */
export const TAG_COMMIT_KEYS = ['Enter', 'Tab', ',', ' '];

/**
 * @param {KeyboardEvent} e - the keydown event
 * @param {Object} handlers
 * @param {() => string} handlers.getValue - current text (or highlighted suggestion)
 * @param {(value: string) => void} handlers.commit - add the tag
 * @param {() => boolean} handlers.canRemoveLast - true when the field is empty and tags exist
 * @param {() => void} handlers.removeLast - remove the trailing tag
 * @returns {boolean} whether the key was handled here (lets the host skip its own routing)
 */
export function handleTagInputKeydown(e, {
  getValue, commit, canRemoveLast, removeLast,
}) {
  if (TAG_COMMIT_KEYS.includes(e.key)) {
    const value = getValue();
    const hasValue = !!(value && value.trim());
    // An empty field + Tab should move focus normally, not trap it.
    if (e.key === 'Tab' && !hasValue) {
      return false;
    }
    // Prevent the delimiter char (comma/space) from being typed and keep focus
    // in the field so multiple tags can be added in a row.
    e.preventDefault();
    if (hasValue) {
      commit(value);
    }
    return true;
  }
  if (e.key === 'Backspace' && canRemoveLast()) {
    removeLast();
    return true;
  }
  return false;
}
