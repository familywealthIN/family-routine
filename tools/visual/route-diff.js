// node visual-diff.js <beforeDist> <afterDist> <outDir>
// Serves two builds of the web-app side by side and screenshots every route at
// phone / iPad mini / desktop, before then after, with the same frozen clock,
// then pixel-diffs each pair in a canvas.
const ROOT = require('path').resolve(__dirname, '../..');
require(ROOT + '/node_modules/dotenv').config({ path: ROOT + '/.env' });
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium, webkit, devices } = require(ROOT + '/node_modules/@playwright/test');
const jwt = require(ROOT + '/node_modules/jsonwebtoken');

const [beforeDir, afterDir, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };
function serve(dir, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0]);
      let file = path.join(dir, url);
      if (!file.startsWith(path.resolve(dir)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dir, 'index.html');
      // No service worker: both builds must load fresh every time.
      if (/service-worker|sw\.js/.test(url)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    }).listen(port, '127.0.0.1', () => resolve(server));
  });
}

const ROUTES = (process.env.ONLY ? process.env.ONLY.split(',') : ['/home', '/goals', '/goals/milestones', '/year-goals', '/priority', '/agents', '/progress', '/groups', '/settings', '/settings/profile', '/settings/notifications', '/about', '/search', '/history', '/agenda/tree', '/stats', '/wizard', '/guide']);
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

async function shot(browser, shell, origin, route, file, authed) {
  const { engine = 'chromium', ...device } = SHELLS[shell];
  const ctx = await browser[engine].newContext({ ...device, serviceWorkers: 'block' });
  await ctx.clock.setFixedTime(FROZEN);
  if (authed) {
    await ctx.addInitScript(([t, e]) => {
      localStorage.setItem('token', t); localStorage.setItem('email', e);
      localStorage.setItem('name', 'Gaurav Panchal'); localStorage.setItem('picture', '');
    }, [token, 'grvpanchalus@gmail.com']);
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  await page.goto(origin + route, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  // Freeze animations so a breathing ring or a toast does not count as a diff.
  await page.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;animation-delay:-0.001s!important;transition:none!important;caret-color:transparent!important}' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: file });
  const stats = await page.evaluate(() => ({ rules: [...document.styleSheets].reduce((n, s) => { try { return n + s.cssRules.length; } catch (e) { return n; } }, 0), url: location.pathname }));
  await ctx.close();
  return { ...stats, errors };
}

async function diff(browser, a, b, out) {
  const page = await browser.newPage();
  const toUrl = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
  const r = await page.evaluate(async ([ua, ub]) => {
    const load = (u) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = u; });
    const [ia, ib] = await Promise.all([load(ua), load(ub)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { size: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}`, changed: -1 };
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
    return { changed, total: da.length / 4, png: changed ? c.toDataURL('image/png') : null };
  }, [toUrl(a), toUrl(b)]);
  if (r.png) fs.writeFileSync(out, Buffer.from(r.png.split(',')[1], 'base64'));
  await page.close();
  return r;
}

(async () => {
  const s1 = await serve(beforeDir, 8091);
  const s2 = await serve(afterDir, 8092);
  const browser = { chromium: await chromium.launch(), webkit: await webkit.launch() };
  const rows = [];
  const jobs = [];
  for (const shell of Object.keys(SHELLS)) {
    jobs.push({ shell, route: '/', authed: false });
    for (const route of ROUTES) jobs.push({ shell, route, authed: true });
  }
  for (const j of jobs) {
    const name = `${j.shell}${j.route.replace(/\//g, '_') || '_login'}${j.authed ? '' : '_login'}`;
    const fa = path.join(outDir, `${name}.before.png`);
    const fb = path.join(outDir, `${name}.after.png`);
    const before = await shot(browser, j.shell, 'http://127.0.0.1:8091', j.route, fa, j.authed);
    const after = await shot(browser, j.shell, 'http://127.0.0.1:8092', j.route, fb, j.authed);
    let d = await diff(browser.chromium, fa, fb, path.join(outDir, `${name}.diff.png`));
    // Live data can move between the two shots; one re-shoot of the after side
    // separates a flicker from a real difference.
    if (d.changed) {
      await shot(browser, j.shell, 'http://127.0.0.1:8091', j.route, fa, j.authed);
      await shot(browser, j.shell, 'http://127.0.0.1:8092', j.route, fb, j.authed);
      d = await diff(browser.chromium, fa, fb, path.join(outDir, `${name}.diff.png`));
    }
    const row = { name, route: j.route, shell: j.shell, rulesBefore: before.rules, rulesAfter: after.rules, landed: after.url, changedPx: d.changed, size: d.size, errorsBefore: before.errors.length, errorsAfter: after.errors.length };
    rows.push(row);
    console.log(`${d.changed === 0 ? 'same ' : 'DIFF '} ${name.padEnd(40)} px=${d.changed}${d.size ? ' ' + d.size : ''} rules ${before.rules}/${after.rules} landed=${after.url} err ${before.errors.length}/${after.errors.length}`);
  }
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(rows, null, 1));
  await Promise.all(Object.values(browser).map((b) => b.close())); s1.close(); s2.close();
})().catch((e) => { console.error(e); process.exit(1); });
