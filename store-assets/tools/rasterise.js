// Turns the composited slide pages into the PNGs the stores actually take.
//
//   node store-assets/tools/rasterise.js [platform ...]
//
// Reads build/<platform>-<key>.html (written by render-all.js) and writes
// final/<platform>-<key>.png at the platform's exact canvas size.
//
// This step used to be driven by hand through Chrome DevTools, which meant the
// slide set could not be rebuilt from a clean checkout. Playwright is already a
// dependency of the web app, so the whole chain - capture, compose, rasterise -
// now runs from the command line.
//
// The pages are self-contained: compose.js inlines the capture as a base64 data
// URI and sets html/body to the canvas size, so there is nothing to wait for
// beyond fonts and layout, and the shot is a plain viewport capture with no
// scrolling or stitching.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const platforms = require('./platforms');
const slides = require('./slides');

const root = path.join(__dirname, '..');

async function rasterise(name) {
  const p = platforms[name];
  if (!p) throw new Error(`unknown platform: ${name} (have ${Object.keys(platforms).join(', ')})`);
  const [width, height] = p.canvas;

  const outDir = path.join(root, 'final');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const results = [];
  try {
    for (const s of slides) {
      const src = path.join(root, 'build', `${name}-${s.key}.html`);
      if (!fs.existsSync(src)) { results.push({ key: s.key, note: 'no composited page' }); continue; }

      // deviceScaleFactor stays 1: compose.js already lays the page out in final
      // device pixels, so scaling here would multiply the canvas, not sharpen it.
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      await page.goto(pathToFileURL(src).href, { waitUntil: 'load', timeout: 120000 });
      // The caption is set in a webfont with a system fallback; capturing before
      // it resolves bakes the fallback metrics into the slide.
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.waitForTimeout(400);

      const out = path.join(outDir, `${name}-${s.key}.png`);
      await page.screenshot({ path: out, clip: { x: 0, y: 0, width, height } });
      await page.close();

      const b = fs.readFileSync(out);
      results.push({
        key: s.key,
        px: `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`,
        kb: Math.round(b.length / 1024),
        ok: b.readUInt32BE(16) === width && b.readUInt32BE(20) === height,
      });
    }
  } finally {
    await browser.close();
  }

  console.log(`${p.label}  canvas ${width}x${height}`);
  results.forEach((r) => console.log(`  ${r.key.padEnd(16)} ${r.note || `${r.px} ${r.ok ? 'OK ' : 'SIZE MISMATCH '} ${r.kb}kb`}`));
  return results;
}

module.exports = { rasterise };

if (require.main === module) {
  const names = process.argv.slice(2);
  const list = names.length ? names : Object.keys(platforms);
  (async () => {
    for (const n of list) await rasterise(n);
  })().catch((e) => { console.error(e); process.exit(1); });
}
