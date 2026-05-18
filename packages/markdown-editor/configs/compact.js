/**
 * Compact EasyMDE config for inline description editors (timeline
 * entries, AI task creation form). Hides toolbar and status bar and
 * caps height so the editor sits neatly inside a form row.
 *
 * Accepts an overrides object to tweak placeholder / min / max height
 * per caller without duplicating the whole config.
 */
function compactConfig(overrides = {}) {
  const {
    placeholder = 'Description',
    minHeight = '72px',
    maxHeight = '120px',
    previewRender,
  } = overrides;

  const base = {
    toolbar: false,
    status: false,
    spellChecker: false,
    hideIcons: ['side-by-side', 'fullscreen'],
    minHeight,
    maxHeight,
    placeholder,
    renderingConfig: {
      singleLineBreaks: true,
      markedOptions: {
        breaks: true,
        gfm: true,
      },
    },
  };

  if (typeof previewRender === 'function') {
    base.previewRender = previewRender;
  }

  return base;
}

module.exports = compactConfig;
