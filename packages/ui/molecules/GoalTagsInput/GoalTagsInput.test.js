/* eslint-env jest */
/**
 * Unit tests for MoleculeGoalTagsInput.
 *
 * The commit/backspace routing itself is covered exhaustively in
 * tests/tagKeydown.spec.js (the shared helper). Here we verify:
 *  - the component wires that helper up correctly (end-to-end through the real
 *    addTag/removeTag so a keypress actually emits update-new-tag-items), and
 *  - the autocomplete navigation that is specific to this input.
 *
 * Methods are exercised against a minimal vm-like context (no mount needed),
 * matching the AgendaTaskList.test.js convention.
 */
const GoalTagsInput = require('./GoalTagsInput.vue').default;

const makeEvent = (key) => ({ key, preventDefault: jest.fn() });

// Context wired with the component's REAL addTag/removeTag so `this.addTag(...)`
// inside handleKeydown runs the genuine emit path (this === ctx).
const makeCtx = (overrides = {}) => ({
  activeSuggestion: null,
  inputValue: '',
  normalizedTags: [],
  filteredSuggestions: [],
  activeSuggestionIndex: -1,
  $refs: { tagInput: { blur: jest.fn(), focus: jest.fn() } },
  $emit: jest.fn(),
  addTag: GoalTagsInput.methods.addTag,
  removeTag: GoalTagsInput.methods.removeTag,
  ...overrides,
});

describe('MoleculeGoalTagsInput', () => {
  describe('Component contract', () => {
    it('is named GoalTagsInput', () => {
      expect(GoalTagsInput.name).toBe('GoalTagsInput');
    });

    it('exposes the tag-entry methods used by the template', () => {
      expect(typeof GoalTagsInput.methods.handleKeydown).toBe('function');
      expect(typeof GoalTagsInput.methods.addTag).toBe('function');
      expect(typeof GoalTagsInput.methods.removeTag).toBe('function');
    });
  });

  describe('handleKeydown — commit wiring (end-to-end through addTag)', () => {
    ['Enter', 'Tab', ',', ' '].forEach((key) => {
      const label = {
        Enter: 'Enter', Tab: 'Tab', ',': 'Comma', ' ': 'Space',
      }[key];

      it(`emits the appended tag list on ${label}`, () => {
        const ctx = makeCtx({ inputValue: 'focus', normalizedTags: ['a'] });

        GoalTagsInput.methods.handleKeydown.call(ctx, makeEvent(key));

        expect(ctx.$emit).toHaveBeenCalledWith('update-new-tag-items', ['a', 'focus']);
        expect(ctx.inputValue).toBe('');
      });
    });

    it('prefers the highlighted autocomplete suggestion over the typed text', () => {
      const ctx = makeCtx({ inputValue: 'foc', activeSuggestion: 'focus:deep' });

      GoalTagsInput.methods.handleKeydown.call(ctx, makeEvent('Enter'));

      expect(ctx.$emit).toHaveBeenCalledWith('update-new-tag-items', ['focus:deep']);
    });

    it('does not emit or preventDefault on Tab when the field is empty', () => {
      const ctx = makeCtx({ inputValue: '' });
      const e = makeEvent('Tab');

      GoalTagsInput.methods.handleKeydown.call(ctx, e);

      expect(ctx.$emit).not.toHaveBeenCalled();
      expect(e.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('handleKeydown — Backspace wiring', () => {
    it('emits the list without the last tag when the field is empty', () => {
      const ctx = makeCtx({ inputValue: '', normalizedTags: ['a', 'b'] });

      GoalTagsInput.methods.handleKeydown.call(ctx, makeEvent('Backspace'));

      expect(ctx.$emit).toHaveBeenCalledWith('update-new-tag-items', ['a']);
    });

    it('does nothing on Backspace while text is still being typed', () => {
      const ctx = makeCtx({ inputValue: 'x', normalizedTags: ['a'] });

      GoalTagsInput.methods.handleKeydown.call(ctx, makeEvent('Backspace'));

      expect(ctx.$emit).not.toHaveBeenCalled();
    });
  });

  describe('handleKeydown — autocomplete navigation (component-specific)', () => {
    it('moves the active suggestion down on ArrowDown, clamped to the last item', () => {
      const ctx = makeCtx({ filteredSuggestions: ['x', 'y'], activeSuggestionIndex: -1 });
      const e = makeEvent('ArrowDown');

      GoalTagsInput.methods.handleKeydown.call(ctx, e);
      expect(ctx.activeSuggestionIndex).toBe(0);
      expect(e.preventDefault).toHaveBeenCalled();

      GoalTagsInput.methods.handleKeydown.call(ctx, makeEvent('ArrowDown'));
      GoalTagsInput.methods.handleKeydown.call(ctx, makeEvent('ArrowDown'));
      expect(ctx.activeSuggestionIndex).toBe(1); // clamped at length - 1
    });

    it('moves the active suggestion up on ArrowUp, clamped to -1', () => {
      const ctx = makeCtx({ filteredSuggestions: ['x', 'y'], activeSuggestionIndex: 1 });

      GoalTagsInput.methods.handleKeydown.call(ctx, makeEvent('ArrowUp'));
      expect(ctx.activeSuggestionIndex).toBe(0);

      GoalTagsInput.methods.handleKeydown.call(ctx, makeEvent('ArrowUp'));
      GoalTagsInput.methods.handleKeydown.call(ctx, makeEvent('ArrowUp'));
      expect(ctx.activeSuggestionIndex).toBe(-1); // clamped at -1
    });

    it('resets the active suggestion and blurs the input on Escape', () => {
      const ctx = makeCtx({ activeSuggestionIndex: 1 });

      GoalTagsInput.methods.handleKeydown.call(ctx, makeEvent('Escape'));

      expect(ctx.activeSuggestionIndex).toBe(-1);
      expect(ctx.$refs.tagInput.blur).toHaveBeenCalled();
    });
  });

  describe('addTag', () => {
    const makeAddCtx = (overrides = {}) => ({
      normalizedTags: [],
      inputValue: 'x',
      activeSuggestionIndex: 2,
      $emit: jest.fn(),
      ...overrides,
    });

    it('emits update-new-tag-items with the trimmed tag appended and clears state', () => {
      const ctx = makeAddCtx({ normalizedTags: ['a'] });

      GoalTagsInput.methods.addTag.call(ctx, '  focus  ');

      expect(ctx.$emit).toHaveBeenCalledWith('update-new-tag-items', ['a', 'focus']);
      expect(ctx.inputValue).toBe('');
      expect(ctx.activeSuggestionIndex).toBe(-1);
    });

    it('ignores empty / whitespace-only input', () => {
      const ctx = makeAddCtx();

      GoalTagsInput.methods.addTag.call(ctx, '   ');

      expect(ctx.$emit).not.toHaveBeenCalled();
    });

    it('ignores a duplicate tag', () => {
      const ctx = makeAddCtx({ normalizedTags: ['focus'] });

      GoalTagsInput.methods.addTag.call(ctx, 'focus');

      expect(ctx.$emit).not.toHaveBeenCalled();
    });
  });
});
