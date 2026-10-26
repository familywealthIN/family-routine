#!/usr/bin/env node
/**
 * tokens.json → tokens.css. tokens.json is the source; never edit tokens.css
 * by hand. Run after changing a token:
 *
 *   node packages/design/tools/build-tokens.js
 *
 * Every color, spacing, radius and shadow token becomes `--<name>`; every
 * type style becomes `--font-<style>` (a `font` shorthand) plus a `.t-<style>`
 * class, so previews and canvases can say `class="t-meta"`.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, 'tokens.json'), 'utf8'));

const firstTheme = tokens.color.themes[0].id;
const rawValue = (token) => (typeof token.value === 'string' ? token.value : token.value[firstTheme]);
// "{primary}" is a token alias: it becomes var(--primary).
const valueOf = (token) => rawValue(token).replace(/^\{([A-Za-z0-9_.-]+)\}$/, 'var(--$1)');
const px = (v) => (typeof v === 'number' ? String(v) : v);

const vars = [];
['color', 'spacing', 'radius', 'shadow'].forEach((family) => {
  vars.push(`  /* ${family} */`);
  tokens[family].tokens.forEach((token) => vars.push(`  --${token.name}: ${valueOf(token)};`));
});

const classes = [];
vars.push('  /* type */');
Object.entries(tokens.type.families).forEach(([name, stack]) => vars.push(`  --family-${name}: ${stack};`));
tokens.type.groups.forEach((group) => {
  group.styles.forEach((style) => {
    const shorthand = `${style.fontWeight} ${px(style.fontSize)}/${px(style.lineHeight)} var(--family-${group.family})`;
    vars.push(`  --font-${style.name}: ${shorthand};`);
    const extra = [
      style.letterSpacing ? ` letter-spacing: ${style.letterSpacing};` : '',
      style.textTransform ? ` text-transform: ${style.textTransform};` : '',
    ].join('');
    classes.push(`.t-${style.name} { font: var(--font-${style.name});${extra} }`);
  });
});

const css = [
  `/* ${tokens.name} — generated from tokens.json */`,
  '/* Do not edit: run node packages/design/tools/build-tokens.js */',
  "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Montserrat:wght@500;600;700&family=Material+Icons&display=swap');",
  '',
  ':root {',
  ...vars,
  '}',
  '',
  ...classes,
  '',
  '/* Material Icons glyph, as the app\'s .rn-mi */',
  ".mi { font-family: 'Material Icons'; font-weight: normal; font-style: normal; font-size: 24px; line-height: 1;"
    + ' letter-spacing: normal; text-transform: none; display: inline-flex; align-items: center; justify-content: center;'
    + " white-space: nowrap; direction: ltr; -webkit-font-feature-settings: 'liga'; -webkit-font-smoothing: antialiased; }",
  '',
].join('\n');

fs.writeFileSync(path.join(ROOT, 'tokens.css'), css);
console.log(`tokens.css: ${vars.length} variables, ${classes.length} type classes`);
