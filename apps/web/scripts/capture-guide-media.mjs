/**
 * Captures the guide's accordion media: one screenshot per detailed feature
 * state on each surface (Dashboard, Priority, Goals, Agents).
 *
 * Prereqs: backend on :3000 (dev), web-app on :8080, demo data seeded
 * (including priority-tagged day goals for the matrix), and a real JWT —
 * same as record-videos.mjs:
 *   node apps/web/scripts/capture-guide-media.mjs --tokenFile=<path>
 *
 * Output: apps/web/public/screenshots/guide/{page}-{state}.jpg (1280×800 @1.5x)
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../public/screenshots/guide');
const BASE = 'http://localhost:8080';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true])
);
const TOKEN = process.env.ROUTINE_NOTES_TOKEN
  || (args.tokenFile ? readFileSync(String(args.tokenFile), 'utf8').trim() : null);
if (!TOKEN) {
  console.error('Missing JWT: set ROUTINE_NOTES_TOKEN or pass --tokenFile=<path>');
  process.exit(1);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];
const NOW = new Date();
const TODAY_LABEL = `${String(NOW.getDate()).padStart(2, '0')} ${MONTHS[NOW.getMonth()]} ${NOW.getFullYear()}`;
const MONTH_LABEL = `${MONTHS[NOW.getMonth()]} ${NOW.getFullYear()}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(page, name) {
  await page.screenshot({ path: join(OUT_DIR, `${name}.jpg`), type: 'jpeg', quality: 85 });
  console.log(`  ${name}.jpg`);
}

(async () => {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.5,
  });
  await context.addInitScript((token) => {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('email', 'grvpanchalus@gmail.com');
      localStorage.setItem('name', 'Gaurav Panchal');
      localStorage.setItem('picture', '');
      localStorage.setItem('notification-token', '');
      localStorage.setItem('ONBOARDING_COMPLETE', 'true');
    } catch (e) { /* ignore */ }
  }, TOKEN);
  await context.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = '::-webkit-scrollbar{width:0!important;height:0!important} *{scrollbar-width:none!important}';
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
  });
  const page = await context.newPage();

  // ---- Dashboard ----
  console.log('dashboard');
  await page.goto(`${BASE}/home`);
  await page.waitForSelector(`text=${TODAY_LABEL}`, { timeout: 20000 });
  await sleep(2200);
  await shot(page, 'dashboard-day');

  const toggle = page.locator('.v-btn-toggle button:visible');
  const week = toggle.filter({ hasText: /^\s*Week\s*$/ }).first();
  if (await week.count()) {
    await week.click();
    await sleep(1400);
    await shot(page, 'dashboard-cascade');
    await toggle.filter({ hasText: /^\s*Today\s*$/ }).first().click();
    await sleep(900);
  }

  const past = page.locator('.v-tabs__item:visible', { hasText: 'Past' }).first();
  if (await past.count()) {
    await past.click();
    await sleep(1200);
    await page.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop = 260; });
    await sleep(800);
    await shot(page, 'dashboard-past');
    await page.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop = 0; });
  }

  const fab = page.locator('.v-btn--floating:visible').last();
  if (await fab.count()) {
    await fab.click();
    const input = page.locator('.v-dialog--active input[type="text"]').first();
    try {
      await input.waitFor({ timeout: 6000 });
      await sleep(700);
      await shot(page, 'dashboard-quicktask');
      await page.keyboard.press('Escape');
      await sleep(700);
    } catch (e) {
      console.log('  (quick-task modal not captured)');
    }
  }

  // ---- Priority ----
  console.log('priority');
  await page.goto(`${BASE}/priority`);
  await page.waitForSelector('text=DO NOW', { timeout: 20000 });
  await sleep(2000);
  await shot(page, 'priority-counts');

  await page.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop = 270; });
  await sleep(900);
  await shot(page, 'priority-quadrants');

  const matrixItem = page.locator('text=Record the demo walkthrough').first();
  if (await matrixItem.count()) {
    await matrixItem.click();
    await sleep(2200);
    await shot(page, 'priority-editor');
    const close = page.locator('.v-dialog--active button', { hasText: 'close' }).first();
    if (await close.count()) await close.click();
    else await page.keyboard.press('Escape');
    await sleep(700);
  }

  // ---- Goals ----
  console.log('goals');
  await page.goto(`${BASE}/goals`);
  await page.waitForSelector('text=Total Day Tasks', { timeout: 20000 });
  await sleep(2200);
  await shot(page, 'goals-calendar');

  await page.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop = 520; });
  await sleep(800);
  const weekAcc = page.locator('text=/Week \\d+ 2026/').first();
  if (await weekAcc.count()) {
    await weekAcc.click();
    await sleep(1500);
    await shot(page, 'goals-week');
  }
  const month = page.locator(`text=${MONTH_LABEL}`).last();
  if (await month.count()) {
    await month.click();
    await sleep(1500);
    await page.evaluate(() => { (document.scrollingElement || document.documentElement).scrollTop += 180; });
    await sleep(700);
    await shot(page, 'goals-cascade');
  }

  // ---- Agents ----
  console.log('agents');
  await page.goto(`${BASE}/agents`);
  await page.waitForSelector('text=Morning briefing', { timeout: 20000 });
  await sleep(2200);
  await shot(page, 'agents-table');

  const row = page.locator('tr', { hasText: 'Morning briefing' }).first();
  if (await row.count()) {
    await row.hover();
    await sleep(600);
    await shot(page, 'agents-lifecycle');
    const pencil = row.locator('button', { hasText: 'edit' }).first();
    if (await pencil.count()) {
      await pencil.click();
      await sleep(2200);
      await shot(page, 'agents-editor');
      await page.keyboard.press('Escape');
    }
  }

  await browser.close();
  console.log('done');
})();
