<template>
  <!--
    The hierarchical `:` tag editor — the one tag input in the app.

    Areas and projects are a tag convention, not documents: `area:health:fitness`
    and `project:dashboard` live in the plain `tags: [String]` field on GoalItem
    and RoutineItem. So "pick an area" is really "type a tag whose first segment
    is `area`", and the autocomplete has to understand the levels: typing
    `area:` offers only what is directly inside `area`, and a suggestion that
    has children offers to drill in instead of being selected.

    Purely presentational: props in, one `input` event out. No Apollo, no
    router, no store. Spec: docs/redesign/chassis.md § "Hierarchical `:` tags".
  -->
  <div class="rn-tag-input">
    <div
      class="rn-tag-input__field"
      :class="{ 'rn-tag-input__field--focused': focused }"
      data-testid="tag-field"
      @click="focusInput"
    >
      <span class="rn-mi rn-tag-input__field-icon">tag</span>

      <div
        v-for="tag in tags"
        :key="tag"
        class="rn-tag-input__chip"
        :class="{ 'rn-tag-input__chip--new': tag === flashedTag }"
        data-testid="tag-chip"
      >
        <span class="rn-mi rn-tag-input__chip-icon">tag</span>
        <span
          v-for="(segment, i) in segmentsOf(tag)"
          :key="i + segment.text"
          class="rn-tag-input__segment"
          :style="segment.style"
        >{{ segment.text }}</span>
        <span
          class="rn-mi rn-tag-input__remove"
          title="Remove tag"
          data-testid="tag-remove"
          @click.stop="removeTag(tag)"
        >close</span>
      </div>

      <input
        ref="input"
        type="text"
        class="rn-tag-input__input"
        data-testid="tag-text-input"
        :value="inputValue"
        :placeholder="placeholder"
        @input="onInput"
        @keydown="onKeydown"
        @focus="focused = true"
        @blur="onBlur"
      />
    </div>

    <div v-if="menuOpen" class="rn-tag-input__menu" data-testid="tag-menu">
      <!-- "Inside Health › Sleep" — which level the rows below belong to. -->
      <div v-if="hasScope" class="rn-tag-input__scope" data-testid="tag-scope">
        <span class="rn-mi rn-tag-input__scope-icon">subdirectory_arrow_right</span>
        Inside <b>{{ scopeLabel }}</b>
      </div>

      <div
        v-for="(suggestion, i) in suggestions"
        :key="suggestion"
        class="rn-tag-input__row"
        :class="{ 'rn-tag-input__row--active': i === highlight }"
        data-testid="tag-suggestion"
        @mousedown.prevent="addTag(suggestion)"
      >
        <span class="rn-mi rn-tag-input__row-icon">tag</span>
        <div class="rn-tag-input__row-label">
          <span
            v-for="(segment, s) in segmentsOf(suggestion, scopeDepth)"
            :key="s + segment.text"
            class="rn-tag-input__segment"
            :style="segment.style"
          >{{ segment.text }}</span>
        </div>
        <div
          v-if="usageCount(suggestion) && !childCount(suggestion)"
          class="rn-tag-input__uses"
          data-testid="tag-usage"
        >{{ usageLabel(suggestion) }}</div>
        <!--
          A parent is a scope, not a value: the pill drills in (sets the input
          to `tag:`) and must not let the row's own mousedown select it.
        -->
        <div
          v-if="childCount(suggestion)"
          class="rn-tag-input__drill"
          title="Go one level deeper"
          data-testid="tag-drill"
          @mousedown.prevent.stop="drillInto(suggestion)"
        >{{ childCount(suggestion) }} inside<span class="rn-mi">chevron_right</span></div>
      </div>

      <div
        v-if="canCreate"
        class="rn-tag-input__create"
        :class="{ 'rn-tag-input__create--only': !suggestions.length }"
        data-testid="tag-create"
        @mousedown.prevent="addTag(candidate)"
      >
        <span class="rn-mi rn-tag-input__row-icon rn-tag-input__create-icon">add</span>
        Create
        <span class="rn-tag-input__create-tag">
          <span
            v-for="(segment, i) in segmentsOf(candidate)"
            :key="i + segment.text"
            class="rn-tag-input__segment"
            :style="segment.style"
          >{{ segment.text }}</span>
        </span>
      </div>
    </div>

    <div class="rn-tag-input__hint" data-testid="tag-hint">{{ hint }}</div>
  </div>
</template>

<script>
import {
  normTag,
  tagSegments,
  childrenOf,
  buildTagUniverse,
} from '../../utils/tags';
import { handleTagInputKeydown } from '../../utils/tagKeydown';

/** How many rows the dropdown shows before it truncates (chassis: "max 5-6"). */
const MAX_SUGGESTIONS = 6;

/** How long a just-added chip stays blue. */
const FLASH_MS = 500;

export default {
  name: 'MoleculeHierarchicalTagInput',
  props: {
    /** The applied tags. */
    value: {
      type: Array,
      default: () => [],
    },
    /** Known vocabulary to suggest from; ancestors are derived, not required. */
    universe: {
      type: Array,
      default: () => [],
    },
    /** Optional tag -> count map, rendered as "{n} routines" on leaf rows. */
    usage: {
      type: Object,
      default: () => ({}),
    },
    /** Helper line under the field. Pass '' to hide it. */
    hint: {
      type: String,
      default: 'Enter, Tab, comma or space adds · Backspace removes the last tag',
    },
    /** Noun for the usage count — "3 routines", "3 goals". */
    usageNoun: {
      type: String,
      default: 'routine',
    },
  },
  data() {
    return {
      inputValue: '',
      focused: false,
      // -1 = nothing arrow-selected, so Enter commits the typed text.
      highlight: -1,
      flashedTag: null,
      flashTimer: null,
      blurTimer: null,
    };
  },
  computed: {
    /** Applied tags, defensively normalised (the field is the only writer). */
    tags() {
      return (this.value || []).filter(Boolean);
    },
    /**
     * The suggestion universe: the passed vocabulary, plus every tag in use
     * (applied ones and anything the usage map names), plus every ancestor
     * prefix of those — otherwise `area:` could not be drilled into when the
     * vocabulary only names leaves.
     */
    allTags() {
      return buildTagUniverse(this.universe, this.tags, this.usage);
    },
    knownTags() {
      return new Set(this.allTags);
    },
    /** The typed text, comparable: trimmed and lower-cased. */
    raw() {
      return this.inputValue.trim().toLowerCase();
    },
    /** True once the user has typed a `:` — the input names a level. */
    scoped() {
      return this.raw.indexOf(':') >= 0;
    },
    /** Everything before the last `:` — the level the rows live inside. */
    scope() {
      return this.scoped ? this.raw.slice(0, this.raw.lastIndexOf(':')) : '';
    },
    hasScope() {
      return this.scoped && !!this.scope;
    },
    scopeLabel() {
      return tagSegments(this.scope).join(' › ');
    },
    /** Segments of a suggestion up to here are context, so they render dimmed. */
    scopeDepth() {
      return this.hasScope ? tagSegments(this.scope).length : 0;
    },
    /**
     * Level-aware suggestions.
     *
     * With a `:` in the input: only tags exactly one level below the scope —
     * typing `area:` must not offer `area:health:sleep`.
     * Without one: top-level matches first, then deeper partial matches
     * shortest-first (the shortest match is the most general, so it is the one
     * worth drilling into).
     */
    suggestions() {
      if (!this.raw) return [];
      const all = this.allTags;
      let list;
      if (this.scoped) {
        const depth = tagSegments(this.scope).length + 1;
        list = all.filter((t) => t.toLowerCase().indexOf(this.raw) === 0
          && tagSegments(t).length === depth);
      } else {
        const q = this.raw;
        const top = all.filter((t) => t.indexOf(':') < 0 && t.toLowerCase().indexOf(q) === 0);
        const deep = all
          .filter((t) => t.indexOf(':') >= 0
            && t.toLowerCase().indexOf(q) >= 0
            && t.toLowerCase().indexOf(`${q}:`) !== 0)
          .sort((a, b) => a.length - b.length);
        list = [...top, ...deep];
      }
      return list
        .filter((t) => this.tags.indexOf(t) < 0)
        .slice(0, MAX_SUGGESTIONS);
    },
    /** What Enter would create: the typed text in canonical form. */
    candidate() {
      return normTag(this.inputValue);
    },
    canCreate() {
      return !!this.candidate
        && !this.knownTags.has(this.candidate)
        && this.tags.indexOf(this.candidate) < 0;
    },
    menuOpen() {
      return this.focused && !!this.raw && (this.suggestions.length > 0 || this.canCreate);
    },
    /** The arrow-selected suggestion, or null when the typed text is in charge. */
    highlighted() {
      if (this.highlight < 0) return null;
      return this.suggestions[this.highlight] || null;
    },
    placeholder() {
      return this.tags.length ? 'Add tag…' : 'Empty · type area:work…';
    },
  },
  watch: {
    // Any edit invalidates the highlight: the row under it has moved.
    inputValue() {
      this.highlight = -1;
    },
  },
  beforeDestroy() {
    clearTimeout(this.flashTimer);
    clearTimeout(this.blurTimer);
  },
  methods: {
    /**
     * Per-segment chip styling. Segment 0 carries the weight when the tag has
     * levels; the rest are divided by a left border rather than a visible `:`.
     * @param {string} tag
     * @param {number} [dimBefore] - segments before this index are context
     * @returns {{ text: string, style: Object }[]}
     */
    segmentsOf(tag, dimBefore = 0) {
      const parts = tagSegments(tag);
      return parts.map((text, i) => ({
        text,
        style: {
          paddingLeft: i ? '5px' : '0',
          paddingRight: i < parts.length - 1 ? '5px' : '0',
          borderLeft: i ? '1px solid #ccc' : '0',
          fontWeight: i === 0 && parts.length > 1 ? '600' : '500',
          color: dimBefore && i < dimBefore ? 'rgba(0,0,0,.45)' : 'inherit',
        },
      }));
    },
    /** Direct children of a tag inside the suggestion universe. */
    childCount(tag) {
      return childrenOf(tag, this.allTags).length;
    },
    usageCount(tag) {
      return (this.usage && this.usage[tag]) || 0;
    },
    usageLabel(tag) {
      const n = this.usageCount(tag);
      return `${n} ${this.usageNoun}${n === 1 ? '' : 's'}`;
    },
    focusInput() {
      if (this.$refs.input) this.$refs.input.focus();
    },
    /** Spaces separate tags, so they can never reach the value. */
    onInput(e) {
      this.inputValue = e.target.value.replace(/\s/g, '');
    },
    onBlur() {
      // Let a mousedown on a dropdown row land before the menu unmounts.
      clearTimeout(this.blurTimer);
      this.blurTimer = setTimeout(() => {
        this.focused = false;
      }, 150);
    },
    /**
     * Add a tag. Normalises first, so `Area: Health` and `area:health` are the
     * same tag; a duplicate is a silent no-op that still clears the field.
     * @param {string} raw
     */
    addTag(raw) {
      const tag = normTag(raw);
      if (!tag) return;
      this.inputValue = '';
      this.highlight = -1;
      if (this.tags.indexOf(tag) >= 0) return;
      this.$emit('input', [...this.tags, tag]);
      this.flashedTag = tag;
      clearTimeout(this.flashTimer);
      this.flashTimer = setTimeout(() => {
        this.flashedTag = null;
      }, FLASH_MS);
      this.focusInput();
    },
    removeTag(tag) {
      this.$emit('input', this.tags.filter((t) => t !== tag));
    },
    /** Make a parent tag the scope: `area:health` -> input `area:health:`. */
    drillInto(tag) {
      this.inputValue = `${tag}:`;
      this.highlight = -1;
      this.focusInput();
    },
    onKeydown(e) {
      // Commit (Enter / Tab / comma / space) and Backspace routing is shared
      // with every other tag input so they cannot drift apart.
      const handled = handleTagInputKeydown(e, {
        getValue: () => this.highlighted || this.inputValue,
        commit: (v) => this.addTag(v),
        canRemoveLast: () => !this.inputValue && this.tags.length > 0,
        removeLast: () => this.removeTag(this.tags[this.tags.length - 1]),
      });
      if (handled) return;

      if (e.key === 'ArrowDown' && this.suggestions.length) {
        e.preventDefault();
        this.highlight = Math.min(this.highlight + 1, this.suggestions.length - 1);
      } else if (e.key === 'ArrowUp' && this.suggestions.length) {
        e.preventDefault();
        this.highlight = Math.max(this.highlight - 1, -1);
      } else if (e.key === 'ArrowRight' && this.highlighted) {
        // Only at the end of the text, or ArrowRight could not move the caret.
        const atEnd = !e.target || e.target.selectionStart === this.inputValue.length;
        if (atEnd && this.childCount(this.highlighted)) {
          e.preventDefault();
          this.drillInto(this.highlighted);
        }
      } else if (e.key === 'Escape') {
        // Escape dismisses the open suggestions first; claim it so an enclosing
        // ResponsiveSheet doesn't also close. A second Escape reaches the sheet.
        if (this.suggestions.length) e.preventDefault();
        this.highlight = -1;
        if (e.target && e.target.blur) e.target.blur();
      }
    },
  },
};
</script>

<style>
/* Root-class prefixed throughout: this input is embedded in the legacy
   dashboard forms as well as the redesigned sheets, and must not leak. */
.rn-tag-input {
  position: relative;
  width: 100%;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-tag-input__field {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  min-height: 40px;
  padding: 6px 0 6px 26px;
  border-bottom: 1px solid rgba(0, 0, 0, .42);
  cursor: text;
  transition: box-shadow .15s;
}

.rn-tag-input__field--focused {
  box-shadow: inset 0 -2px 0 #1976d2;
}

.rn-tag-input__field-icon {
  position: absolute;
  top: 50%;
  left: 0;
  font-size: 20px;
  color: rgba(0, 0, 0, .54);
  transform: translateY(-50%);
}

/* Chips */
.rn-tag-input__chip {
  display: flex;
  align-items: center;
  height: 24px;
  padding: 0 3px 0 6px;
  font-size: 12px;
  color: #555;
  background: transparent;
  border: 1px solid #bdbdbd;
  border-radius: 12px;
}

/* A just-added chip flashes blue, so a tag added by Enter is visibly landed. */
.rn-tag-input__chip--new {
  background: rgba(40, 139, 213, .08);
  border-color: #288bd5;
  animation: rn-tag-flash .25s ease;
}

@keyframes rn-tag-flash {
  from { background: rgba(40, 139, 213, .24); }
  to { background: rgba(40, 139, 213, .08); }
}

.rn-tag-input__chip-icon {
  margin-right: 3px;
  font-size: 14px;
  color: #999;
}

.rn-tag-input__segment {
  white-space: nowrap;
}

.rn-tag-input__remove {
  width: 16px;
  height: 16px;
  margin-left: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, .6);
  cursor: pointer;
  background: rgba(0, 0, 0, .08);
  border-radius: 50%;
}

.rn-tag-input__input {
  flex: 1;
  min-width: 110px;
  height: 24px;
  font: inherit;
  font-size: 14px;
  color: #333;
  background: transparent;
  border: 0;
  outline: 0;
}

.rn-tag-input__input::placeholder {
  color: rgba(0, 0, 0, .38);
}

/* iOS Safari zooms the page when an editable control is under 16px. */
@media (max-width: 600px) {
  .rn-tag-input__input,
  .rn-tag-input__input::placeholder {
    font-size: 16px;
  }
}

/* Dropdown */
.rn-tag-input__menu {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 6;
  padding: 6px;
  margin-top: 4px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .16), 0 0 0 1px rgba(0, 0, 0, .06);
  animation: rn-fade .12s ease;
}

.rn-tag-input__scope {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 6px;
  font-size: 11px;
  color: rgba(0, 0, 0, .5);
}

.rn-tag-input__scope b {
  color: rgba(0, 0, 0, .75);
}

.rn-tag-input__scope-icon {
  font-size: 14px;
}

.rn-tag-input__row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 4px 0 8px;
  cursor: pointer;
  border-radius: 8px;
}

.rn-tag-input__row:hover {
  background: rgba(40, 139, 213, .06);
}

.rn-tag-input__row--active {
  background: rgba(40, 139, 213, .1);
}

.rn-tag-input__row-icon {
  font-size: 16px;
  color: #999;
}

.rn-tag-input__row-label {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  color: #444;
  white-space: nowrap;
}

.rn-tag-input__uses {
  font-size: 11px;
  color: rgba(0, 0, 0, .4);
}

.rn-tag-input__drill {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 28px;
  padding: 0 6px 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: #288bd5;
  cursor: pointer;
  border-radius: 14px;
}

.rn-tag-input__drill:hover {
  background: rgba(40, 139, 213, .1);
}

.rn-tag-input__drill .rn-mi {
  font-size: 16px;
}

.rn-tag-input__create {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 8px;
  font-size: 13px;
  color: #288bd5;
  cursor: pointer;
  border-top: 1px solid rgba(0, 0, 0, .06);
  border-radius: 8px;
}

/* No rows above it, so there is no seam to draw — and it is what Enter does. */
.rn-tag-input__create--only {
  background: rgba(40, 139, 213, .06);
  border-top: 0;
}

.rn-tag-input__create:hover {
  background: rgba(40, 139, 213, .06);
}

.rn-tag-input__create-icon {
  color: #288bd5;
}

.rn-tag-input__create-tag {
  display: flex;
  align-items: center;
  color: #444;
}

.rn-tag-input__hint {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
}

.rn-tag-input__hint:empty {
  display: none;
}
</style>
