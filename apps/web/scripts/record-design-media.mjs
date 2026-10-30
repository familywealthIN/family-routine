/**
 * Renders the marketing site's product media from the design prototypes in
 * packages/design/*.dc.html: no backend, no login, no seeded data.
 *
 *   - public/screenshots/home-mobile.png       hero phone (412×892 frame at 2×)
 *   - public/screenshots/guide/*.jpg            guide chapters (1440×900 frames at 1.33×)
 *   - public/videos/{scene}-{desktop,mobile}.webm + -poster.jpg   FeatureScenes and guide videos
 *
 * Each .dc.html lays out a page's Phone / iPad / Desktop frames side by side.
 * A shot pins one frame to its design size, lifts it to the top-left of the
 * viewport, clicks through the prototype (with a drawn cursor for videos) and
 * captures it.
 *
 * Run from the repo root:
 *   node apps/web/scripts/record-design-media.mjs [--only=shots|videos] [--scene=routines,goals] [--variant=desktop|mobile] [--dry]
 * --dry saves a still after every video step to <os tmp>/design-media-dry instead of recording.
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DESIGN = resolve(__dirname, '../../../packages/design');
const SHOTS = resolve(__dirname, '../public/screenshots');
const VIDEOS = resolve(__dirname, '../public/videos');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true])
);
const ONLY_SCENES = args.scene ? String(args.scene).split(',') : null;
const DRY = !!args.dry;
const DRY_DIR = join(tmpdir(), 'design-media-dry');

// Design frame sizes. `scale` is the capture's deviceScaleFactor.
const FRAMES = {
  phone: { w: 412, h: 893 },
  desktop: { w: 1440, h: 900 },
};

// ── Stills ────────────────────────────────────────────────────────────────
const G = (n) => join(SHOTS, 'guide', `${n}.jpg`);
const SHOT_JOBS = [
  { file: 'Routine Notes Final', opt: '5a', kind: 'phone', scale: 786 / 412, out: join(SHOTS, 'home-mobile.png') },
  { file: 'Routine Notes Final', opt: '6b', kind: 'desktop', out: G('dashboard-day') },
  { file: 'Routine Notes Final', opt: '6b', kind: 'desktop', out: G('dashboard-cascade'), steps: [{ text: 'Week', exact: true }] },
  { file: 'Routine Notes Final', opt: '6b', kind: 'desktop', out: G('dashboard-past'), steps: [{ text: 'Fri', exact: true }] },
  { file: 'Routine Notes Final', opt: '6b', kind: 'desktop', out: G('dashboard-quicktask'), steps: [{ text: 'Add task' }] },
  // The iPad frame, so it doesn't repeat priority-quadrants. It is not a device element, so it is clipped, not pinned.
  { file: 'Priority', opt: 'pt', kind: 'tablet', out: G('priority-counts') },
  { file: 'Priority', opt: 'pd', kind: 'desktop', out: G('priority-quadrants') },
  { file: 'Priority', opt: 'pd', kind: 'desktop', out: G('priority-editor'), steps: [{ text: 'open_with', exact: true, nth: 2 }] },
  { file: 'Goals', opt: 'gd', kind: 'desktop', out: G('goals-calendar') },
  { file: 'Goals', opt: 'gd', kind: 'desktop', out: G('goals-week'), steps: [{ text: 'Week', exact: true }] },
  { file: 'Year Goals', opt: 'yd', kind: 'desktop', out: G('goals-cascade') },
  { file: 'Agents', opt: 'ad', kind: 'desktop', out: G('agents-table') },
  { file: 'Agents', opt: 'ad', kind: 'desktop', out: G('agents-lifecycle'), steps: [{ text: 'Ticket Triage', exact: true }] },
  { file: 'Agents', opt: 'ad', kind: 'desktop', out: G('agents-editor'), steps: [{ text: 'edit', exact: true }] },
];

// ── Videos ────────────────────────────────────────────────────────────────
// One flow per FeatureScenes scene. `zoom` on a step frames the camera on
// that target first (desktop only: the site zooms the phone frame itself).
const SCENES = {
  routines: {
    file: 'Routine Notes Final',
    desktop: {
      opt: '6b',
      steps: [
        { text: 'Update release notes', exact: true, dx: -22, zoom: 1.6 },
        { text: 'Standup · 10:30', exact: true, dx: -22 },
        { unzoom: true },
        { text: 'Week', exact: true, zoom: 1.5 },
        { text: 'Today', exact: true, nth: -1 },
        { unzoom: true },
        { text: 'Add task', zoom: 1.4 },
        { type: 'Call dentist tomorrow at 10am' },
        { text: 'close', exact: true },
        { unzoom: true },
      ],
    },
    mobile: {
      opt: '5a',
      steps: [
        { text: 'Update release notes', exact: true, dx: -22 },
        { text: 'Standup · 10:30', exact: true, dx: -22 },
        { text: 'Week', exact: true },
        { text: 'Month', exact: true },
        { text: 'Today', exact: true, nth: -1 },
      ],
    },
  },
  goals: {
    file: 'Goals',
    desktop: {
      opt: 'gd',
      steps: [
        { text: 'Week', exact: true, zoom: 1.5 },
        { text: 'Month', exact: true },
        { text: 'Year', exact: true },
        { unzoom: true },
        { text: 'Today', exact: true },
        { text: '10', exact: true, zoom: 1.5 },
        { unzoom: true },
      ],
    },
    mobile: {
      opt: 'gp',
      steps: [
        { text: 'Week', exact: true },
        { text: 'Month', exact: true },
        { text: 'Year', exact: true },
        { text: 'Today', exact: true },
      ],
    },
  },
  agents: {
    file: 'Agents',
    desktop: {
      opt: 'ad',
      steps: [
        { text: 'Ticket Triage', exact: true, zoom: 1.4 },
        { text: 'Grocery Order', exact: true },
        { unzoom: true },
        { text: 'PR Summarizer', exact: true },
        { text: 'Run test', zoom: 1.5, wait: 4500 },
        { unzoom: true },
      ],
    },
    mobile: {
      opt: 'ap',
      steps: [
        { text: 'PR Summarizer', exact: true, wait: 1200 },
        { text: 'Run test', wait: 4500 },
      ],
    },
  },
  // The ring opens the Start sheet ("earns +12 pts"); Start Task ticks the routine and the points chip counts up.
  points: {
    file: 'Routine Notes Final',
    desktop: {
      opt: '6b',
      steps: [
        { ring: true, wait: 1800 },
        { text: 'Start Task', exact: true, wait: 3200 },
        { text: 'Alex Morgan', exact: true, wait: 2200 },
      ],
    },
    mobile: {
      opt: '5a',
      steps: [
        { ring: true, wait: 1800 },
        { text: 'Start Task', exact: true, wait: 3200 },
        { avatar: true, wait: 2200 },
      ],
    },
  },
};

const CURSOR_CSS = `
#dm-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;
  transition:transform 650ms cubic-bezier(.22,1,.36,1);
  background:url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><path d="M6 2.5l5.2 18 2.9-7 7-2.6z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>')}") no-repeat}
#dm-cursor.touch{width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(40,139,213,.28);border:2px solid rgba(40,139,213,.7)}
#dm-cursor.down{filter:drop-shadow(0 0 6px rgba(40,139,213,.9))}
#dm-cursor.touch.down{background:rgba(40,139,213,.5)}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ffmpegPath() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
    || (process.platform === 'win32' ? join(homedir(), 'AppData/Local/ms-playwright')
      : process.platform === 'darwin' ? join(homedir(), 'Library/Caches/ms-playwright')
        : join(homedir(), '.cache/ms-playwright'));
  const dir = readdirSync(root).filter((d) => d.startsWith('ffmpeg')).sort().pop();
  if (!dir) throw new Error(`No Playwright ffmpeg under ${root}; run: npx playwright install ffmpeg`);
  const bin = readdirSync(join(root, dir)).find((f) => f.startsWith('ffmpeg'));
  return join(root, dir, bin);
}

/** Opens a design file and returns the frame of option `opt`, pinned to its design size at the top-left. */
async function openFrame(page, file, opt, kind) {
  await page.goto(pathToFileURL(join(DESIGN, `${file}.dc.html`)).href);
  await page.waitForTimeout(2500);
  await page.evaluate(() => document.fonts.ready);
  if (kind === 'tablet') return page.locator(`[id="${opt}"] > div:nth-child(2) > div`).first();
  const frame = page.locator(`[id="${opt}"] .sc-host-x > *`).first();
  const { w, h } = FRAMES[kind];
  await frame.evaluate((el, [w, h]) => {
    // Pin the device element and its app root: the inner scroll region then scrolls instead of growing.
    for (const n of [el, el.firstElementChild]) {
      Object.assign(n.style, { width: `${w}px`, height: `${h}px`, maxHeight: `${h}px`, overflow: 'hidden', borderRadius: '0', boxShadow: 'none', border: '0' });
    }
    Object.assign(el.style, { position: 'fixed', left: '0', top: '0', zIndex: '2147483000', transformOrigin: '0 0', transition: 'transform 750ms cubic-bezier(.22,1,.36,1)' });
    document.documentElement.style.overflow = 'hidden';
  }, [w, h]);
  return frame;
}

/** The element a step targets: the deepest element whose text matches, or the avatar button. */
async function target(frame, s) {
  const box = await frame.evaluate((root, s) => {
    let el;
    if (s.ring) {
      // The focus card's progress ring: the largest round clickable element.
      el = [...root.querySelectorAll('*')]
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const cs = getComputedStyle(e);
          return cs.cursor === 'pointer' && r.width >= 60 && Math.abs(r.width - r.height) < 4 && parseFloat(cs.borderRadius) >= r.width / 2 - 1;
        })
        .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    } else if (s.avatar) {
      el = [...root.querySelectorAll('*')].find((e) => {
        const r = e.getBoundingClientRect();
        return getComputedStyle(e).cursor === 'pointer' && r.top < 120 && r.left > root.getBoundingClientRect().width * 0.7 && r.width >= 36 && r.width <= 60;
      });
    } else {
      const norm = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
      const want = norm(s.text);
      const hit = (e) => (s.exact ? norm(e.textContent) === want : norm(e.textContent).includes(want));
      const all = [...root.querySelectorAll('*')].filter((e) => hit(e) && ![...e.children].some(hit) && e.getBoundingClientRect().width > 0);
      el = s.nth < 0 ? all[all.length + s.nth] : all[s.nth || 0]; // nth -1: the last match
    }
    if (!el) return null;
    el.scrollIntoView({ block: 'nearest' });
    const r = el.getBoundingClientRect();
    // dx: click that far from the element's left edge instead of its centre (a row's checkbox sits left of its title).
    return { x: s.dx != null ? r.x + s.dx : r.x + r.width / 2, y: r.y + r.height / 2 };
  }, s);
  if (!box) throw new Error(`target not found: ${JSON.stringify(s)}`);
  return box;
}

async function zoomTo(frame, page, pt, scale) {
  // Scale the frame around the target, then pull the target toward the viewport centre (clamped to the frame).
  const vp = page.viewportSize();
  await frame.evaluate((el, [x, y, scale, vw, vh]) => {
    const cur = new DOMMatrix(getComputedStyle(el).transform === 'none' ? undefined : getComputedStyle(el).transform);
    const fx = (x - cur.e) / cur.a;
    const fy = (y - cur.f) / cur.d;
    const tx = Math.min(0, Math.max(vw - vw * scale, vw / 2 - fx * scale));
    const ty = Math.min(0, Math.max(vh - vh * scale, vh / 2 - fy * scale));
    el.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }, [pt.x, pt.y, scale, vp.width, vp.height]);
  await sleep(850);
}

async function shoot(browser, j) {
  const kind = j.kind;
  const scale = j.scale || (kind === 'tablet' ? 1920 / 1131 : 1920 / 1440);
  const ctx = await browser.newContext({ viewport: { width: 1700, height: 1100 }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  const frame = await openFrame(page, j.file, j.opt, kind);
  for (const s of j.steps || []) {
    const pt = await target(frame, s);
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(500);
  const type = j.out.endsWith('.png') ? 'png' : 'jpeg';
  const quality = type === 'jpeg' ? 85 : undefined;
  if (kind === 'tablet') {
    // Skip the iPad status bar and the bezel's right edge; keep 16:10.
    await frame.scrollIntoViewIfNeeded();
    const r = await frame.boundingBox();
    await page.screenshot({ path: j.out, type, quality, clip: { x: r.x, y: r.y + 24, width: 1131, height: 1131 / 1.6 } });
  } else {
    const { w, h } = FRAMES[kind];
    await page.screenshot({ path: j.out, type, quality, clip: { x: 0, y: 0, width: w, height: h } });
  }
  await ctx.close();
  console.log('  shot', j.out.replace(SHOTS, 'screenshots'));
}

async function record(browser, name, variant) {
  const scene = SCENES[name];
  const flow = scene[variant];
  const kind = variant === 'mobile' ? 'phone' : 'desktop';
  const { w, h } = FRAMES[kind];
  // Desktop records the 1440×900 frame down to 1280×800, the size the site's recordings have always been.
  const size = variant === 'mobile' ? { width: w, height: h } : { width: 1280, height: 800 };
  const rawDir = join(tmpdir(), 'design-media-raw');
  mkdirSync(rawDir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    ...(DRY ? {} : { recordVideo: { dir: rawDir, size } }),
  });
  const page = await ctx.newPage();
  const t0 = Date.now();
  const frame = await openFrame(page, scene.file, flow.opt, kind);
  await page.addStyleTag({ content: CURSOR_CSS });
  await page.evaluate((touch) => {
    const c = document.createElement('div');
    c.id = 'dm-cursor';
    if (touch) c.className = 'touch';
    c.style.transform = `translate(${innerWidth * 0.62}px, ${innerHeight * 0.72}px)`;
    document.body.appendChild(c);
  }, variant === 'mobile');
  const head = (Date.now() - t0) / 1000; // everything before this is page load: trimmed away
  await sleep(1200);

  const moveCursor = (pt) => page.evaluate(({ x, y }) => { document.getElementById('dm-cursor').style.transform = `translate(${x}px, ${y}px)`; }, pt);
  const press = (on) => page.evaluate((on) => document.getElementById('dm-cursor').classList.toggle('down', on), on);

  let i = 0;
  for (const s of flow.steps) {
    i += 1;
    if (s.unzoom) {
      await frame.evaluate((el) => { el.style.transform = 'none'; });
      await sleep(900);
      continue;
    }
    if (s.type) {
      await page.keyboard.type(s.type, { delay: 55 });
      await sleep(s.wait || 900);
      continue;
    }
    if (s.key) {
      await page.keyboard.press(s.key);
      await sleep(s.wait || 700);
      continue;
    }
    let pt = await target(frame, s);
    if (s.zoom && variant === 'desktop') {
      await zoomTo(frame, page, pt, s.zoom);
      pt = await target(frame, s);
    }
    await moveCursor(pt);
    await sleep(750);
    await press(true);
    await page.mouse.click(pt.x, pt.y);
    await sleep(160);
    await press(false);
    await sleep(s.wait || 1300);
    if (DRY) {
      mkdirSync(DRY_DIR, { recursive: true });
      await page.screenshot({ path: join(DRY_DIR, `${name}-${variant}-${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 70 });
    }
  }
  await frame.evaluate((el) => { el.style.transform = 'none'; });
  await sleep(1400);

  if (DRY) {
    await ctx.close();
    console.log('  dry', name, variant);
    return;
  }
  // Poster: the settled end state, without the cursor.
  await page.evaluate(() => document.getElementById('dm-cursor').remove());
  await page.screenshot({ path: join(VIDEOS, `${name}-${variant}-poster.jpg`), type: 'jpeg', quality: 82 });
  const video = page.video();
  await ctx.close();
  const raw = join(rawDir, `${name}-${variant}.webm`);
  await video.saveAs(raw);
  const out = join(VIDEOS, `${name}-${variant}.webm`);
  // Playwright's bundled ffmpeg has the VP8 and png encoders only.
  execFileSync(ffmpegPath(), ['-y', '-loglevel', 'error', '-ss', head.toFixed(2), '-i', raw, '-c:v', 'libvpx', '-b:v', '2M', '-crf', '10', '-an', `${out}.tmp.webm`]);
  if (existsSync(out)) rmSync(out);
  renameSync(`${out}.tmp.webm`, out);
  rmSync(raw);
  console.log(`  video ${name}-${variant}.webm (head ${head.toFixed(1)}s trimmed)`);
}

const browser = await chromium.launch();
try {
  if (args.only !== 'videos' && !DRY) {
    console.log('Screenshots');
    for (const j of SHOT_JOBS) await shoot(browser, j);
  }
  if (args.only !== 'shots') {
    console.log('Videos');
    for (const name of Object.keys(SCENES)) {
      if (ONLY_SCENES && !ONLY_SCENES.includes(name)) continue;
      for (const variant of ['desktop', 'mobile']) {
        if (args.variant && args.variant !== variant) continue;
        await record(browser, name, variant);
      }
    }
    if (!DRY && !ONLY_SCENES && !args.variant) {
      // The prototypes' phone flows don't zoom, so the site's phone frame stays still.
      writeFileSync(join(VIDEOS, 'zoom-timings.json'), `${JSON.stringify(Object.fromEntries(Object.keys(SCENES).map((n) => [`${n}-mobile`, []])), null, 2)}\n`);
    }
  }
} finally {
  await browser.close();
}
