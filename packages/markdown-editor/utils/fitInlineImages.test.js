/* eslint-env jest */
/**
 * fitInlineImages — EasyMDE's in-editor image previews keep their ratio when
 * capped to a phone-width editor. EasyMDE stores each loaded image's natural
 * size in window.EMDEimagesCache keyed by the RAW markdown src, while the line
 * carries the RESOLVED url in data-img-src, so the lookup must resolve.
 */
import fitInlineImages, { ASPECT_PROPERTY } from './fitInlineImages';

function editorWith(...srcs) {
  const root = document.createElement('div');
  srcs.forEach((src) => {
    const line = document.createElement('span');
    line.setAttribute('data-img-src', new URL(src, document.baseURI).href);
    root.appendChild(line);
  });
  return root;
}

describe('fitInlineImages', () => {
  it('copies the natural size onto the line as an aspect ratio', () => {
    const root = editorWith('/img/wide.png');
    const cache = { '/img/wide.png': { url: '/img/wide.png', naturalWidth: 1600, naturalHeight: 900 } };

    expect(fitInlineImages(root, cache)).toBe(true);
    expect(root.firstChild.style.getPropertyValue(ASPECT_PROPERTY)).toBe('1600 / 900');
  });

  it('reports no change once every line is fitted, so the refresh cannot loop', () => {
    const root = editorWith('https://example.com/a.jpg');
    const cache = { 'https://example.com/a.jpg': { url: 'https://example.com/a.jpg', naturalWidth: 10, naturalHeight: 20 } };

    expect(fitInlineImages(root, cache)).toBe(true);
    expect(fitInlineImages(root, cache)).toBe(false);
  });

  it('leaves a line alone while its image is still loading', () => {
    const root = editorWith('/img/pending.png');
    // EasyMDE parks an empty object in the cache until onload fires.
    const cache = { '/img/pending.png': {} };

    expect(fitInlineImages(root, cache)).toBe(false);
    expect(root.firstChild.style.getPropertyValue(ASPECT_PROPERTY)).toBe('');
  });

  it('tolerates a missing cache or root', () => {
    expect(fitInlineImages(editorWith('/x.png'), undefined)).toBe(false);
    expect(fitInlineImages(null, {})).toBe(false);
  });
});
