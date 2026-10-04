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

    Pure presentational: `input` fires per keystroke for a live preview, `commit`
    fires once when edit mode is left, so a container can save on `commit` and
    not mutate on every character.
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
        :value="value"
        variant="default"
        :editor-key="editorKey"
        @input="$emit('input', $event)"
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
      <vue-markdown v-if="hasValue" :source="value" :html="false" />
      <span v-else>{{ placeholder }}</span>
    </div>
  </div>
</template>

<script>
import VueMarkdown from 'vue-markdown';
import { MarkdownEditor } from '@routine-notes/markdown-editor';

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
    return { editing: false };
  },
  computed: {
    hasValue() {
      return !!(this.value && this.value.trim());
    },
    stats() {
      const text = this.value || '';
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      return `${text.split('\n').length} lines · ${words} words`;
    },
  },
  watch: {
    /** A different item means a different field; never open it mid-swap. */
    editorKey() {
      this.editing = false;
    },
  },
  methods: {
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
      if (!next) this.$emit('commit', this.value);
      this.$emit('editing', next);
    },
    /** Called by the parent when the sheet closes, so an open edit still saves. */
    flush() {
      if (this.editing) this.setEditing(false);
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

.rn-mdf__preview p {
  margin: 0 0 10px;
}

.rn-mdf__preview > :last-child {
  margin-bottom: 0;
}

.rn-mdf__preview code {
  font-family: ui-monospace, Menlo, monospace;
  font-size: .88em;
  background: rgba(0, 0, 0, .06);
  padding: 1px 5px;
  border-radius: 4px;
  color: #c7254e;
}

.rn-mdf__preview blockquote {
  border-left: 3px solid rgba(0, 0, 0, .2);
  padding: 2px 0 2px 12px;
  margin: 0 0 10px;
  color: rgba(0, 0, 0, .65);
}
</style>
