/* eslint-env jest */
/**
 * Unit tests for the shared tag-input keydown helper.
 *
 * This is the single source of truth for tag-commit behaviour across every tag
 * input (GoalTagsInput, AiSearchModal, …): Enter / Tab / Comma / Space commit,
 * Tab on an empty field traverses focus, and Backspace over an empty field
 * removes the trailing tag.
 */
const { handleTagInputKeydown, TAG_COMMIT_KEYS } = require('../utils/tagKeydown');

const makeEvent = (key) => ({ key, preventDefault: jest.fn() });

const makeHandlers = (overrides = {}) => ({
  getValue: () => 'focus',
  commit: jest.fn(),
  canRemoveLast: () => false,
  removeLast: jest.fn(),
  ...overrides,
});

describe('handleTagInputKeydown', () => {
  describe('commit keys with a value', () => {
    const cases = {
      Enter: 'Enter', Tab: 'Tab', ',': 'Comma', ' ': 'Space',
    };

    Object.keys(cases).forEach((key) => {
      it(`commits the value and prevents default on ${cases[key]}`, () => {
        const handlers = makeHandlers({ getValue: () => 'focus' });
        const e = makeEvent(key);

        const handled = handleTagInputKeydown(e, handlers);

        expect(handlers.commit).toHaveBeenCalledWith('focus');
        expect(handlers.commit).toHaveBeenCalledTimes(1);
        expect(e.preventDefault).toHaveBeenCalled();
        expect(handled).toBe(true);
      });
    });

    it('passes the raw (untrimmed) value to commit — trimming is the host\'s job', () => {
      const handlers = makeHandlers({ getValue: () => '  focus  ' });

      handleTagInputKeydown(makeEvent('Enter'), handlers);

      expect(handlers.commit).toHaveBeenCalledWith('  focus  ');
    });
  });

  describe('Tab must not trap focus on an empty field', () => {
    it('does not commit or preventDefault on Tab when empty', () => {
      const handlers = makeHandlers({ getValue: () => '' });
      const e = makeEvent('Tab');

      const handled = handleTagInputKeydown(e, handlers);

      expect(handlers.commit).not.toHaveBeenCalled();
      expect(e.preventDefault).not.toHaveBeenCalled();
      expect(handled).toBe(false);
    });

    it('treats a whitespace-only field as empty for Tab', () => {
      const handlers = makeHandlers({ getValue: () => '   ' });
      const e = makeEvent('Tab');

      const handled = handleTagInputKeydown(e, handlers);

      expect(handlers.commit).not.toHaveBeenCalled();
      expect(e.preventDefault).not.toHaveBeenCalled();
      expect(handled).toBe(false);
    });
  });

  describe('delimiter chars never reach an empty field', () => {
    [[',', 'Comma'], [' ', 'Space']].forEach(([key, label]) => {
      it(`swallows ${label} on an empty field without committing`, () => {
        const handlers = makeHandlers({ getValue: () => '' });
        const e = makeEvent(key);

        const handled = handleTagInputKeydown(e, handlers);

        expect(handlers.commit).not.toHaveBeenCalled();
        expect(e.preventDefault).toHaveBeenCalled();
        expect(handled).toBe(true);
      });
    });

    it('prevents default on Enter over an empty field but does not commit', () => {
      const handlers = makeHandlers({ getValue: () => '' });
      const e = makeEvent('Enter');

      handleTagInputKeydown(e, handlers);

      expect(handlers.commit).not.toHaveBeenCalled();
      expect(e.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Backspace removes the trailing tag', () => {
    it('calls removeLast when canRemoveLast is true, without preventing default', () => {
      const handlers = makeHandlers({ canRemoveLast: () => true });
      const e = makeEvent('Backspace');

      const handled = handleTagInputKeydown(e, handlers);

      expect(handlers.removeLast).toHaveBeenCalledTimes(1);
      expect(e.preventDefault).not.toHaveBeenCalled();
      expect(handled).toBe(true);
    });

    it('does nothing when canRemoveLast is false', () => {
      const handlers = makeHandlers({ canRemoveLast: () => false });
      const e = makeEvent('Backspace');

      const handled = handleTagInputKeydown(e, handlers);

      expect(handlers.removeLast).not.toHaveBeenCalled();
      expect(handled).toBe(false);
    });
  });

  describe('non-tag keys', () => {
    ['a', 'ArrowDown', 'ArrowUp', 'Escape'].forEach((key) => {
      it(`ignores "${key}" (not handled here)`, () => {
        const handlers = makeHandlers();
        const e = makeEvent(key);

        const handled = handleTagInputKeydown(e, handlers);

        expect(handlers.commit).not.toHaveBeenCalled();
        expect(handlers.removeLast).not.toHaveBeenCalled();
        expect(e.preventDefault).not.toHaveBeenCalled();
        expect(handled).toBe(false);
      });
    });
  });

  describe('TAG_COMMIT_KEYS', () => {
    it('is exactly Enter, Tab, Comma and Space', () => {
      expect(TAG_COMMIT_KEYS).toEqual(['Enter', 'Tab', ',', ' ']);
    });
  });
});
