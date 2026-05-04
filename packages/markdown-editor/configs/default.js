/**
 * Default EasyMDE config for the main goal / contribution editor.
 * Toolbar enabled, no spell-checker (we rely on the OS), sensible
 * rendering defaults aligned with our server-side markdown parsing.
 */
module.exports = {
  spellChecker: false,
  renderingConfig: {
    singleLineBreaks: true,
    markedOptions: {
      breaks: true,
      gfm: true,
    },
  },
};
