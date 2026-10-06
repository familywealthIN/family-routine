// Captures the raw app screens for the store slides out of packages/design.
//
//   node store-assets/tools/capture-design.js [platform ...]
//
// The source is the design package's `.dc.html` prototypes, not a running app.
// They carry the curated demo data the listings want, render identically every
// run, and need no backend, auth or seeded database. Output lands in
// raw/<platform>/<key>.png, which is exactly what render-all.js already reads,
// so the compose step downstream is unchanged.
//
// Three things make this fiddly:
//
//  1. The prototypes `x-import` their device frames (`android-frame.jsx`,
//     `browser-window.jsx`) with fetch(), and a file:// page cannot fetch. So
//     the folder is served over a throwaway loopback origin.
//  2. Those frames draw their OWN bezel, status bar and gesture nav, and
//     compose.js draws the real store frame — capturing the wrapper would nest
//     one device inside another. We screenshot the frame's content box instead
//     (the `flex:1; overflow:auto` child both wrappers put their children in)
//     and let compose.js supply all the chrome.
//  3. The frames are fixed at their design size. Resizing the content box before
//     the capture makes the app reflow to the real device viewport, because
//     every prototype lays out with flex and percentage heights rather than
//     hardcoded pixel positions.
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');
const platforms = require('./platforms');
const slides = require('./slides');

const DESIGN = path.join(__dirname, '..', '..', 'packages', 'design');
const RAW = path.join(__dirname, '..', 'raw');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.jsx': 'text/jsx',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.css': 'text/css',
};

function serve(dir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
      const file = path.join(dir, rel);
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/**
 * Which design file each slide comes from, and the `.dv-opt` id of the phone,
 * tablet and desktop frame inside it. The ids are per-file, not global.
 */
const SOURCES = {
  '01-dashboard': {
    file: 'Routine Notes Final.dc.html', phone: '5a', tablet: '6a', desktop: '6b',
  },
  '02-progress': {
    file: 'Progress.dc.html', phone: 'gp', tablet: 'gt', desktop: 'gd',
  },
  '03-goals': {
    file: 'Goals.dc.html', phone: 'gp', tablet: 'gt', desktop: 'gd',
  },
  '05-priority': {
    file: 'Priority.dc.html', phone: 'pp', tablet: 'pt', desktop: 'pd',
  },
  '06-year-goals': {
    file: 'Year Goals.dc.html', phone: 'yp', tablet: 'yt', desktop: 'yd',
  },
  '07-routine': {
    file: 'Routines.dc.html', phone: 'rp', tablet: 'rt', desktop: 'rd',
  },
};

/**
 * Which frame each listing size draws from, and the viewport the content box is
 * resized to before the shot.
 *
 * iPhone and Android both take the phone frame; the sizes are each platform's
 * app area, i.e. the panel minus the status bar and the gesture inset that
 * compose.js draws itself.
 *
 * The iPad set takes the design's iPad mini **landscape** frame, because that is
 * the only tablet layout the design has — there is no portrait tablet mock. The
 * App Store accepts a landscape 13" set (2752x2064 / 2732x2048) exactly as it
 * accepts portrait, so the canvas in platforms.js is landscape to match.
 */
const FRAMES = {
  iphone: { frame: 'phone', size: [412, 892], dpr: 3 },
  android: { frame: 'phone', size: [412, 868], dpr: 3 },
  ipad: { frame: 'tablet', size: [1133, 744], dpr: 2 },
  mac: { frame: 'desktop', size: [1440, 856], dpr: 2 },
};

/**
 * Strip the prototype's own device chrome and resize its content box.
 *
 * Runs in the page. Marks the content box with `data-shot` so the caller can
 * locate it without knowing anything about the frame's internals.
 */
const PREPARE = ([optId, w, h]) => {
  const opt = document.getElementById(optId);
  if (!opt) throw new Error(`no .dv-opt #${optId}`);
  const host = [...opt.children].find((c) => c.className !== 'dv-olabel');
  if (!host) throw new Error(`#${optId} has no frame host`);

  // Both starter frames mark their root and nest the screen in a `flex:1;
  // overflow:auto` child. The tablet frames use neither: the host is their
  // hand-rolled 1165x776 body and its only child is the 1133x744 screen.
  const root = host.querySelector('[data-om-starter]');
  const screen = root
    ? [...root.children].find((c) => c.style.overflow === 'auto')
    : host.firstElementChild;
  if (!screen) throw new Error(`#${optId} has no content box`);

  // The tablet frames paint their own iPadOS status row (clock, wifi, battery).
  // compose.js draws the real one above the image, so leaving this in stacks two
  // status bars on top of each other. Marked `data-sim-status` in the design.
  screen.querySelectorAll('[data-sim-status]').forEach((e) => { e.style.display = 'none'; });

  if (root) {
    // Everything that is not the content box is the prototype's own chrome:
    // status bar, gesture nav, browser tab strip and toolbar. compose.js draws
    // the real versions, so none of it may reach the capture.
    [...root.children].forEach((c) => { if (c !== screen) c.style.display = 'none'; });
    Object.assign(root.style, {
      width: `${w}px`,
      height: 'auto',
      border: '0',
      borderRadius: '0',
      boxShadow: 'none',
      background: 'transparent',
    });
  }
  Object.assign(screen.style, {
    flex: 'none',
    width: `${w}px`,
    height: `${h}px`,
    overflow: 'hidden',
    borderRadius: '0',
  });
  screen.setAttribute('data-shot', '1');
  return true;
};

async function capture(platform, { only } = {}) {
  const p = platforms[platform];
  const f = FRAMES[platform];
  if (!p || !f) throw new Error(`unknown platform: ${platform}`);
  const [w, h] = f.size;

  const { server, port } = await serve(DESIGN);
  const browser = await chromium.launch();
  const out = path.join(RAW, platform);
  fs.mkdirSync(out, { recursive: true });
  const results = [];

  try {
    for (const slide of slides) {
      if (only && !only.includes(slide.key)) continue;
      const src = SOURCES[slide.key];
      if (!src) { results.push({ key: slide.key, note: 'no design source' }); continue; }
      const optId = src[f.frame];
      if (!optId) { results.push({ key: slide.key, note: `no ${f.frame} frame` }); continue; }

      const page = await browser.newPage({
        // Wide enough that the 1440px desktop frame is never squeezed by the
        // prototype's own flex-wrap before we resize it.
        viewport: { width: Math.max(1700, w + 200), height: Math.max(1100, h + 200) },
        deviceScaleFactor: f.dpr,
      });
      await page.goto(`http://127.0.0.1:${port}/${encodeURIComponent(src.file)}`, {
        waitUntil: 'networkidle',
        timeout: 120000,
      });
      // Babel compiles the logic class and React mounts after load; the entry
      // animations (toasts, ring fills, sliding indicators) settle after that.
      await page.waitForSelector('.dv-opt', { timeout: 60000 });
      await page.waitForTimeout(3500);

      await page.evaluate(PREPARE, [optId, w, h]);
      await page.waitForTimeout(1200);

      const file = path.join(out, `${slide.key}.png`);
      await page.locator('[data-shot="1"]').screenshot({ path: file });
      await page.close();

      const b = fs.readFileSync(file);
      results.push({ key: slide.key, file, px: `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}` });
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`${p.label}   frame ${f.frame}  viewport ${w}x${h}@${f.dpr}x`);
  results.forEach((r) => console.log(`  ${r.key.padEnd(16)} ${r.note || `${r.px}  ${path.basename(r.file)}`}`));
  return results;
}

module.exports = {
  capture, serve, SOURCES, FRAMES, DESIGN, RAW,
};

if (require.main === module) {
  const names = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const list = names.length ? names : Object.keys(FRAMES);
  (async () => {
    for (const n of list) await capture(n);
  })().catch((e) => { console.error(e); process.exit(1); });
}
