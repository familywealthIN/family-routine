/* eslint-env jest */
/**
 * All of the web-app's CSS lives in packages/ui.
 *
 * Pages, layouts, views and containers load their styles from
 * packages/ui/styles/app with `<style [scoped] src="@routine-notes/ui/…">`,
 * and the global overrides main.js imports sit in packages/ui/styles/app/global.
 * An inline block or a stray stylesheet in the app would start the split again,
 * so every `<style>` here must be an empty tag pointing at a file that exists.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..');
const UI = path.resolve(__dirname, '../../../../packages/ui');
const UI_PREFIX = '@routine-notes/ui/';

const filesUnder = (dir, keep) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return filesUnder(full, keep);
  return keep(entry.name) ? [full] : [];
});

const rel = (file) => path.relative(path.resolve(SRC, '../../..'), file).replace(/\\/g, '/');

// Every top-level <style …>…</style> block: its attributes and what sits between the tags.
const styleBlocks = (file) => {
  const text = fs.readFileSync(file, 'utf8');
  return [...text.matchAll(/^<style\b([^>]*)>([\s\S]*?)<\/style>/gm)]
    .map(([, attrs, body]) => ({ attrs, body, src: (attrs.match(/\bsrc="([^"]*)"/) || [])[1] }));
};

describe('web-app CSS lives in packages/ui', () => {
  const vueFiles = filesUnder(SRC, (name) => name.endsWith('.vue'));

  it('finds the components to check', () => {
    expect(vueFiles.length).toBeGreaterThan(20);
  });

  it('has no inline <style> block in any .vue file', () => {
    const inline = vueFiles.filter((file) => styleBlocks(file).some(({ src, body }) => (
      !src || !src.startsWith(UI_PREFIX) || body !== ''
    ))).map(rel);
    expect(inline).toEqual([]);
  });

  it('points every <style src> at a file that exists in packages/ui', () => {
    const missing = vueFiles.flatMap((file) => styleBlocks(file)
      .filter(({ src }) => src && src.startsWith(UI_PREFIX))
      .filter(({ src }) => !fs.existsSync(path.join(UI, src.slice(UI_PREFIX.length))))
      .map(({ src }) => `${rel(file)} -> ${src}`));
    expect(missing).toEqual([]);
  });

  it('keeps no stylesheet files under apps/web-app/src', () => {
    const sheets = filesUnder(SRC, (name) => /\.(css|scss|sass|less|styl)$/.test(name)).map(rel);
    expect(sheets).toEqual([]);
  });
});
