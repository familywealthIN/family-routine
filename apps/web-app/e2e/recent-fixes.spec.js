// E2E coverage for the recent prompt / mode-toggle / horizon-dialog
// fixes. Each test is independent — opens a fresh dashboard authed,
// drives the AI search modal, asserts a single behaviour.

const { test, expect } = require('@playwright/test');
const { gotoAuthed } = require('./helpers/auth');
const { gql, todayDate } = require('./helpers/api');

test.describe.configure({ mode: 'serial' });

async function openModal(page) {
  await gotoAuthed(page, '/home');
  // The Dashboard FAB; data-testid added for stable e2e selectors.
  await page.locator('[data-testid="ai-search-fab"]').click();
  // Wait for the modal to mount and expose its test handle.
  await page.waitForFunction(() => !!window.__AI_SEARCH_MODAL__, { timeout: 5000 });
}

async function readModalState(page) {
  return page.evaluate(() => ({
    period: window.__AI_SEARCH_MODAL__.period,
    date: window.__AI_SEARCH_MODAL__.date,
    isTaskMode: window.__AI_SEARCH_MODAL__.isTaskMode,
    horizonOpen: window.__AI_SEARCH_MODAL__.horizonOpen,
    horizonInfo: JSON.parse(JSON.stringify(window.__AI_SEARCH_MODAL__.horizonInfo || null)),
    searchQuery: window.__AI_SEARCH_MODAL__.searchQuery,
  }));
}

// ---------------------------------------------------------------------
// AC8 — Goal mode → Task mode resets toolbarDate to today, period to day.
// ---------------------------------------------------------------------
test('AC8: switching goal → task resets the toolbar date to today', async ({ page }) => {
  await openModal(page);

  // Default state: task mode, period=day, date=today.
  let state = await readModalState(page);
  expect(state.isTaskMode).toBe(true);
  expect(state.period).toBe('day');
  expect(state.date).toBe(todayDate());

  // Switch to goal mode and pick a non-day period (the auto-detect from
  // typing "year" sets toolbarPeriod=year and date= empty/future).
  await page.locator('.mode-btn--goal').click();
  // Type a query whose keyword auto-promotes the period to 'year'.
  await page.locator('.prompt-box textarea').fill('Learn TypeScript this year');
  await page.waitForFunction(
    () => window.__AI_SEARCH_MODAL__.period === 'year',
    { timeout: 3000 },
  );
  state = await readModalState(page);
  expect(state.isTaskMode).toBe(false);
  expect(state.period).toBe('year');

  // Switch back to task mode — date and period must reset to today/day.
  await page.locator('.mode-btn--task').click();
  await page.waitForFunction(
    () => window.__AI_SEARCH_MODAL__.isTaskMode === true,
    { timeout: 3000 },
  );
  state = await readModalState(page);
  expect(state.isTaskMode).toBe(true);
  expect(state.period).toBe('day');
  expect(state.date).toBe(todayDate());
});

// ---------------------------------------------------------------------
// AC9 — Horizon dialog opens before submit when the selected period
//       has fewer sub-periods left than the productivity threshold.
//
// Today is 2026-05-01 (Friday). moment().day() = 5 → 7-5 = 2 days left
// in the week. 2 < 5 (the weekDays threshold) → dialog must appear.
// We freeze the date to keep this stable across calendars.
// ---------------------------------------------------------------------
test('AC9: horizon dialog appears for week period below threshold', async ({ page }) => {
  // Pin to a Friday so daysLeftInWeek = 2 < 5 (threshold).
  await page.clock.install({ time: new Date('2026-05-01T12:00:00Z') });
  await openModal(page);

  await page.locator('.mode-btn--goal').click();
  await page.locator('.prompt-box textarea').fill('Learn TypeScript this week');

  // Wait for toolbarPeriod to flip to 'week' via the searchQuery watcher.
  await page.waitForFunction(
    () => window.__AI_SEARCH_MODAL__.period === 'week',
    { timeout: 3000 },
  );

  // Hit the send button — should open the horizon dialog instead of
  // submitting straight through to the form.
  await page.locator('.prompt-send-btn').click();
  await page.waitForFunction(
    () => window.__AI_SEARCH_MODAL__.horizonOpen === true,
    { timeout: 3000 },
  );

  const state = await readModalState(page);
  expect(state.horizonOpen).toBe(true);
  expect(state.horizonInfo.period).toBe('week');
  expect(state.horizonInfo.belowThreshold).toBe(true);
  // Friday → 2 days left.
  expect(state.horizonInfo.remaining).toBe(2);

  // Visible dialog text should mention "Only 2 days left this week".
  await expect(page.locator('.horizon-title')).toContainText('Only 2 days left this week');
});

// ---------------------------------------------------------------------
// AC10 — "Plan for next" splices "next week" into the search query and
//        resumes the submit flow (dialog closes, hasSubmitted=true).
// ---------------------------------------------------------------------
test('AC10: choosing "Plan for next week" rewrites query and continues', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-05-01T12:00:00Z') });
  await openModal(page);

  await page.locator('.mode-btn--goal').click();
  await page.locator('.prompt-box textarea').fill('Learn TypeScript this week');
  await page.waitForFunction(
    () => window.__AI_SEARCH_MODAL__.period === 'week',
    { timeout: 3000 },
  );
  await page.locator('.prompt-send-btn').click();
  await page.waitForFunction(
    () => window.__AI_SEARCH_MODAL__.horizonOpen === true,
    { timeout: 3000 },
  );

  // Click the primary "Plan for next week" button.
  await page.locator('button:has-text("Plan for next week")').click();

  // Dialog should close and the searchQuery should now contain "next week".
  await page.waitForFunction(
    () => window.__AI_SEARCH_MODAL__.horizonOpen === false,
    { timeout: 3000 },
  );
  const state = await readModalState(page);
  expect(state.horizonOpen).toBe(false);
  expect(state.searchQuery.toLowerCase()).toContain('next week');
});

// ---------------------------------------------------------------------
// AC11 — Server prompt fix: an explicit "8 months" hint produces an
// 8-entry milestone plan (no overshoot into next year). This is a
// pure-server check via the GraphQL endpoint, not the modal.
// ---------------------------------------------------------------------
test('AC11: server respects explicit month count for year goals', async ({ page: _p }) => {
  const data = await gql(
    `mutation Plan($q: String!) {
      generateMilestonePlan(query: $q) {
        period
        entries { period date title }
      }
    }`,
    { q: 'Learn TypeScript 8 months' },
  );
  const plan = data.generateMilestonePlan;
  expect(plan.period).toBe('year');
  expect(plan.entries).toHaveLength(8);
  // Every entry must be a 'month' under a year plan.
  for (const e of plan.entries) {
    expect(e.period).toBe('month');
  }
});
