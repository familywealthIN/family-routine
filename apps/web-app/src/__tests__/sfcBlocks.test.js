/* eslint-env jest */
/**
 * Every single-file component closes the blocks it opens.
 *
 * vue-loader does not fail on an unclosed `<style>`: it drops the whole block
 * and the page renders unstyled. On 5 Oct a commit that deleted each page's
 * header-button CSS took the `</style>` with it on Goals, Milestones, Routines
 * and Agents, and those pages shipped with none of their layout CSS for four
 * days without a test or a build noticing.
 */
const fs = require('fs');
const path = require('path');

const ROOTS = [
  path.resolve(__dirname, '..'),
  path.resolve(__dirname, '../../../../packages/ui'),
];

const vueFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return vueFiles(full);
  return entry.name.endsWith('.vue') ? [full] : [];
});

const count = (text, re) => (text.match(re) || []).length;

describe('single-file components', () => {
  const files = ROOTS.flatMap(vueFiles);

  it('finds the components to check', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it.each(['style', 'script'])('close every top-level <%s> they open', (block) => {
    const open = new RegExp(`^<${block}[\\s>]`, 'gm');
    const close = new RegExp(`</${block}>\\s*$`, 'gm');
    const unclosed = files.filter((file) => {
      const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      return count(text, open) !== count(text, close);
    }).map((file) => path.relative(path.resolve(__dirname, '../../../..'), file));
    expect(unclosed).toEqual([]);
  });
});
