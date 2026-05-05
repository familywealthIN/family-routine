// @routine-notes/markdown-editor — shared markdown editor for the routine apps.
// Exports a Vue 2 `MarkdownEditor` component (thin wrapper around
// vue-easymde) and the named config builders used across organisms.

export { default as MarkdownEditor } from './MarkdownEditor.vue';
export { default as defaultConfig } from './configs/default';
export { default as compactConfig } from './configs/compact';
