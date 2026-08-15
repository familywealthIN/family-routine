/* eslint-disable no-await-in-loop, no-console */
/**
 * day-rollover.spec.js — the four behaviours the dashboard has to get right
 * around loading and the day boundary.
 *
 *   1. A cold PWA open is interactive immediately, with no skeleton flash over
 *      data we already have.
 *   2. A tick made before the API has settled still lands — including when the
 *      user beats the goal item's own save, where the agent now queues behind
 *      the real id and says "Agent waiting" instead of silently not running.
 *   3. Crossing midnight throws every client cache away ("Preparing new day")
 *      so the new day cannot inherit yesterday's normalized entities.
 *   4. That rollover is detected when the app RESUMES, not only when a 30s
 *      timer happens to fire — the case a suspended PWA never sees.
 *
 * Like cache-integrity, this runs against the real database and restores the
 * routine document it touches.
 */

const { test, expect } = require('@playwright/test');
const { gotoAuthed } = require('./helpers/auth');
const { gql, todayDate } = require('./helpers/api');
const {
  seedStackedDay, purgeSeed, snapshotRoutine, restoreRoutine, ensureRoutine,
} = require('./helpers/seed');

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

const DATE = todayDate();

let seeded = null;
let routineSnapshot = null;

const nextDate = (date, delta = 1) => {
  const [dd, mm, yyyy] = date.split('-').map(Number);
  const d = new Date(yyyy, mm - 1, dd + delta);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

async function openApp(page) {
  await gotoAuthed(page, '/home');
  await page.waitForFunction(() => !!window.__APOLLO_CLIENT__, { timeout: 20_000 });
  await page.waitForFunction(
    (d) => {
      const c = window.__APOLLO_CLIENT__;
      if (!c) return false;
      const s = c.cache.extract();
      return !!s.ROOT_QUERY && !!s.ROOT_QUERY[`optimizedDailyGoals({"date":"${d}"})`];
    },
    DATE,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(600);
}

async function closeApp(page) {
  await page.waitForTimeout(1400); // let the persist debounce flush
  await page.goto('about:blank');
  await page.waitForTimeout(200);
}

test.beforeAll(async () => {
  routineSnapshot = await snapshotRoutine(DATE);
  await purgeSeed({ dates: [DATE] });
  await ensureRoutine(DATE);
  seeded = await seedStackedDay({ date: DATE, dayGoalsPerTask: 2 });
  console.log(`[seed] ${seeded.tasks.length} tasks, ${seeded.dayGoals.length} day goals on ${DATE}`);
});

test.afterAll(async () => {
  const n = await purgeSeed({ dates: [DATE, nextDate(DATE)] });
  const reset = await restoreRoutine(routineSnapshot);
  console.log(`[seed] purged ${n} goal items; routine ${reset ? 'reset' : 'left untouched'}`);
});

// ---------------------------------------------------------------------------
// 1. No flash, and everything is tappable on arrival
// ---------------------------------------------------------------------------

test('D1 a warm open paints real data immediately and every control is live', async ({ page }) => {
  // First open fills IndexedDB; the second is the one under test — that is what
  // a returning PWA user actually experiences.
  await openApp(page);
  await closeApp(page);

  const HOLD_MS = 4000;
  await page.route('**/graphql**', async (route) => {
    const body = route.request().postData() || '';
    if (/(^|["\s])mutation[\s({]/.test(body)) { await route.continue(); return; }
    let response;
    try {
      response = await route.fetch();
    } catch (e) { await route.continue().catch(() => {}); return; }
    await new Promise((r) => setTimeout(r, HOLD_MS));
    await route.fulfill({ response }).catch(() => {});
  });

  await gotoAuthed(page, '/home');
  await page.waitForFunction(() => !!window.__APOLLO_CLIENT__, { timeout: 20_000 });

  // Everything below happens INSIDE the hold window, so anything visible came
  // from the persisted cache rather than the network.
  const items = page.locator('[data-testid="goal-item"]');
  await expect(
    items.first(),
    'cached goals did not paint inside the hold window — a skeleton is covering them',
  ).toBeVisible({ timeout: HOLD_MS - 1500 });

  // The routine tick circle is the control R5 does not cover. It used to carry
  // `isRoutineBusy` and was dead for the whole refetch. Asserted unconditionally
  // — a missing button means the current-task card never painted from cache,
  // which is the flash this test exists to catch.
  const tickButton = page.locator('[data-testid="routine-tick-button"]').first();
  await expect(
    tickButton,
    'the current-task card did not paint from cache inside the hold window',
  ).toBeVisible({ timeout: 2000 });
  await expect(
    tickButton,
    'the routine tick button is disabled during load — a busy gate is back',
  ).toBeEnabled({ timeout: 2000 });

  const n = await items.count();
  expect(n, 'need seeded goal items on screen').toBeGreaterThan(0);
  for (let i = 0; i < n; i += 1) {
    const box = items.nth(i).locator('[data-testid="goal-checkbox"] input').first();
    if (!(await box.count())) continue;
    expect(await box.isDisabled(), `goal checkbox ${i} disabled during load`).toBe(false);
  }

  // A normal open must never show the rollover overlay.
  await expect(page.locator('[data-testid="preparing-new-day"]')).toHaveCount(0);

  await page.unroute('**/graphql**');
});

// ---------------------------------------------------------------------------
// 2. A tick that beats the API still lands
// ---------------------------------------------------------------------------

test('D2 a tick made before the queries settle survives every late response', async ({ page }) => {
  await openApp(page);
  await closeApp(page);

  const HOLD_MS = 5000;
  await page.route('**/graphql**', async (route) => {
    const body = route.request().postData() || '';
    if (/(^|["\s])mutation[\s({]/.test(body)) { await route.continue(); return; }
    let response;
    try {
      response = await route.fetch();
    } catch (e) { await route.continue().catch(() => {}); return; }
    await new Promise((r) => setTimeout(r, HOLD_MS));
    await route.fulfill({ response }).catch(() => {});
  });

  await gotoAuthed(page, '/home');
  await page.waitForFunction(() => !!window.__APOLLO_CLIENT__, { timeout: 20_000 });

  const items = page.locator('[data-testid="goal-item"]');
  await expect(items.first()).toBeVisible({ timeout: HOLD_MS - 1500 });

  // Tick two different goal items back to back, as fast as the driver allows,
  // while every read is still held. Both taps land in the window where the
  // pre-tap responses are already on the wire.
  const targets = [];
  const total = await items.count();
  for (let i = 0; i < total && targets.length < 2; i += 1) {
    const row = items.nth(i);
    if ((await row.getAttribute('data-goal-complete')) === 'false') {
      targets.push(await row.getAttribute('data-goal-id'));
      await row.locator('[data-testid="goal-checkbox"]').first().click();
    }
  }
  expect(targets.length, 'need two unchecked goal items to tap').toBe(2);

  // Wait out every held response, then let things settle.
  await page.waitForTimeout(HOLD_MS + 4000);

  const state = await page.evaluate((ids) => {
    const store = window.__APOLLO_CLIENT__.cache.extract();
    return ids.map((id) => {
      const e = store[`GoalItem:${id}`];
      return e ? !!e.isComplete : null;
    });
  }, targets);
  expect(state, 'a tap made during load was reverted by a response already in flight').toEqual([true, true]);

  await page.unroute('**/graphql**');

  // And the server agrees — it was a real save, not just a pinned local value.
  const onServer = await gql(
    'query G($date: String!) { optimizedDailyGoals(date: $date) { goalItems { id isComplete } } }',
    { date: DATE },
  );
  const byId = new Map(
    (onServer.optimizedDailyGoals || []).flatMap((g) => g.goalItems || []).map((g) => [g.id, !!g.isComplete]),
  );
  expect(targets.map((id) => byId.get(id))).toEqual([true, true]);
});

// ---------------------------------------------------------------------------
// 3 + 4. The day boundary
// ---------------------------------------------------------------------------

test('D3 crossing midnight shows "Preparing new day" and empties every cache', async ({ page }) => {
  const [dd, mm, yyyy] = DATE.split('-').map(Number);
  const tomorrow = nextDate(DATE);

  await page.clock.install({ time: new Date(yyyy, mm - 1, dd, 23, 59, 30) });
  await openApp(page);

  // Prove there IS something to throw away before the rollover.
  const before = await page.evaluate(() => Object.keys(window.__APOLLO_CLIENT__.cache.extract()).length);
  expect(before, 'cache should be populated before the rollover').toBeGreaterThan(1);
  await page.evaluate(() => localStorage.setItem('agent-status-by-day', JSON.stringify({ day: 'stale', statuses: {} })));

  // Cross midnight. The 30s timer fires inside this window.
  await page.clock.runFor(60_000);
  await page.waitForTimeout(4000);

  const after = await page.evaluate(() => ({
    token: localStorage.getItem('token'),
    agentBadges: localStorage.getItem('agent-status-by-day'),
    lastPrepared: localStorage.getItem('last-prepared-day'),
    routineKeys: Object.keys(window.__APOLLO_CLIENT__.cache.extract().ROOT_QUERY || {})
      .filter((k) => k.startsWith('routineDate')),
  }));

  expect(after.lastPrepared, 'the rollover did not run').toBe(tomorrow);
  expect(after.agentBadges, "yesterday's agent badges survived the rollover").toBeNull();
  // Clearing caches must never sign the user out.
  expect(after.token, 'the session was destroyed by the cache purge').toBeTruthy();
  expect(
    after.routineKeys.some((k) => k.includes(tomorrow)),
    `after midnight the dashboard should query routineDate for ${tomorrow}; got ${after.routineKeys}`,
  ).toBe(true);

  await purgeSeed({ dates: [tomorrow] });
});

test('D4 a rollover that happened while the app was suspended is caught on resume', async ({ page }) => {
  // The real-world case: the phone slept through midnight, so no interval ever
  // ran. Only a visibility/focus wakeup can notice, which is exactly what
  // regressed — the timer was the sole detector.
  const [dd, mm, yyyy] = DATE.split('-').map(Number);
  const tomorrow = nextDate(DATE);

  await page.clock.install({ time: new Date(yyyy, mm - 1, dd, 22, 0, 0) });
  await openApp(page);

  // Jump the wall clock across midnight WITHOUT running timers — this is what
  // a suspended PWA experiences. setSystemTime moves the clock; it does not
  // fire the pending setInterval the way runFor does.
  await page.clock.setSystemTime(new Date(yyyy, mm - 1, dd + 1, 7, 30, 0));
  await page.waitForTimeout(500);

  // Nothing should have noticed yet — no timer has run.
  const beforeResume = await page.evaluate(() => localStorage.getItem('last-prepared-day'));

  // Now the user picks the phone up.
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await page.waitForTimeout(5000);

  const afterResume = await page.evaluate(() => ({
    lastPrepared: localStorage.getItem('last-prepared-day'),
    routineKeys: Object.keys(window.__APOLLO_CLIENT__.cache.extract().ROOT_QUERY || {})
      .filter((k) => k.startsWith('routineDate')),
  }));

  expect(
    afterResume.lastPrepared,
    `resuming after midnight must roll the day over to ${tomorrow} `
    + `(was "${beforeResume}" before the resume event)`,
  ).toBe(tomorrow);
  expect(
    afterResume.routineKeys.some((k) => k.includes(tomorrow)),
    `the dashboard should be querying ${tomorrow} after resume; got ${afterResume.routineKeys}`,
  ).toBe(true);

  await purgeSeed({ dates: [tomorrow] });
});
