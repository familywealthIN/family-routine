<template>
  <AtomTimelineItem
    :color="color"
    small
    class="mb-2"
  >
    <AtomLayout>
      <AtomFlex>
        <!-- Period and Date Header -->
        <div class="caption text--secondary mb-1">
          {{ periodName }} ({{ date }})
        </div>

        <!-- Editable Title -->
        <AtomTextField
          :value="title"
          @input="$emit('update:title', $event)"
          label="Goal Title"
          dense
          filled
          class="mb-2"
        />

        <!-- Editable Description with Markdown Editor -->
        <div class="description-editor">
          <label class="v-label theme--light">Goal Description</label>
          <markdown-editor
            :value="description"
            @input="$emit('update:description', $event)"
            variant="compact"
            :configs="editorConfig"
            :editor-key="`editor-${editorKey}`"
          />
        </div>
      </AtomFlex>
    </AtomLayout>
  </AtomTimelineItem>
</template>

<script>
import { MarkdownEditor } from '@family-routine/markdown-editor';
import {
  AtomFlex,
  AtomLayout,
  AtomTextField,
  AtomTimelineItem,
} from '../../atoms';

export default {
  name: 'MoleculeTimelineEntryEditor',
  components: {
    AtomFlex,
    AtomLayout,
    AtomTextField,
    AtomTimelineItem,
    MarkdownEditor,
  },
  props: {
    title: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    periodName: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      default: 'primary',
    },
    editorKey: {
      type: [String, Number],
      default: 0,
    },
    // Only timeline-specific overrides; the MarkdownEditor's "compact"
    // variant contributes toolbar/status/spellcheck/rendering defaults.
    editorConfig: {
      type: Object,
      default: () => ({
        minHeight: '72px',
        maxHeight: '120px',
        placeholder: 'Enter goal description...',
        previewRender: (plainText) => plainText.replace(/\n/g, '<br>'),
      }),
    },
  },
};
</script>

<style scoped>
.description-editor {
  margin-top: 8px;
}

.v-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 4px;
  display: block;
}

/* Override EasyMDE styles for compact display */
.description-editor >>> .EasyMDEContainer .CodeMirror {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  font-size: 16px;
  line-height: 1.6;
}

.description-editor >>> .EasyMDEContainer .CodeMirror-scroll {
  min-height: 72px;
  max-height: 120px;
}
</style>
