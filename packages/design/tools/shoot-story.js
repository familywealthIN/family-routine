#!/usr/bin/env node
/**
 * Screenshot one or more Storybook stories, the way the atomic canvases do.
 *
 *   node packages/design/tools/shoot-story.js <storyId> [<storyId> …] [--out dir] [--base url] [--width 412]
 *
 * Renders iframe.html?id=<storyId> from a running Storybook (default the dev
 * server on :6006), on the app's page background (#f4f4f4), and saves
 * <out>/<storyId>.png cropped to what the story drew. Prints the size of each
 * shot and every console error or Vue warning the story raised, so a story that
 * renders blank or throws is caught here rather than in the canvas.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function parse(argv) {
  const args = { ids: [], out: '.', base: 'http://127.0.0.1:6006', width: 412 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') { args.out = argv[i + 1]; i += 1; } else if (argv[i] === '--base') { args.base = argv[i + 1]; i += 1; } else if (argv[i] === '--width') { args.width = Number(argv[i + 1]); i += 1; } else args.ids.push(argv[i]);
  }
  return args;
}

/**
 * Crop to the union of what the story drew. Sheets and modals render outside
 * #root (fixed, or portalled to <body>), so every visible element counts, not
 * #root's own box.
 */
async function drawnBox(page) {
  return page.evaluate(() => {
    let x1 = Infinity; let y1 = Infinity; let x2 = 0; let y2 = 0;
    const skip = new Set(['HTML', 'BODY', 'SCRIPT', 'STYLE']);
    document.querySelectorAll('body *').forEach((el) => {
      if (skip.has(el.tagName)) return;
      if (el.closest('#docs-root, .sb-show-errordisplay, .sb-errordisplay, .sb-nopreview')) return;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      // The v-app shell the preview wraps every story in is layout, not content;
      // so is a full-viewport wrapper (an overlay scrim, a fullscreen layer).
      if (el.matches('#root, .application, .application--wrap, .v-content, .v-content__wrap, .v-overlay')) return;
      if (r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1) return;
      // Count only what paints: text, a graphic, a field, or a visible box.
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const graphic = /^(svg|img|canvas|input|textarea|select|button|i)$/i.test(el.tagName);
      // A v-img paints its picture as a background-image.
      const bg = (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') || style.backgroundImage !== 'none';
      const edge = style.boxShadow !== 'none' || parseFloat(style.borderTopWidth) > 0 || parseFloat(style.borderBottomWidth) > 0;
      if (!ownText && !graphic && !bg && !edge) return;
      x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top);
      x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom);
    });
    if (x1 === Infinity) return null;
    const pad = 12;
    return {
      x: Math.max(0, Math.floor(x1 - pad)),
      y: Math.max(0, Math.floor(y1 - pad)),
      width: Math.ceil(Math.min(document.documentElement.scrollWidth, x2 + pad) - Math.max(0, x1 - pad)),
      height: Math.ceil(Math.min(document.documentElement.scrollHeight, y2 + pad) - Math.max(0, y1 - pad)),
    };
  });
}

async function shoot(page, base, id, out) {
  const problems = [];
  const onConsole = (msg) => {
    const text = msg.text();
    if (/Download the Vue Devtools|You are running Vue in development mode/.test(text)) return;
    if (msg.type() === 'error' || /\[Vue warn\]/.test(text)) problems.push(text.split('\n')[0].slice(0, 300));
  };
  const onError = (err) => problems.push(`pageerror: ${err.message.slice(0, 300)}`);
  page.on('console', onConsole);
  page.on('pageerror', onError);
  await page.goto(`${base}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html,body,.application,.v-application,.theme--light.application{background:#f4f4f4 !important}' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  // The dev server keeps an HMR socket open, so networkidle never comes: wait
  // for the story to mount instead.
  await page.waitForFunction(() => {
    const root = document.querySelector('#root');
    return (root && root.children.length) || document.querySelector('.sb-show-errordisplay');
  }, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(900);
  const errorShown = await page.evaluate(() => {
    const el = document.querySelector('.sb-show-errordisplay #error-message, .sb-show-errordisplay .sb-errordisplay');
    return el ? el.textContent.trim().slice(0, 300) : '';
  });
  if (errorShown) problems.push(`storybook error: ${errorShown}`);
  const box = await drawnBox(page);
  const file = path.join(out, `${id}.png`);
  if (box && box.width > 4 && box.height > 4) {
    await page.screenshot({ path: file, clip: box });
  } else {
    problems.push('rendered nothing visible');
  }
  page.off('console', onConsole);
  page.off('pageerror', onError);
  return { id, file: box ? file : null, width: box ? box.width : 0, height: box ? box.height : 0, problems };
}

async function main() {
  const args = parse(process.argv.slice(2));
  if (!args.ids.length) {
    console.error('usage: shoot-story.js <storyId> […] [--out dir] [--base url] [--width 412]');
    process.exit(2);
  }
  fs.mkdirSync(args.out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: args.width, height: 900 }, deviceScaleFactor: 2 });
  const results = [];
  for (const id of args.ids) {
    // eslint-disable-next-line no-await-in-loop
    const result = await shoot(page, args.base, id, args.out);
    results.push(result);
    console.log(`${result.problems.length ? 'PROBLEM' : 'ok     '} ${id} ${result.width}x${result.height}${result.file ? ` -> ${result.file}` : ''}`);
    result.problems.forEach((p) => console.log(`        ${p}`));
  }
  await browser.close();
  if (process.env.SHOOT_JSON) fs.writeFileSync(process.env.SHOOT_JSON, JSON.stringify(results, null, 1));
}

main().catch((error) => { console.error(error); process.exit(1); });
