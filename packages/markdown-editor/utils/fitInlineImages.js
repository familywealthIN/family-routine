/**
 * Make EasyMDE's in-editor image previews (`previewImagesInEditor`) keep their
 * aspect ratio when they are narrower than the image.
 *
 * EasyMDE marks an image line with `data-img-src` and draws the picture as that
 * line's ::after background, with `--width` (natural width) and `--height` -
 * a height it computes once, from the first editor's width at load. Capped at
 * max-width:100% on a phone the box keeps that height and the picture floats in
 * an oversized blank box. EasyMDE keeps every loaded image's natural size in
 * `window.EMDEimagesCache`; this copies it onto the line as `--rn-aspect`
 * ("w / h"), which easymde-preview.css turns into `aspect-ratio`.
 *
 * Returns true when any line changed, so the caller can re-measure CodeMirror.
 */
export const ASPECT_PROPERTY = '--rn-aspect';

function resolve(url) {
  try {
    return new URL(url, document.baseURI).href;
  } catch (e) {
    return url;
  }
}

function findNaturalSize(src, cache) {
  if (!cache) return null;
  const keys = Object.keys(cache);
  for (let i = 0; i < keys.length; i += 1) {
    const entry = cache[keys[i]];
    if (entry && entry.naturalWidth > 0 && entry.naturalHeight > 0
      && entry.url && resolve(entry.url) === src) {
      return entry;
    }
  }
  return null;
}

export default function fitInlineImages(root, cache = typeof window !== 'undefined' ? window.EMDEimagesCache : null) {
  if (!root || !root.querySelectorAll) return false;
  let changed = false;
  root.querySelectorAll('span[data-img-src]').forEach((line) => {
    if (line.style.getPropertyValue(ASPECT_PROPERTY)) return;
    const size = findNaturalSize(line.getAttribute('data-img-src'), cache);
    if (!size) return;
    line.style.setProperty(ASPECT_PROPERTY, `${size.naturalWidth} / ${size.naturalHeight}`);
    changed = true;
  });
  return changed;
}
