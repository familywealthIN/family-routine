<template>
  <v-timeline-item
    :color="color"
    small
    class="mb-2"
  >
    <v-layout>
      <v-flex>
        <!-- Period and Date Header -->
        <div class="caption text--secondary mb-1">
          {{ periodName }} ({{ date }})
        </div>

        <!-- Editable Title -->
        <v-text-field
          :value="title"
          @input="$emit('update:title', $event)"
          label="Goal Title"
          dense
          filled
          class="mb-2"
        ></v-text-field>

        <!-- Editable Description with Markdown Editor -->
        <div class="description-editor">
          <label class="v-label theme--light">Goal Description</label>
          <vue-easymde
            :value="description"
            @input="$emit('update:description', $event)"
            :configs="editorConfig"
            :key="`editor-${editorKey}`"
          />
        </div>
      </v-flex>
    </v-layout>
  </v-timeline-item>
</template>

<script>
import VueEasymde from 'vue-easymde';

export default {
  name: 'MoleculeTimelineEntryEditor',
  components: {
    VueEasymde,
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
    editorConfig: {
      type: Object,
      default: () => ({
        toolbar: false,
        status: false,
        spellChecker: false,
        hideIcons: ['side-by-side', 'fullscreen'],
        minHeight: '72px',
        maxHeight: '120px',
        placeholder: 'Enter goal description...',
        renderingConfig: {
          singleLineBreaks: true,
          markedOptions: {
            breaks: true,
            gfm: true,
          },
        },
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
  font-size: 14px;
}

.description-editor >>> .EasyMDEContainer .CodeMirror-scroll {
  min-height: 72px;
  max-height: 120px;
}
</style>
