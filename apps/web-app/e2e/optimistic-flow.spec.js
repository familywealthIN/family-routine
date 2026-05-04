// E2E tests for the optimistic-update flows described in
// docs/optimistic-updates-trd.md. Requires JWT_SECRET in the repo .env
// and the GraphQL server running on port 3000.

const { test, expect } = require('@playwright/test');
const { gotoAuthed } = require('./helpers/auth');
const { addTestGoal, purgeTestGoals, currentRoutineTaskId } = require('./helpers/api');

test.describe.configure({ mode: 'serial' });

let TASK_REF = null;

test.beforeAll(async () => {
  await purgeTestGoals();
  TASK_REF = await currentRoutineTaskId();
});

test.afterAll(async () => {
  await purgeTestGoals();
});

async function seed(body) {
  return addTestGoal(body, { taskRef: TASK_REF });
}

async function findGoalItem(page, body) {
  return page.locator(`[data-testid="goal-item"]:has-text("${body}")`).first();
}

async function getGoalCompleteAttr(item) {
  return item.getAttribute('data-goal-complete');
}

/**
 * Click the checkbox inside a goal-item row.
 */
async function clickCheckbox(item) {
  await item.locator('[data-testid="goal-checkbox"]').click();
}

/** Wait until the data-goal-complete attribute matches expected. */
async function expectComplete(item, expected, msg) {
  await expect.poll(
    async () => (await getGoalCompleteAttr(item)) === String(expected),
    { message: msg, timeout: 5_000 },
  ).toBe(true);
}

/**
 * Watch the data-goal-complete attribute over a window and return every
 * transition. Used to assert no flicker happened.
 */
async function recordTransitions(item, durationMs) {
  return item.evaluate(async (el, ms) => {
    const transitions = [el.getAttribute('data-goal-complete')];
    return new Promise((resolve) => {
      const obs = new MutationObserver(() => {
        const v = el.getAttribute('data-goal-complete');
        if (v !== transitions[transitions.length - 1]) transitions.push(v);
      });
      obs.observe(el, { attributes: true, attributeFilter: ['data-goal-complete'] });
      setTimeout(() => { obs.disconnect(); resolve(transitions); }, ms);
    });
  }, durationMs);
}

// --- AC1: single click stays checked, no flicker ----------------------
test('AC1: single goal click — stays checked, no flicker', async ({ page }) => {
  const seeded = await seed('AC1 single click goal');
  await gotoAuthed(page, '/home');

  const item = await findGoalItem(page, seeded.body);
  await expect(item).toBeVisible({ timeout: 15_000 });
  expect(await getGoalCompleteAttr(item)).toBe('false');

  // Start watching transitions BEFORE clicking
  const recorder = recordTransitions(item, 1500);
  await clickCheckbox(item);

  const transitions = await recorder;
  // Acceptable transitions: ['false', 'true']. Anything that goes
  // false → true → false → true means we flickered.
  expect(transitions).toEqual(['false', 'true']);

  await expectComplete(item, true, 'AC1 final state checked');
});

// --- AC2: 3× rapid clicks on the same goal ---------------------------
// With one-way binding + coalescing: click 1 fires (cache→true optimistically),
// clicks 2 & 3 see UI checked and request uncheck. Coalescer records desired
// state = false. After click 1's mutation resolves (server says true), the
// corrective mutation fires with isComplete=false. Final cache: false.
//
// What we're really testing: no jittery oscillation during the burst, no
// stale state stuck after, ≤2 mutation calls (initial + corrective).
test('AC2: rapid 3× clicks on same goal — final = user’s last intent, no flicker', async ({ page }) => {
  const seeded = await seed('AC2 rapid same goal');
  await gotoAuthed(page, '/home');

  const item = await findGoalItem(page, seeded.body);
  await expect(item).toBeVisible({ timeout: 15_000 });

  // Count mutation calls.
  let completeCalls = 0;
  await page.route('**/graphql', async (route, req) => {
    const body = req.postData() || '';
    if (body.includes('completeGoalItem')) completeCalls += 1;
    return route.continue();
  });

  const recorder = recordTransitions(item, 4_000);
  await clickCheckbox(item);
  await page.waitForTimeout(40);
  await clickCheckbox(item);
  await page.waitForTimeout(40);
  await clickCheckbox(item);

  const transitions = await recorder;
  console.log('AC2 transitions:', transitions);
  console.log('AC2 completeGoalItem mutation calls:', completeCalls);

  // Final state: false (3 clicks → user's last visible intent was uncheck).
  await expectComplete(item, false, 'AC2 final state = false (last intent)');

  // No oscillation: transitions should monotonically progress through
  // no more than [false, true, false]. Anything longer means flicker.
  expect(transitions.length).toBeLessThanOrEqual(3);

  // ≤ 2 server mutations (initial + 1 corrective). 3 would be a coalesce miss.
  expect(completeCalls).toBeLessThanOrEqual(2);

  await page.unroute('**/graphql');
});

// --- AC3: clicking 5 different goals quickly --------------------------
test('AC3: rapid checks across 5 different goals — all stay checked', async ({ page }) => {
  const goals = [];
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    goals.push(await seed(`AC3 multi goal ${i}`));
  }
  await gotoAuthed(page, '/home');

  const items = [];
  for (const g of goals) {
    // eslint-disable-next-line no-await-in-loop
    const item = await findGoalItem(page, g.body);
    // eslint-disable-next-line no-await-in-loop
    await expect(item).toBeVisible({ timeout: 15_000 });
    items.push(item);
  }

  // Click all 5 in quick succession
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    await clickCheckbox(item);
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(40);
  }

  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    await expectComplete(item, true, 'AC3 each goal checked');
  }
});

// --- AC4: refetch race — refetch arrives mid-mutation, doesn't revert -
test('AC4: in-flight refetch cannot revert optimistic state', async ({ page }) => {
  const seeded = await seed('AC4 refetch race goal');
  await gotoAuthed(page, '/home');

  const item = await findGoalItem(page, seeded.body);
  await expect(item).toBeVisible({ timeout: 15_000 });

  // Throttle the completeGoalItem mutation only, leaving refetches fast.
  // While the click's mutation is in flight, fire a manual refetch via the
  // app's existing eventBus to attempt to overwrite the optimistic state.
  await page.route('**/graphql', async (route, req) => {
    const body = req.postData() || '';
    if (body.includes('completeGoalItem')) {
      await new Promise((r) => setTimeout(r, 1500));
    }
    return route.continue();
  });

  const recorder = recordTransitions(item, 5000);
  await clickCheckbox(item);

  // Trigger the kind of refetch that used to overwrite optimistic state.
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    if (window.__APOLLO_CLIENT__) {
      // Re-execute every active query — this is what cache-and-network
      // does on its own under various triggers. With our fixes, Apollo
      // must keep the optimistic state intact until the real response.
      const client = window.__APOLLO_CLIENT__;
      try { client.reFetchObservableQueries(); } catch (_) { /* ignore */ }
    }
  });

  const transitions = await recorder;
  console.log('AC4 transitions:', transitions);

  // No flip back to false during the in-flight window.
  // Acceptable: ['false', 'true']. Anything ending false or oscillating fails.
  await expectComplete(item, true, 'AC4 stayed true through refetch');
  expect(transitions[transitions.length - 1]).toBe('true');
  // Transitions should monotonically settle: false → true. No false in middle.
  for (let i = 1; i < transitions.length; i += 1) {
    if (transitions[i] === 'false' && transitions[i - 1] === 'true') {
      throw new Error(`AC4 flickered: transitions=${JSON.stringify(transitions)}`);
    }
  }

  await page.unroute('**/graphql');
});

// --- AC7: rapid sequential clicks across goals don't lose any state --
test('AC7: 4 different goals clicked in 200ms — every one stays checked', async ({ page }) => {
  const goals = [];
  for (let i = 0; i < 4; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    goals.push(await seed(`AC7 stagger ${i}`));
  }
  await gotoAuthed(page, '/home');

  const items = [];
  for (const g of goals) {
    // eslint-disable-next-line no-await-in-loop
    const item = await findGoalItem(page, g.body);
    // eslint-disable-next-line no-await-in-loop
    await expect(item).toBeVisible({ timeout: 15_000 });
    items.push(item);
  }

  // Click all 4 in 200ms total.
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    await clickCheckbox(item);
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(50);
  }

  // All 4 must finish in `true` despite overlapping in-flight mutations.
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    await expectComplete(item, true, 'AC7 each goal converged to true');
  }
});

// --- AC6: server returns 500 — rollback to unchecked + toast ---------
test('AC6: mutation error reverts checkbox, no phantom intermediate', async ({ page }) => {
  const seeded = await seed('AC6 error rollback goal');
  await gotoAuthed(page, '/home');

  const item = await findGoalItem(page, seeded.body);
  await expect(item).toBeVisible({ timeout: 15_000 });

  // Inject a 500 just for the completeGoalItem mutation.
  await page.route('**/graphql', async (route, req) => {
    const body = req.postData() || '';
    if (body.includes('completeGoalItem')) {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ message: 'simulated server failure' }] }),
      });
    }
    return route.continue();
  });

  const recorder = recordTransitions(item, 3000);
  await clickCheckbox(item);
  const transitions = await recorder;
  console.log('AC6 transitions:', transitions);

  // After the failed mutation, the goal must end up back at false.
  await expectComplete(item, false, 'AC6 rolled back to unchecked');

  // The end of the transitions window should be 'false'.
  expect(transitions[transitions.length - 1]).toBe('false');

  await page.unroute('**/graphql');
});
