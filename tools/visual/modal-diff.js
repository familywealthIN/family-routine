// node tools/visual/modal-diff.js <outDir> <name=origin|distDir> [<name=origin|distDir> ...]
// Opens the same modals and sheets on each target (a dist dir is served
// statically; an http origin is used as is), screenshots them, records the
// computed style of every button inside the open modal, and diffs each target
// against the first. Never presses a button inside a modal.
const ROOT = require('path').resolve(__dirname, '../..');
require(ROOT + '/node_modules/dotenv').config({ path: ROOT + '/.env' });
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, webkit, devices } = require(ROOT + '/node_modules/@playwright/test');
const jwt = require(ROOT + '/node_modules/jsonwebtoken');

const [outDir, ...targetArgs] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
let port = 8191;
function serve(dir) {
  return new Promise((resolve) => {
    const p = port; port += 1;
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      let file = path.join(dir, url);
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html');
      if (/service-worker|sw\.js/.test(url)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    }).listen(p, '127.0.0.1', () => resolve({ server, origin: `http://127.0.0.1:${p}` }));
  });
}

const SHELLS = {
  phone: { ...devices['Pixel 7'] },
  // iPhone 13 in WebKit: 390px is under the sheets' 400px narrow-phone
  // breakpoint, which the 412px Pixel never reaches (the Start sheet's buttons
  // collapsed there, 26 Oct 2026), and WebKit is what iPhones render with.
  iphone: { ...devices['iPhone 13'], engine: 'webkit' },
  ipad: { viewport: { width: 1133, height: 744 }, deviceScaleFactor: 1 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};
const token = jwt.sign({ email: 'grvpanchalus@gmail.com', exp: Math.floor(Date.now() / 1000) + 7200 }, process.env.JWT_SECRET);
const FROZEN = new Date();
const MODAL = '.v-dialog--active, .v-menu__content.menuable__content__active, [role="dialog"], .rn-sheet, .rn-rsheet, [class*="sheet--open"], [class*="__sheet"], [class*="modal"]';

// Each scenario opens one modal: `steps` are clicked in order, each step the
// first selector of its list that exists. Prefer data-testid hooks; a modal
// whose opener has none gets a text match. `opened` in the report says whether
// every step found something - a scenario that did not open proves nothing.
const SCENARIOS = [
  { name: 'home-ring-sheet', route: '/home', steps: [['[data-testid="routine-tick-button"]', '[data-testid="routine-focus-ring"]']] },
  { name: 'home-add-sheet', route: '/home', steps: [['[data-testid="composer-add"]']] },
  { name: 'home-add-task-row', route: '/home', steps: [['[data-testid="add-task-row"]']] },
  { name: 'home-goal-sheet', route: '/home', steps: [['.rn-focus-card__row .rn-focus-card__text', '[data-testid^="checklist-row"]']] },
  { name: 'home-drawer', route: '/home', steps: [['[data-testid="topbar-avatar"]', '[data-testid="side-profile"]']] },
  { name: 'home-inbox', route: '/home', steps: [['[data-testid="topbar-inbox"]', '.rn-home__inbox', '[data-testid^="inbox"]']] },
  { name: 'settings-routine-editor', route: '/settings', steps: [['[data-testid^="routine-row-"]', '.rn-routines__row', 'text=Wake Up']] },
  { name: 'settings-new-routine', route: '/settings', steps: [['[data-testid="routines-new"]']] },
  { name: 'agents-new', route: '/agents', steps: [['[data-testid="agents-new"]']] },
  { name: 'agents-detail', route: '/agents', steps: [['[data-testid^="agent-card-"]']] },
  { name: 'agents-edit', route: '/agents', steps: [['[data-testid^="agent-card-"]'], ['[data-testid="agent-detail-edit"]']] },
  { name: 'goals-new', route: '/goals', steps: [['[data-testid="goals-new"]']] },
  { name: 'goals-day-new', route: '/goals', steps: [['[data-testid="day-new"]', '[data-testid="add-week-goal"]']] },
  { name: 'yeargoals-row', route: '/year-goals', steps: [['[data-testid^="year-goal-row-"]', '[data-testid="add-month-goal"]']] },
  { name: 'profile-delete', route: '/settings/profile', steps: [[/delete account/i]] },
];

async function clickStep(page, step) {
  for (const sel of step) {
    const el = sel instanceof RegExp
      ? page.locator('button, a, [role="button"], .v-btn, div[class*="btn"]').filter({ hasText: sel }).first()
      : page.locator(sel).first();
    if (await el.count().catch(() => 0)) {
      try { await el.click({ timeout: 3000 }); return true; } catch (e) { /* next */ }
    }
  }
  return false;
}

async function run(browser, shell, origin, sc, file) {
  const { engine = 'chromium', ...device } = SHELLS[shell];
  const ctx = await browser[engine].newContext({ ...device, serviceWorkers: 'block' });
  try {
    await ctx.clock.setFixedTime(FROZEN);
    await ctx.addInitScript(([t, e]) => {
      localStorage.setItem('token', t); localStorage.setItem('email', e);
      localStorage.setItem('name', 'Gaurav Panchal'); localStorage.setItem('picture', '');
    }, [token, 'grvpanchalus@gmail.com']);
    const page = await ctx.newPage();
    // Never let a modal action write anything.
    await page.route('**/graphql', async (route) => {
      const body = route.request().postData() || '';
      if (/^\s*\{?\s*"?(operationName)?.*"query"\s*:\s*"\s*mutation/.test(body) || /"query":"mutation/.test(body)) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":null}' });
      }
      return route.continue();
    });
    await page.goto(origin + sc.route, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const before = await page.locator(MODAL).count();
    let opened = true;
    for (const step of sc.steps) {
      // eslint-disable-next-line no-await-in-loop
      opened = opened && await clickStep(page, step);
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(1200);
    }
    await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;animation-delay:-0.001s!important;transition:none!important;caret-color:transparent!important}' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: file });
    const buttons = await page.evaluate((MODAL_SEL) => {
      const modals = [...document.querySelectorAll(MODAL_SEL)].filter((m) => {
        const r = m.getBoundingClientRect(); const s = getComputedStyle(m);
        return r.width > 40 && r.height > 40 && s.display !== 'none' && s.visibility !== 'hidden';
      });
      const btns = new Set();
      modals.forEach((m) => m.querySelectorAll('button, .v-btn, [role="button"], a[class*="btn"]').forEach((b) => btns.add(b)));
      return [...btns].map((b) => {
        const s = getComputedStyle(b); const r = b.getBoundingClientRect();
        return {
          text: (b.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30),
          cls: String(b.className).slice(0, 60),
          box: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
          style: ['display', 'background-color', 'color', 'border-radius', 'font-size', 'font-weight', 'height', 'padding', 'text-transform', 'box-shadow', 'border', 'min-width', 'justify-content'].map((k) => `${k}:${s.getPropertyValue(k)}`).join(';'),
        };
      });
    }, MODAL);
    return { opened, modalCountBefore: before, buttons };
  } finally {
    await ctx.close();
  }
}

async function pixelDiff(browser, a, b, out) {
  const page = await browser.newPage();
  try {
    const toUrl = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    const r = await page.evaluate(async ([ua, ub]) => {
      const load = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = u; });
      const [ia, ib] = await Promise.all([load(ua), load(ub)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { changed: -1 };
      const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
      const x = c.getContext('2d');
      x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, c.width, c.height).data;
      x.drawImage(ib, 0, 0); const img = x.getImageData(0, 0, c.width, c.height); const db = img.data;
      let changed = 0;
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
        if (d > 30) { changed += 1; db[i] = 255; db[i + 1] = 0; db[i + 2] = 255; } else { db[i + 3] = 60; }
      }
      x.putImageData(img, 0, 0);
      return { changed, png: changed ? c.toDataURL('image/png') : null };
    }, [toUrl(a), toUrl(b)]);
    if (r.png) fs.writeFileSync(out, Buffer.from(r.png.split(',')[1], 'base64'));
    return r.changed;
  } finally { await page.close(); }
}

(async () => {
  const servers = [];
  const targets = [];
  for (const arg of targetArgs) {
    const [name, where] = arg.split('=');
    if (/^https?:/.test(where)) targets.push({ name, origin: where });
    else { const s = await serve(where); servers.push(s.server); targets.push({ name, origin: s.origin }); }
  }
  const browser = { chromium: await chromium.launch(), webkit: await webkit.launch() };
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const report = [];
  try {
    for (const shell of Object.keys(SHELLS)) {
      for (const sc of SCENARIOS.filter((s) => !only || only.includes(s.name))) {
        const results = {};
        for (const t of targets) {
          const file = path.join(outDir, `${shell}_${sc.name}.${t.name}.png`);
          // eslint-disable-next-line no-await-in-loop
          results[t.name] = await run(browser, shell, t.origin, sc, file).catch((e) => ({ error: e.message.slice(0, 120) }));
          results[t.name].file = file;
        }
        const base = targets[0].name;
        const line = [`${shell}_${sc.name}`.padEnd(34)];
        for (const t of targets.slice(1)) {
          const px = await pixelDiff(browser.chromium, results[base].file, results[t.name].file, path.join(outDir, `${shell}_${sc.name}.${t.name}.diff.png`)).catch(() => 'err');
          const bb = JSON.stringify(results[base].buttons || []);
          const tb = JSON.stringify(results[t.name].buttons || []);
          line.push(`${t.name}: px=${px} buttonStyles=${bb === tb ? 'same' : 'DIFFER'}`);
          if (bb !== tb) {
            const A = results[base].buttons || []; const B = results[t.name].buttons || [];
            for (let i = 0; i < Math.max(A.length, B.length); i += 1) {
              if (JSON.stringify(A[i]) !== JSON.stringify(B[i])) {
                const da = A[i] || {}; const db = B[i] || {};
                const sa = (da.style || '').split(';'); const sb = (db.style || '').split(';');
                const props = sa.map((v, k) => (v !== sb[k] ? `${v} -> ${(sb[k] || '').split(':').slice(1).join(':')}` : null)).filter(Boolean);
                line.push(`\n      btn "${da.text || db.text}" [${da.box} -> ${db.box}] ${props.join(' | ')}${da.cls !== db.cls ? ` cls ${da.cls} -> ${db.cls}` : ''}`);
              }
            }
          }
        }
        line.push(`opened=${targets.map((t) => `${t.name}:${results[t.name].opened}`).join(',')} btns=${targets.map((t) => (results[t.name].buttons || []).length).join('/')}`);
        console.log(line.join('  '));
        report.push({ shell, scenario: sc.name, results });
      }
    }
  } finally {
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 1));
    await Promise.all(Object.values(browser).map((b) => b.close()));
    servers.forEach((s) => s.close());
  }
})().catch((e) => { console.error(e); process.exit(1); });
