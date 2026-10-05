<template>
  <div class="markdown-editor" :class="wrapperClass">
    <vue-easymde
      :model-value="value"
      :configs="resolvedConfig"
      :key="editorKey"
      ref="editor"
      @update:modelValue="onInput"
      @initialized="onInitialized"
    />
  </div>
</template>

<script>
import VueEasymde from 'vue-easymde';
import defaultConfig from './configs/default';
import compactConfig from './configs/compact';
import fitInlineImages from './utils/fitInlineImages';
import 'easymde/dist/easymde.min.css';
// Order matters: the shared content rules must follow easymde.min.css, whose
// `.editor-preview pre` / `table td` rules carry the same specificity.
import './styles/markdown-content.css';
import './styles/easymde-preview.css';

const VARIANTS = ['default', 'compact'];

export default {
  name: 'MarkdownEditor',
  components: { VueEasymde },

  props: {
    value: {
      type: String,
      default: '',
    },
    /**
     * Shortcut for picking a pre-baked config:
     *   "default" — full toolbar, comfortable height (goal descriptions).
     *   "compact" — toolbar hidden, capped height (inline editors).
     * Any object passed in `configs` takes precedence over the variant.
     */
    variant: {
      type: String,
      default: 'default',
      validator: (v) => VARIANTS.includes(v),
    },
    /**
     * Config overrides merged on top of the chosen variant.
     * Compact-specific tokens (placeholder/min/max height/previewRender)
     * are accepted and forwarded to the compactConfig builder.
     */
    configs: {
      type: Object,
      default: () => ({}),
    },
    /**
     * Forwarded to the underlying VueEasymde key. Change it to force a
     * remount when parent state causes the CodeMirror instance to
     * de-sync from the value prop (e.g. switching the active item).
     */
    editorKey: {
      type: [String, Number],
      default: 0,
    },
    wrapperClass: {
      type: [String, Array, Object],
      default: undefined,
    },
  },

  computed: {
    resolvedConfig() {
      if (this.variant === 'compact') {
        return {
          ...compactConfig(this.configs),
          ...this.configs,
        };
      }
      return {
        ...defaultConfig,
        ...this.configs,
      };
    },
  },

  methods: {
    /**
     * vue-easymde emits this once per EasyMDE instance (including after an
     * `editorKey` remount). With in-editor image previews on, keep each image
     * line ratio-correct as CodeMirror redraws; re-measure only when a line
     * actually changed, so the refresh's own redraw is a no-op.
     */
    onInitialized(easymde) {
      const cm = easymde && easymde.codemirror;
      if (!cm || !easymde.options || !easymde.options.previewImagesInEditor) return;
      const fit = () => {
        if (fitInlineImages(cm.getWrapperElement())) cm.refresh();
      };
      cm.on('update', fit);
      fit();
    },
    onInput(value) {
      this.$emit('input', value);
    },
    /**
     * Escape hatch for callers that need the raw EasyMDE instance
     * (e.g. to call simpleMde.codemirror.focus()). Mirrors the
     * previous direct ref="markdownEditor" usage.
     */
    getEditorInstance() {
      const ref = this.$refs.editor;
      return ref && ref.easymde ? ref.easymde : null;
    },
  },
};
</script>
