<template>
  <!--
    A labelled markdown field with an Edit / Preview toggle.

    Preview is the resting state — a goal item's CONTRIBUTION is read far more
    often than it is written, and the design renders it as prose with the field
    chrome out of the way. Clicking the preview enters edit mode, which is the
    design's "cursor:text" affordance made real.

    The editor itself is `@routine-notes/markdown-editor` (EasyMDE), which brings
    its own toolbar. The mock hand-draws a toolbar strip; that is a mock standing
    in for a real editor, not a spec to re-implement — see
    docs/redesign/chassis.md § "Things the mocks get wrong on purpose".

    Pure presentational: `input` fires per keystroke for a live preview; `commit`
    is the save signal. It fires once typing pauses (autosave), when edit mode
    is left, and on `flush()` — and only when the text actually changed — so a
    container can save on `commit` without a mutation per character.

    The field owns the text being typed (`draft`). It used to commit `value`,
    the prop — which only moves if the parent writes every keystroke back, and
    no parent did, so every commit carried the old text and nothing ever saved.
  -->
  <div class="rn-mdf">
    <div class="rn-mdf__head">
      <div class="rn-mdf__label">{{ label }}</div>
      <div
        class="rn-mdf__toggle"
        :title="editing ? 'Show the rendered text' : 'Edit the markdown'"
        data-testid="markdown-toggle"
        @mousedown.prevent="toggle"
      >
        <i class="rn-mi rn-mdf__toggle-icon">{{ editing ? 'visibility' : 'edit' }}</i>
        {{ editing ? 'Preview' : 'Edit' }}
      </div>
    </div>

    <div v-if="editing" class="rn-mdf__editor" data-testid="markdown-editor">
      <markdown-editor
        ref="editor"
        :value="draft"
        variant="default"
        :editor-key="editorKey"
        @input="onInput"
      />
      <div class="rn-mdf__stats">
        <span>Markdown · GFM · line breaks kept</span>
        <span data-testid="markdown-stats">{{ stats }}</span>
      </div>
    </div>

    <div
      v-else
      class="rn-mdf__preview"
      :class="{ 'rn-mdf__preview--empty': !hasValue }"
      title="Click to edit"
      data-testid="markdown-preview"
      @click="onPreviewClick"
    >
      <!--
        `:html="false"` is the whole safety story for this field: a contribution
        is user text, and letting it inject markup would make every goal item a
        stored-XSS vector. Agent output is different — it is arbitrary webhook
        HTML and goes through the sandboxed iframe in AgentResultModal instead.
      -->
      <!--
        `rn-markdown` is the shared rendered-markdown stylesheet, the same one
        the editor's preview pane uses, so Preview here and the eye button in
        the editor show the text identically (images capped to the width).
      -->
      <vue-markdown v-if="hasValue" class="rn-markdown" :source="draft" :html="false" />
      <span v-else>{{ placeholder }}</span>
    </div>
  </div>
</template>

<script>
import VueMarkdown from 'vue-markdown';
import { MarkdownEditor } from '@routine-notes/markdown-editor';
import '@routine-notes/markdown-editor/styles/markdown-content.css';

/** How long typing must pause before the draft autosaves. */
export const AUTOSAVE_MS = 1000;

export default {
  name: 'MoleculeMarkdownField',
  components: { MarkdownEditor, VueMarkdown },
  props: {
    value: { type: String, default: '' },
    label: { type: String, default: 'CONTRIBUTION' },
    /** Shown in place of the preview when there is nothing written yet. */
    placeholder: { type: String, default: 'Click to add a contribution…' },
    /**
     * Bumped by the parent when the underlying entity changes, so EasyMDE
     * remounts instead of keeping the previous item's text in CodeMirror.
     */
    editorKey: { type: [String, Number], default: 0 },
  },
  data() {
    return {
      editing: false,
      /** The text as typed. The editor and the preview both read this. */
      draft: this.value || '',
      /** The last text known saved — the prop's, or our own last commit. */
      saved: this.value || '',
      autosaveTimer: null,
    };
  },
  computed: {
    hasValue() {
      return !!(this.draft && this.draft.trim());
    },
    stats() {
      const text = this.draft || '';
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      return `${text.split('\n').length} lines · ${words} words`;
    },
  },
  watch: {
    /**
     * A save lands back here as a new prop. Mid-edit it must NOT reach the
     * draft: the editor reseeds itself on any outside value, which would jump
     * the cursor and drop whatever was typed while the save was in flight.
     */
    value(next) {
      this.saved = next || '';
      if (!this.editing) this.draft = this.saved;
    },
    /**
     * A different item means a different field; never open it mid-swap. A
     * pending autosave is dropped, not fired: by now the parent's item is the
     * NEW one, so committing would write this text onto the wrong item.
     */
    editorKey() {
      this.cancelAutosave();
      this.editing = false;
      this.draft = this.value || '';
      this.saved = this.draft;
    },
  },
  beforeDestroy() {
    // Leaving the page within the autosave delay still saves.
    this.commit();
  },
  methods: {
    onInput(text) {
      this.draft = text;
      this.$emit('input', text);
      this.cancelAutosave();
      this.autosaveTimer = setTimeout(this.commit, AUTOSAVE_MS);
    },
    cancelAutosave() {
      if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    },
    /** Emit the draft once, if it differs from what is already saved. */
    commit() {
      this.cancelAutosave();
      if (this.draft === this.saved) return;
      this.saved = this.draft;
      this.$emit('commit', this.draft);
    },
    toggle() {
      this.setEditing(!this.editing);
    },
    onPreviewClick(event) {
      // A link inside the rendered markdown is a link, not an edit affordance.
      const target = event && event.target;
      if (target && target.closest && target.closest('a')) return;
      this.setEditing(true);
    },
    setEditing(next) {
      if (next === this.editing) return;
      this.editing = next;
      if (!next) this.commit();
      this.$emit('editing', next);
    },
    /** Called by the parent when the sheet closes, so an open edit still saves. */
    flush() {
      if (this.editing) this.setEditing(false);
      else this.commit();
    },
  },
};
</script>

<style>
.rn-mdf {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-mdf__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
}

.rn-mdf__label {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-mdf__toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  color: #288bd5;
  cursor: pointer;
}

.rn-mdf__toggle:hover {
  background: rgba(40, 139, 213, .08);
}

.rn-mdf__toggle-icon {
  font-size: 16px;
}

.rn-mdf__editor {
  margin-top: 6px;
  border-radius: 10px;
  border: 1px solid #288bd5;
  box-shadow: 0 0 0 3px rgba(40, 139, 213, .12);
  overflow: hidden;
}

.rn-mdf__stats {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 12px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  background: #fafafa;
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
}

.rn-mdf__preview {
  margin: 4px -10px 0;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: text;
  min-height: 40px;
  font-size: 15px;
  line-height: 1.6;
  color: rgba(0, 0, 0, .82);
  overflow-wrap: break-word;
}

.rn-mdf__preview:hover {
  background: rgba(0, 0, 0, .03);
}

.rn-mdf__preview--empty {
  color: rgba(0, 0, 0, .35);
}

/* The editor's own preview pane (eye button) reads at the Preview's size. */
.rn-mdf__editor .rn-markdown {
  font-size: 15px;
  color: rgba(0, 0, 0, .82);
}
</style>
