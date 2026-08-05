/**
 * Validates the built help centre.
 *
 * Help articles cross-link heavily by slug, and a typo in a `related` entry or
 * an inline `[link](/help/articles/...)` is invisible until a reader hits a 404.
 * This walks `dist/` and asserts every internal link resolves to a real page,
 * and that every anchor target exists on the page it points at.
 *
 * Run after `astro build`:  node scripts/check-help.mjs
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

if (!existsSync(DIST)) {
  console.error('dist/ not found — run `astro build` first.');
  process.exit(1);
}

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** `/help/articles/foo` -> the file that would serve it. */
function pageFor(pathname) {
  const clean = pathname.replace(/\/$/, '');
  const candidates = [
    join(DIST, clean, 'index.html'),
    join(DIST, `${clean}.html`),
    join(DIST, clean),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

const files = await htmlFiles(DIST);
const idCache = new Map();

async function idsIn(file) {
  if (!idCache.has(file)) {
    const html = markupOnly(await readFile(file, 'utf8'));
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    idCache.set(file, ids);
  }
  return idCache.get(file);
}

/**
 * Inline scripts contain href templates (`/help/articles/${entry.slug}`) that are
 * not links in the document — drop script and style bodies before scanning.
 */
function markupOnly(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
}

const errors = [];
let checked = 0;

for (const file of files) {
  const html = markupOnly(await readFile(file, 'utf8'));
  const from = relative(DIST, file);

  for (const match of html.matchAll(/href="(\/[^"#]*)?(#[^"]*)?"/g)) {
    const [, pathname, hash] = match;
    if (!pathname && !hash) continue;
    // Skip in-page anchors on non-help pages and asset links.
    if (pathname && /\.(css|js|png|jpg|jpeg|webm|svg|xml|ico|webmanifest|txt)$/.test(pathname)) {
      continue;
    }

    checked += 1;
    let targetFile = file;

    if (pathname) {
      const resolved = pageFor(pathname);
      if (!resolved) {
        errors.push(`${from}: link to missing page ${pathname}`);
        continue;
      }
      targetFile = resolved;
    }

    if (hash && hash.length > 1) {
      const ids = await idsIn(targetFile);
      if (!ids.has(hash.slice(1))) {
        errors.push(`${from}: anchor ${pathname ?? ''}${hash} has no matching id`);
      }
    }
  }
}

// The help index is serialised into every help page for client-side search;
// make sure it is actually there and non-trivial.
const helpHome = join(DIST, 'help', 'index.html');
const helpHtml = await readFile(helpHome, 'utf8');
const indexMatch = helpHtml.match(/window\.__RN_HELP_INDEX__ = (\[.*?\]);/s);
if (!indexMatch) {
  errors.push('help/index.html: search index was not serialised');
} else {
  const entries = JSON.parse(indexMatch[1]);
  if (entries.length < 10) errors.push(`help/index.html: search index has only ${entries.length} entries`);
  const empty = entries.filter((e) => !e.text || e.text.length < 50);
  if (empty.length) errors.push(`search index entries with no body text: ${empty.map((e) => e.slug).join(', ')}`);
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} problem(s) in the built site:\n`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(`✓ ${checked} internal links across ${files.length} pages resolve.`);
