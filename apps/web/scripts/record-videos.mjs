/**
 * Feature video recorder for the marketing site (Todoist-style scene showcase).
 *
 * Records the real web-app (localhost:8080, backend on :3000 in dev mode)
 * driving each feature flow in a desktop and a mobile viewport, with an
 * injected cursor/touch indicator so interactions read on video.
 *
 * Prereqs (same as screenshots/README.md):
 *   1. apps/server running on :3000 with NODE_ENV=development
 *   2. web-app dev server on :8080
 *   3. Demo data seeded (yarn workspace web seed) + at least one passed,
 *      unticked task for the points scene (passRoutineItem).
 *
 * Run from repo root:
 *   node apps/web/scripts/record-videos.mjs [--scene routines,goals,...] [--variant desktop|mobile]
 *
 * Output: apps/web/public/videos/{scene}-{variant}.webm + -poster.jpg
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/videos');
const BASE = 'http://localhost:8080';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true])
);
const ONLY_SCENES = args.scene ? String(args.scene).split(',') : null;
const ONLY_VARIANT = args.variant || null;

// The web-app sends Authorization: Bearer <token> on every GraphQL call and
// the server verifies it against JWT_SECRET even in dev — so this must be a
// real JWT. Sign one with apps/server's secret, e.g.:
//   cd apps/server && node -e "require('dotenv').config(); console.log(require('jsonwebtoken').sign({email:'grvpanchalus@gmail.com'}, process.env.JWT_SECRET, {expiresIn:'2d'}))"
const TOKEN = process.env.ROUTINE_NOTES_TOKEN
  || (args.tokenFile ? readFileSync(String(args.tokenFile), 'utf8').trim() : null);
if (!TOKEN) {
  console.error('Missing JWT: set ROUTINE_NOTES_TOKEN or pass --tokenFile=<path>');
  process.exit(1);
}

const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
};

const ARROW_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><path d="M6 2.5l5.2 18 2.9-7 7-2.6z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`
);

function initScripts(context, variant) {
  // Auth + app flags: dev server accepts any token (NODE_ENV=development).
  return Promise.all([
    context.addInitScript((token) => {
      try {
        localStorage.setItem('token', token);
        localStorage.setItem('email', 'grvpanchalus@gmail.com');
        localStorage.setItem('name', 'Gaurav Panchal');
        localStorage.setItem('picture', '');
        localStorage.setItem('notification-token', '');
        localStorage.setItem('ONBOARDING_COMPLETE', 'true');
      } catch (e) { /* ignore */ }
    }, TOKEN),
    context.addInitScript(
      ({ isMobile, arrow }) => {
        if (window.top !== window) return;
        const ready = () => {
          if (!document.documentElement || document.getElementById('__demo_cursor')) return;
          const style = document.createElement('style');
          style.textContent = `
            ::-webkit-scrollbar { width: 0 !important; height: 0 !important; }
            * { scrollbar-width: none !important; }
            #__demo_cursor { position: fixed; z-index: 2147483647; pointer-events: none; left: -100px; top: -100px; }
            .__demo_ripple { position: fixed; z-index: 2147483646; pointer-events: none; border-radius: 50%;
              transform: translate(-50%, -50%); }
          `;
          document.head ? document.head.appendChild(style) : document.documentElement.appendChild(style);
          const c = document.createElement('div');
          c.id = '__demo_cursor';
          if (isMobile) {
            Object.assign(c.style, {
              width: '34px', height: '34px', borderRadius: '50%',
              background: 'rgba(17,17,17,0.18)', border: '2px solid rgba(17,17,17,0.35)',
              transform: 'translate(-50%,-50%)', opacity: '0', transition: 'opacity 0.12s ease',
            });
          } else {
            Object.assign(c.style, {
              width: '26px', height: '26px',
              backgroundImage: `url("data:image/svg+xml,${arrow}")`,
              backgroundSize: 'contain', backgroundRepeat: 'no-repeat',
            });
          }
          document.documentElement.appendChild(c);
          window.addEventListener('mousemove', (e) => {
            c.style.left = `${e.clientX}px`;
            c.style.top = `${e.clientY}px`;
            if (isMobile) c.style.opacity = '0';
          }, true);
          window.addEventListener('pointerdown', (e) => {
            c.style.left = `${e.clientX}px`;
            c.style.top = `${e.clientY}px`;
            if (isMobile) {
              c.style.opacity = '1';
              setTimeout(() => { c.style.opacity = '0'; }, 320);
            }
            const r = document.createElement('div');
            r.className = '__demo_ripple';
            const size = isMobile ? 34 : 26;
            Object.assign(r.style, {
              left: `${e.clientX}px`, top: `${e.clientY}px`,
              width: `${size}px`, height: `${size}px`,
              border: '2px solid rgba(25,118,210,0.65)', background: 'rgba(25,118,210,0.15)',
            });
            document.documentElement.appendChild(r);
            r.animate(
              [{ transform: 'translate(-50%,-50%) scale(0.4)', opacity: 1 },
               { transform: 'translate(-50%,-50%) scale(2.2)', opacity: 0 }],
              { duration: 480, easing: 'ease-out' }
            ).onfinish = () => r.remove();
          }, true);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
        else ready();
        document.addEventListener('readystatechange', ready);
      },
      { isMobile: variant === 'mobile', arrow: ARROW_SVG }
    ),
  ]);
}

// ---------- motion helpers ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pos = new WeakMap(); // page -> {x,y}

async function glideTo(page, x, y, ms = 550) {
  const from = pos.get(page) || { x: 40, y: 40 };
  const steps = Math.max(8, Math.round(ms / 16));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const e = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2; // easeInOutQuad
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await sleep(ms / steps);
  }
  pos.set(page, { x, y });
}

async function glideToLocator(page, locator, ms = 550) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('glideToLocator: element not visible');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await glideTo(page, x, y, ms);
  return { x, y };
}

async function clickLocator(page, locator, { variant, hover = 350 } = {}) {
  const { x, y } = await glideToLocator(page, locator);
  await sleep(hover);
  if (variant === 'mobile') await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

async function smoothScroll(page, dy, ms = 900) {
  await page.evaluate(
    ({ dy, ms }) =>
      new Promise((done) => {
        const el = document.scrollingElement || document.documentElement;
        const start = el.scrollTop;
        const t0 = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / ms);
          const e = p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2;
          el.scrollTop = start + dy * e;
          if (p < 1) requestAnimationFrame(tick);
          else done();
        };
        requestAnimationFrame(tick);
      }),
    { dy, ms }
  );
}

async function settle(page, text, extra = 1600) {
  await page.waitForSelector(`text=${text}`, { timeout: 20000 });
  await sleep(extra);
}

// Zoom-window log: zoomTo/zoomReset record when the camera is zoomed in,
// relative to the final (head-trimmed) video timeline. The site reads
// public/videos/zoom-timings.json to zoom the phone frame in sync with the
// recording's own zoom moments.
const TRIM_HEAD = 2.5; // seconds cut from the head by the ffmpeg trim step
let zoomLog = null; // { t0, windows: [{start,end}], open }

function markZoomStart() {
  if (!zoomLog || zoomLog.open != null) return;
  zoomLog.open = (Date.now() - zoomLog.t0) / 1000 - TRIM_HEAD;
}

function markZoomEnd() {
  if (!zoomLog || zoomLog.open == null) return;
  const end = (Date.now() - zoomLog.t0) / 1000 - TRIM_HEAD;
  if (end > 0) {
    zoomLog.windows.push({
      start: +Math.max(0, zoomLog.open).toFixed(2),
      end: +end.toFixed(2),
    });
  }
  zoomLog.open = null;
}

// Camera pan-and-zoom (Todoist-style close-up): scale <body> around the
// action area and pan it toward the viewport centre so the interaction reads
// clearly even when the video renders small. The injected cursor lives on
// <html> so it stays screen-sized, and Playwright boundingBox()/mouse coords
// are transform-aware so clicks keep working while zoomed. Always zoomReset()
// before scrolling — scroll extent doesn't follow the visual transform.
async function zoomTo(page, locator, { scale = 1.8, ms = 750, hold = 400 } = {}) {
  const box = await locator.boundingBox();
  if (!box) return;
  markZoomStart();
  await page.evaluate(
    ({ cx, cy, scale, ms }) => {
      const el = document.scrollingElement || document.documentElement;
      const st = el.scrollTop;
      const sl = el.scrollLeft;
      const b = document.body;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const W = Math.max(b.offsetWidth, vw);
      const H = Math.max(b.offsetHeight, vh);
      const ox = cx + sl; // origin in body coords
      const oy = cy + st;
      // desired pan centres the target; clamp so body edges never enter view
      let tx = vw / 2 - cx;
      let ty = vh / 2 - cy;
      tx = Math.min(tx, sl + ox * (scale - 1));
      tx = Math.max(tx, vw + sl - ox - (W - ox) * scale);
      ty = Math.min(ty, st + oy * (scale - 1));
      ty = Math.max(ty, vh + st - oy - (H - oy) * scale);
      b.style.transition = `transform ${ms}ms cubic-bezier(0.45, 0, 0.25, 1)`;
      b.style.transformOrigin = `${ox}px ${oy}px`;
      b.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    },
    { cx: box.x + box.width / 2, cy: box.y + box.height / 2, scale, ms }
  );
  await sleep(ms + hold);
}

async function zoomReset(page, ms = 600) {
  markZoomEnd();
  await page.evaluate((ms) => {
    const b = document.body;
    b.style.transition = `transform ${ms}ms cubic-bezier(0.45, 0, 0.25, 1)`;
    b.style.transform = 'none';
  }, ms);
  await sleep(ms + 250);
}

// ---------- scenes ----------
// Each scene zooms the camera into the region where the action happens so the
// interaction is legible in the rendered video, then zooms back out before
// any scroll. Mobile zooms harder — the recording renders inside a phone
// frame scaled to ~0.78, so it needs the extra magnification.
const zoomScale = (variant) => (variant === 'mobile' ? 1.75 : 1.8);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const NOW = new Date();
// the /home banner, e.g. "07 July 2026"
const TODAY_LABEL = `${String(NOW.getDate()).padStart(2, '0')} ${MONTHS[NOW.getMonth()]} ${NOW.getFullYear()}`;
// the month accordion on /goals, e.g. "July 2026"
const MONTH_LABEL = `${MONTHS[NOW.getMonth()]} ${NOW.getFullYear()}`;

const scenes = {
  async routines(page, variant) {
    const Z = zoomScale(variant);
    await page.goto(`${BASE}/home`);
    await settle(page, TODAY_LABEL);
    // sweep across the week strip
    const strip = page.locator(`text=${TODAY_LABEL}`);
    const box = await strip.boundingBox();
    if (box) await glideTo(page, box.x + 40, box.y - 60, 500);
    await glideTo(page, box ? box.x + 460 : 800, box ? box.y - 60 : 140, 900);
    await sleep(400);
    // flip the goal period toggle on the routine card (the visible v-btn-toggle,
    // not the hidden .period-toggle groups that belong to other views) — zoomed
    // in so the Week/Month/Today flip actually reads
    const toggle = page.locator('.v-btn-toggle button:visible');
    const week = toggle.filter({ hasText: /^\s*Week\s*$/ }).first();
    await glideToLocator(page, week, 500);
    await zoomTo(page, week, { scale: Z });
    await clickLocator(page, week, { variant });
    await sleep(1300);
    await clickLocator(page, toggle.filter({ hasText: /^\s*Month\s*$/ }).first(), { variant });
    await sleep(1300);
    await clickLocator(page, toggle.filter({ hasText: /^\s*Today\s*$/ }).first(), { variant });
    await sleep(1100);
    await zoomReset(page);
    // browse the upcoming list
    await smoothScroll(page, variant === 'mobile' ? 520 : 420, 1100);
    await sleep(500);
    const listTask = page.locator('button.task-action-btn:visible').first();
    if (await listTask.count()) {
      await zoomTo(page, listTask, { scale: Z * 0.85, hold: 1200 });
      await zoomReset(page);
    } else {
      await sleep(900);
    }
    await smoothScroll(page, variant === 'mobile' ? -520 : -420, 1000);
    await sleep(1200);
  },

  async goals(page, variant) {
    const Z = zoomScale(variant);
    await page.goto(`${BASE}/goals`);
    await settle(page, 'Total Day Tasks');
    // sweep the stats banner
    const banner = page.locator('text=Total Day Tasks');
    const b = await banner.boundingBox();
    if (b) {
      await glideTo(page, b.x + 40, b.y + 50, 500);
      await glideTo(page, b.x + 560, b.y + 50, 1000);
    }
    await sleep(500);
    // a goal-bearing cell in the calendar — zoom in on the click
    const day = page.locator('text=/\\d+ Goals?/').first();
    if (await day.count()) {
      await glideToLocator(page, day, 500);
      await zoomTo(page, day, { scale: Z });
      await clickLocator(page, day, { variant });
      await sleep(1600);
      await zoomReset(page);
    }
    // expand week + month accordions, zoomed so the cascade is legible
    await smoothScroll(page, variant === 'mobile' ? 700 : 520, 1100);
    await sleep(600);
    const week = page.locator('text=/Week \\d+ 2026/').first();
    if (await week.count()) {
      await glideToLocator(page, week, 500);
      await zoomTo(page, week, { scale: Z * 0.85 });
      await clickLocator(page, week, { variant });
      await sleep(1700);
      await zoomReset(page);
    }
    const month = page.locator(`text=${MONTH_LABEL}`).last();
    if (await month.count()) {
      await glideToLocator(page, month, 500);
      await zoomTo(page, month, { scale: Z * 0.85 });
      await clickLocator(page, month, { variant });
      await sleep(1700);
      await zoomReset(page);
    }
    await smoothScroll(page, 300, 800);
    await sleep(1400);
  },

  async agents(page, variant) {
    const Z = zoomScale(variant);
    await page.goto(`${BASE}/agents`);
    await settle(page, 'Morning briefing');
    // hover each agent row
    for (const name of ['Evening recap', 'Morning briefing', 'Focus session log']) {
      const row = page.locator(`text=${name}`).first();
      if (await row.count()) {
        await glideToLocator(page, row, 550);
        await sleep(450);
      }
    }
    // zoom onto one agent row so the status counters read
    const briefingRow = page.locator('tr', { hasText: 'Morning briefing' }).first();
    if (await briefingRow.count()) {
      await zoomTo(page, briefingRow, { scale: Z * 0.85, hold: 1100 });
    }
    // open the editor for one agent
    const pencil = briefingRow.locator('button', { hasText: 'edit' }).first();
    if (await pencil.count()) {
      await clickLocator(page, pencil, { variant });
      await zoomReset(page, 450);
      await sleep(900);
      // close-up of the editor dialog. The mobile dialog is wider than the
      // viewport, so anchor the zoom on its name field with a gentler scale
      // instead of the (off-centre) dialog box itself.
      const dialog = page.locator('.v-dialog--active').first();
      if (await dialog.count()) {
        const anchor = dialog.locator('input[type="text"]').first();
        if (variant === 'mobile' && (await anchor.count())) {
          await zoomTo(page, anchor, { scale: 1.3, hold: 1400 });
        } else {
          await zoomTo(page, dialog, { scale: Math.min(Z, 1.45), hold: 1400 });
        }
        await zoomReset(page);
      } else {
        await smoothScroll(page, 220, 700);
        await sleep(1200);
      }
      await page.keyboard.press('Escape');
      await sleep(1200);
    } else {
      await zoomReset(page);
      await smoothScroll(page, 200, 700);
      await sleep(1500);
    }
  },

  async points(page, variant) {
    const Z = zoomScale(variant);
    await page.goto(`${BASE}/home`);
    await settle(page, TODAY_LABEL);
    // open on the points balance, magnified
    const chip = page.locator('text=/^\\d{3}$/').first();
    if (await chip.count()) {
      await glideToLocator(page, chip, 600);
      await zoomTo(page, chip, { scale: Z, hold: 1100 });
      await zoomReset(page);
    }
    // the passed tasks (redeem buttons) live behind the PAST tab on both
    // variants; fall back to scrolling the list if none shows up there
    const past = page.locator('.v-tabs__item:visible', { hasText: 'Past' }).first();
    if (await past.count()) {
      await clickLocator(page, past, { variant });
      await sleep(1100);
    }
    // redeem via the redeem button — zoom into the click, then follow the
    // quick-task modal in close-up
    const diamond = page.locator('button.task-action-btn', { hasText: 'diamond' }).first();
    await diamond.waitFor({ timeout: 10000 });
    // centre it in its scroll container — near the bottom edge the mobile
    // bottom-nav overlays the button and swallows the tap (page-level scroll
    // doesn't move this list; it scrolls in an inner container)
    await diamond.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    await sleep(1000);
    await glideToLocator(page, diamond, 550);
    await zoomTo(page, diamond, { scale: Z });
    await clickLocator(page, diamond, { variant, hover: 500 });
    await zoomReset(page, 450);
    const input = page.locator('.v-dialog--active input[type="text"]').first();
    await input.waitFor({ timeout: 10000 });
    await sleep(400);
    // dialog close-up: the mobile dialog is wider than the viewport, so
    // anchor the zoom on the task input with a gentler scale there
    const dialog = page.locator('.v-dialog--active').first();
    if (variant === 'mobile') await zoomTo(page, input, { scale: 1.35 });
    else await zoomTo(page, dialog, { scale: Math.min(Z, 1.5) });
    await clickLocator(page, input, { variant });
    await page.keyboard.type('Stretch and hydrate', { delay: 55 });
    await sleep(700);
    const start = page.locator('button', { hasText: /start task/i }).first();
    await clickLocator(page, start, { variant, hover: 450 });
    await sleep(1200);
    await zoomReset(page);
    await sleep(1200);
    // end on the updated balance, magnified
    if (await chip.count()) {
      await glideToLocator(page, chip, 700);
      await zoomTo(page, chip, { scale: Z, hold: 1600 });
    }
  },
};

// ---------- runner ----------
async function recordScene(browser, sceneName, variant) {
  const vp = VIEWPORTS[variant];
  const context = await browser.newContext({
    ...vp,
    recordVideo: { dir: OUT_DIR, size: vp.viewport },
  });
  await initScripts(context, variant);
  const page = await context.newPage();
  pos.set(page, { x: 60, y: 60 });
  zoomLog = { t0: Date.now(), windows: [], open: null };
  let poster = false;
  try {
    await scenes[sceneName](page, variant, async () => {});
    markZoomEnd(); // scene may end while still zoomed in
    // poster from the final settled state
    await page.screenshot({ path: join(OUT_DIR, `${sceneName}-${variant}-poster.jpg`), quality: 82, type: 'jpeg' });
    poster = true;
  } finally {
    const video = page.video();
    await context.close();
    if (video) {
      // saveAs waits for ffmpeg to finish flushing the recording — plain
      // rename/copy of video.path() hits EPERM on Windows while the encoder
      // still holds the file.
      const dest = join(OUT_DIR, `${sceneName}-${variant}.webm`);
      await video.saveAs(dest);
      await video.delete();
      // merge this scene's zoom windows into the shared timings file
      const mapPath = join(OUT_DIR, 'zoom-timings.json');
      let map = {};
      try { map = JSON.parse(readFileSync(mapPath, 'utf8')); } catch (e) { /* first run */ }
      map[`${sceneName}-${variant}`] = zoomLog.windows;
      writeFileSync(mapPath, JSON.stringify(map, null, 2));
      console.log(`  saved ${dest}${poster ? ' (+poster)' : ''} zooms=${JSON.stringify(zoomLog.windows)}`);
    }
  }
}

(async () => {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const order = ['routines', 'goals', 'agents', 'points'];
  for (const sceneName of order) {
    if (ONLY_SCENES && !ONLY_SCENES.includes(sceneName)) continue;
    for (const variant of ['desktop', 'mobile']) {
      if (ONLY_VARIANT && variant !== ONLY_VARIANT) continue;
      console.log(`→ ${sceneName} (${variant})`);
      try {
        await recordScene(browser, sceneName, variant);
      } catch (e) {
        console.error(`  FAILED ${sceneName}-${variant}: ${e.message}`);
      }
    }
  }
  await browser.close();
})();
