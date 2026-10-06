/**
 * Default EasyMDE config for the main goal / contribution editor.
 * Toolbar enabled, no spell-checker (we rely on the OS), sensible
 * rendering defaults aligned with our server-side markdown parsing.
 *
 * `previewImagesInEditor` shows an image line as the picture itself while
 * editing; MarkdownEditor keeps those previews width-capped (fitInlineImages).
 * `previewClass` keeps EasyMDE's own class and adds `rn-markdown`, so the
 * preview panes share the read-only renderers' typography
 * (styles/markdown-content.css).
 */
module.exports = {
  spellChecker: false,
  previewImagesInEditor: true,
  previewClass: ['editor-preview', 'rn-markdown'],
  renderingConfig: {
    singleLineBreaks: true,
    markedOptions: {
      breaks: true,
      gfm: true,
    },
  },
};
