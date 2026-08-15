/* eslint-disable no-await-in-loop, no-console */
/**
 * cache-integrity.spec.js — the "intense" open/close cache soak.
 *
 * WHAT THIS IS FOR
 * ----------------
 * Every dashboard bug we chase is the same shape: the Apollo cache holds a
 * slice that disagrees with the server, the UI paints it for a moment, and the
 * next network response quietly heals it — so the bug is invisible to a
 * screenshot and only bites when the user closes the app while the bad slice is
 * on screen (cache-persist then writes it to IndexedDB, where it survives
 * forever).
 *
 * So this suite does not assert pixels. It:
 *   1. seeds a realistically stacked day (routine + week goal + day goals),
 *   2. opens the app, does ONE activity, closes it (which is what persists the
 *      cache), reopens it, and asserts the normalized store against the server
 *      — every cycle, with a different activity each time,
 *   3. travels the clock across the day and over midnight so the time-driven
 *      paths (currentTask, passed/wait, day rollover) run for real.
 *
 * The invariants live in helpers/cache.js and are checked after EVERY step, so
 * a failure names the exact activity that corrupted the store.
 *
 * NOTE ON THE CLOCK: page.clock only moves the *browser's* clock. The server
 * still stamps completedAt from its own wall clock, so tests that assert
 * server-computed status ('missed') say so explicitly rather than pretending
 * the whole system time-travelled.
 */

const { test, expect } = require('@playwright/test');
const { gotoAuthed } = require('./helpers/auth');
const { gql, todayDate } = require('./helpers/api');
const {
  seedStackedDay, purgeSeed, snapshotRoutine, restoreRoutine, SEED_TAG,
} = require('./helpers/seed');
const {
  extractCache, extractPersistedCache, serverGoalShape,
  checkInvariants, checkTicksSurvived,
} = require('./helpers/cache');

test.describe.configure({ mode: 'serial' });
test.setTimeout(240_000);

const DATE = todayDate();

/** Shared across the serial suite so each cycle builds on the last. */
let seeded = null;
/** Pre-run state of today's routine, so afterAll can reset it safely. */
let routineSnapshot = null;
/** id -> expected isComplete, accumulated as activities tick things. */
const expectedTicks = {};

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

/** Cold-open the app: fresh document, Apollo cache rehydrated from IndexedDB. */
async function openApp(page) {
  await gotoAuthed(page, '/home');
  await page.waitForFunction(() => !!window.__APOLLO_CLIENT__, { timeout: 20_000 });
  // Wait for the dashboard's own queries to have settled once, otherwise we
  // assert against a half-populated store and get noise instead of signal.
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

/**
 * Close the app the way a user does — unload the document. cache-persist's
 * debounced write has already run (trigger:'write', 1s debounce), so whatever
 * is in IndexedDB now is what the next open restores.
 */
async function closeApp(page) {
  await page.waitForTimeout(1400); // let the persist debounce flush
  await page.goto('about:blank');
  await page.waitForTimeout(200);
}

/** Assert the live store AND the persisted copy are both healthy. */
async function assertHealthy(page, step) {
  const expected = await serverGoalShape(DATE);
  const live = await extractCache(page);
  const violations = [
    ...checkInvariants(live, expected, `${step}/live`),
    ...checkTicksSurvived(live, expectedTicks, `${step}/live`),
  ];
  const persisted = await extractPersistedCache(page);
  if (persisted) violations.push(...checkInvariants(persisted, expected, `${step}/persisted`));
  expect(violations, `cache violations after "${step}":\n  ${violations.join('\n  ')}`).toEqual([]);
}

// ---------------------------------------------------------------------------
// Activities — one per cycle, each a different real user action
// ---------------------------------------------------------------------------

async function goalItems(page) {
  return page.locator('[data-testid="goal-item"]');
}

/**
 * Wait until a goal item's completion has reached the BASE cache layer — the
 * server confirmed it and Apollo dropped its optimistic layer.
 *
 * A fixed sleep cannot do this job. `cache.extract()` (what the invariants read)
 * deliberately excludes the optimistic layer, and the FIRST mutation against a
 * cold dev server measured 3158 ms round trip — mongoose connect plus first
 * query plan — where warm ones take ~240 ms. Polling the real condition removes
 * that flake without weakening anything: it is the same fact the invariant
 * asserts, so a genuine revert still fails here (on timeout) rather than being
 * slept through.
 */
async function waitForConfirmed(page, id, want, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await page.evaluate((gid) => {
      const c = window.__APOLLO_CLIENT__;
      const rec = c && c.cache.extract()[`GoalItem:${gid}`];
      return rec ? !!rec.isComplete : null;
    }, id);
    if (state === want) return true;
    await page.waitForTimeout(150);
  }
  console.warn(`[act] GoalItem:${id} never reached isComplete=${want} in ${timeoutMs}ms`);
  return false;
}

/** Tick the first unchecked goal item on the current-task card. */
async function actTickGoalItem(page) {
  const items = await goalItems(page);
  const n = await items.count();
  for (let i = 0; i < n; i += 1) {
    const row = items.nth(i);
    if ((await row.getAttribute('data-goal-complete')) === 'false') {
      const id = await row.getAttribute('data-goal-id');
      await row.locator('[data-testid="goal-checkbox"]').first().click();
      await waitForConfirmed(page, id, true);
      expectedTicks[id] = true;
      return `tick ${id}`;
    }
  }
  return 'tick (nothing unchecked)';
}

/** Untick the first checked goal item — the undo path writes a different shape. */
async function actUntickGoalItem(page) {
  const items = await goalItems(page);
  const n = await items.count();
  for (let i = 0; i < n; i += 1) {
    const row = items.nth(i);
    if ((await row.getAttribute('data-goal-complete')) === 'true') {
      const id = await row.getAttribute('data-goal-id');
      await row.locator('[data-testid="goal-checkbox"]').first().click();
      await waitForConfirmed(page, id, false);
      expectedTicks[id] = false;
      return `untick ${id}`;
    }
  }
  return 'untick (nothing checked)';
}

/** Switch the current-task card's goal period — this also opens the goal modal. */
async function actSwitchGoalPeriod(page, period) {
  const btn = page.locator(`button:has-text("${period.toUpperCase()}")`).first();
  if (await btn.count()) {
    await btn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    // Close the goal-creation dialog if it opened.
    const close = page.locator('.v-dialog--active button:has(i:text("close"))').first();
    if (await close.count()) await close.click().catch(() => {});
    await page.waitForTimeout(800);
  }
  return `goal period -> ${period}`;
}

/** Flip UPCOMING <-> PAST. */
async function actSwitchTabs(page) {
  for (const label of ['PAST', 'UPCOMING']) {
    const tab = page.locator(`.v-tabs__item:has-text("${label}"), [role="tab"]:has-text("${label}")`).first();
    if (await tab.count()) { await tab.click().catch(() => {}); await page.waitForTimeout(900); }
  }
  return 'switch UPCOMING/PAST';
}

/** Expand an upcoming task row so its goal items mount. */
async function actExpandUpcomingTask(page) {
  const row = page.locator('.v-list__tile__title, .task-name').filter({ hasText: /Start Work|Wind-down|Sleep Time/ }).first();
  if (await row.count()) { await row.click().catch(() => {}); await page.waitForTimeout(1200); }
  return 'expand upcoming task';
}

/** Jump to yesterday (agenda mode) and back to today. */
async function actDateHop(page) {
  const days = page.locator('.weekday-selector .day, [class*="weekday"] [class*="day"]');
  if (await days.count()) {
    await days.first().click().catch(() => {});
    await page.waitForTimeout(1500);
  }
  await gotoAuthed(page, '/home');
  await page.waitForTimeout(1500);
  return 'date hop';
}

/** Open + close the AI search modal (mounts a container with its own queries). */
async function actOpenAiSearch(page) {
  const fab = page.locator('[data-testid="ai-search-fab"]');
  if (await fab.count()) {
    await fab.click().catch(() => {});
    await page.waitForTimeout(1200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }
  return 'open/close AI search';
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
  // This suite runs against the REAL database, so record whether today's
  // routine is safe to reset afterwards before we touch anything. Ticking goal
  // items earns K/G stimuli on it and the clock walk marks tasks `passed` —
  // residue the account owner would otherwise see as a day they never lived.
  routineSnapshot = await snapshotRoutine(DATE);
  await purgeSeed({ dates: [DATE] });
  seeded = await seedStackedDay({ date: DATE, dayGoalsPerTask: 2 });
  console.log(
    `[seed] ${seeded.tasks.length} routine tasks, ${seeded.weekGoals.length} week goals, `
    + `${seeded.dayGoals.length} day goals on ${DATE}`
    + ` (routine resettable: ${routineSnapshot.resettable})`,
  );
});

test.afterAll(async () => {
  const n = await purgeSeed({ dates: [DATE] });
  const reset = await restoreRoutine(routineSnapshot);
  console.log(
    `[seed] purged ${n} seeded goal items; routine ${reset ? 'reset to a clean day' : 'left untouched (had real progress)'}`,
  );
});

// ---------------------------------------------------------------------------
// 1. The soak: N open/activity/close cycles, a different activity each time
// ---------------------------------------------------------------------------

test('soak: open -> one activity -> close -> reopen never corrupts the cache', async ({ page }) => {
  const activities = [
    (p) => actTickGoalItem(p),
    (p) => actSwitchTabs(p),
    (p) => actExpandUpcomingTask(p),
    (p) => actSwitchGoalPeriod(p, 'week'),
    (p) => actTickGoalItem(p),
    (p) => actSwitchGoalPeriod(p, 'month'),
    (p) => actUntickGoalItem(p),
    (p) => actOpenAiSearch(p),
    (p) => actTickGoalItem(p),
    (p) => actDateHop(p),
    (p) => actSwitchGoalPeriod(p, 'today'),
    (p) => actUntickGoalItem(p),
  ];

  for (let i = 0; i < activities.length; i += 1) {
    await openApp(page);
    await assertHealthy(page, `cycle ${i} open`);

    const what = await activities[i](page);
    await assertHealthy(page, `cycle ${i} after ${what}`);

    await closeApp(page);
    await openApp(page);
    await assertHealthy(page, `cycle ${i} reopen after ${what}`);
  }
});

// ---------------------------------------------------------------------------
// 2. Time simulation — walk the clock through the routine day
// ---------------------------------------------------------------------------

test('clock walk: every routine slot across the day keeps the cache honest', async ({ page }) => {
  // One stop inside each seeded routine slot, plus the gaps between them.
  const stops = ['05:30', '06:05', '06:20', '06:45', '09:05', '11:35', '18:00', '22:55', '23:05'];
  const [dd, mm, yyyy] = DATE.split('-').map(Number);

  // The clock can only be installed once per page; move it with setSystemTime.
  await page.clock.install({ time: new Date(yyyy, mm - 1, dd, 5, 0, 0) });

  for (const hhmm of stops) {
    const [h, m] = hhmm.split(':').map(Number);
    await page.clock.setSystemTime(new Date(yyyy, mm - 1, dd, h, m, 0));

    await openApp(page);
    await assertHealthy(page, `clock ${hhmm} open`);

    // At each stop, do the thing a user does at that hour: tick whatever the
    // current task is showing.
    const what = await actTickGoalItem(page);
    await assertHealthy(page, `clock ${hhmm} after ${what}`);

    // Let the 30s intelligent-refresh timer fire while we sit here — this is
    // the timer that fans out passRoutineItem/waitRoutineItem storms.
    await page.clock.runFor(35_000);
    await page.waitForTimeout(2000);
    await assertHealthy(page, `clock ${hhmm} after refresh timer`);

    await closeApp(page);
  }
});

// ---------------------------------------------------------------------------
// 3. Midnight rollover — the "new day" path, in-session
// ---------------------------------------------------------------------------

test('midnight rollover: a tick right after the day flips is not lost', async ({ page }) => {
  const [dd, mm, yyyy] = DATE.split('-').map(Number);
  await page.clock.install({ time: new Date(yyyy, mm - 1, dd, 23, 59, 30) });
  await openApp(page);

  // Cross midnight while the app is open. intelligentRefreshMixin's 30s tick
  // detects the day change, swaps `date`, and calls addNewDayRoutine().
  await page.clock.runFor(60_000);
  await page.waitForTimeout(3000);

  const state = await page.evaluate(() => {
    const c = window.__APOLLO_CLIENT__;
    const s = c.cache.extract();
    return {
      routineDateKeys: Object.keys(s.ROOT_QUERY || {}).filter((k) => k.startsWith('routineDate')),
      goalKeys: Object.keys(s.ROOT_QUERY || {}).filter((k) => k.startsWith('optimizedDailyGoals')),
    };
  });
  console.log('[rollover] cache query keys after midnight:', JSON.stringify(state));

  // The dashboard must be showing the NEW day, and its routine must exist.
  const tomorrow = (() => {
    const d = new Date(yyyy, mm - 1, dd + 1);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  })();
  expect(
    state.routineDateKeys.some((k) => k.includes(tomorrow)),
    `after midnight the dashboard should query routineDate for ${tomorrow}; got ${state.routineDateKeys}`,
  ).toBe(true);

  await purgeSeed({ dates: [tomorrow] });
});

// ---------------------------------------------------------------------------
// 4. Regression guards for the three reported symptoms
// ---------------------------------------------------------------------------

test('R1 new day: exactly one Routine document is created for a fresh date', async () => {
  // Reproduces the reported "first check goes green but is not saved".
  // A new-day open fires addRoutine (from the routineDate update() callback,
  // unguarded, so more than once) while a goal tick concurrently auto-creates
  // the routine through the NON-atomic findTodayandSort in resolvers/goal.js.
  // Two creation paths, one of them not an upsert => duplicate Routine docs for
  // one date. routineDate() then findOne()s an arbitrary one, so the tick can
  // land on the document the UI is not reading.
  const probeDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 400);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  })();

  const items = await gql('{ routineItems { id name } }');
  const taskRef = items.routineItems[0].id;
  const gi = await gql(
    `mutation A($date: String!, $taskRef: String!) {
      addGoalItem(body: "[${SEED_TAG}] newday probe", period: "day", date: $date,
                  taskRef: $taskRef, isComplete: false, isMilestone: false, tags: ["${SEED_TAG}"]) { id }
    }`,
    { date: probeDate, taskRef },
  );

  await Promise.all([
    gql('mutation A($date: String!){ addRoutine(date: $date){ id } }', { date: probeDate }),
    gql('mutation A($date: String!){ addRoutine(date: $date){ id } }', { date: probeDate }),
    gql('mutation A($date: String!){ addRoutine(date: $date){ id } }', { date: probeDate }),
    gql(
      `mutation C($id: ID!, $taskRef: String!, $date: String!) {
        completeGoalItem(id: $id, taskRef: $taskRef, date: $date, period: "day",
                         isComplete: true, isMilestone: false) { id isComplete }
      }`,
      { id: gi.addGoalItem.id, taskRef, date: probeDate },
    ),
  ]);

  // The tick must be visible through the same read path the dashboard uses.
  const after = await gql(
    `query R($date: String!) {
      routineDate(date: $date) { id tasklist { id stimuli { name earned } } }
    }`,
    { date: probeDate },
  );
  const task = after.routineDate.tasklist.find((t) => t.id === taskRef);
  const k = task.stimuli.find((s) => s.name === 'K');
  // Clean up before asserting so a failure doesn't leave the probe date behind.
  await purgeSeed({ dates: [probeDate] });
  await gql(
    'mutation D($id: ID!) { deleteRoutine(id: $id) { id } }',
    { id: after.routineDate.id },
  ).catch(() => {});

  expect(
    k.earned,
    'the K stimulus earned by the tick must be on the routine document routineDate() returns '
    + '(if it is 0, the tick landed on a duplicate document — the "went green, not saved" bug)',
  ).toBeGreaterThan(0);
});

test('R2 on-time tick is never recorded as missed', async () => {
  // Reported: "Routine should not have missed state if agent failed and ticked
  // on time." The server derived status from
  //   nextTime = tasklist[i+1].time  (else 23:59)
  //   completedAt > nextTime -> 'missed'
  // which broke in two ways:
  //   a) two routine tasks sharing a start time gave the earlier one a
  //      ZERO-minute window, so it graded 'missed' even ticked at its exact
  //      minute (this account has Wake Up and Morning movement both at 06:00);
  //   b) taskTime was parsed in the SERVER's timezone while completedAt is
  //      absolute, so any tz gap shifted the verdict.
  //
  // Sharing a start time is legitimate — the fix makes it harmless by closing
  // the window at the next DISTINCT time — so assert behaviour, not schedule.
  const routine = await gql(
    'query R($date: String!) { routineDate(date: $date) { id tasklist { id name time } } }',
    { date: DATE },
  );
  const list = routine.routineDate.tasklist;

  // (a) No task may have a zero-width window, per the server's own rule.
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const { windowEndMinutes } = require('../../server/src/utils/goalItemStatus');
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const zeroWidth = list
    .map((t, i) => ({ t, width: windowEndMinutes(list, i) - toMin(t.time) }))
    .filter((x) => x.width <= 0)
    .map((x) => `${x.t.time} ${x.t.name}`);
  expect(zeroWidth, 'every routine task must have a completion window wider than 0 minutes').toEqual([]);

  // (b) End-to-end: ticking the task whose window contains RIGHT NOW must be
  // graded 'done'. Uses the real resolver, the real clock and the real stored
  // user timezone — the three things the unit tests can only simulate.
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const activeIdx = list.findIndex(
    (t, i) => nowMin >= toMin(t.time) && nowMin < windowEndMinutes(list, i),
  );
  test.skip(activeIdx === -1, 'no routine task window contains the current time');

  const active = list[activeIdx];
  const goals = await gql(
    `query G($date: String!) {
      optimizedDailyGoals(date: $date) { period goalItems { id body taskRef isComplete } }
    }`,
    { date: DATE },
  );
  const dayGoal = (goals.optimizedDailyGoals || []).find((g) => g.period === 'day');
  const item = ((dayGoal && dayGoal.goalItems) || []).find((i) => i.taskRef === active.id);
  expect(item, `expected a seeded day goal on the active task "${active.name}"`).toBeTruthy();

  const res = await gql(
    `mutation C($id: ID!, $taskRef: String!, $date: String!) {
      completeGoalItem(id: $id, taskRef: $taskRef, date: $date, period: "day",
                       isComplete: true, isMilestone: false) { id isComplete status }
    }`,
    { id: item.id, taskRef: active.id, date: DATE },
  );

  // Put it back so the soak's expectations aren't disturbed.
  await gql(
    `mutation C($id: ID!, $taskRef: String!, $date: String!) {
      completeGoalItem(id: $id, taskRef: $taskRef, date: $date, period: "day",
                       isComplete: false, isMilestone: false) { id }
    }`,
    { id: item.id, taskRef: active.id, date: DATE },
  ).catch(() => {});

  expect(
    res.completeGoalItem.status,
    `ticking "${active.name}" (${active.time}) inside its own window must be "done", not "missed"`,
  ).toBe('done');
});

test('R3 a scoped goal query never returns a truncated copy of a shared Goal', async () => {
  // Reported: "switch past and upcoming goal items causes flicker or they dont
  // show until refresh".
  //
  // goalsByGoalRef returns the REAL Goal id with a goalItems array filtered
  // down to one goalRef. Apollo normalizes by id, so writing that response
  // REPLACES Goal:<id>.goalItems everywhere — optimizedDailyGoals and
  // agendaGoals instantly lose every sibling item. It heals on the next
  // refetch (the flicker) and sticks if the app is closed first (the
  // "doesn't show until refresh").
  //
  // This is a contract test on the server response, so it is deterministic:
  // no scoped query may return a Goal id carrying fewer items than the
  // canonical list for that Goal.
  const canonical = await serverGoalShape(DATE);

  const weekItem = seeded.weekGoals[0];
  const scoped = await gql(
    `query S($goalRef: String!) {
      goalsByGoalRef(goalRef: $goalRef) { id date period goalItems { id } }
    }`,
    { goalRef: weekItem.id },
  );

  const violations = [];
  (scoped.goalsByGoalRef || []).forEach((g) => {
    const key = `Goal:${g.id}`;
    const canon = canonical[key];
    if (!canon) return; // a Goal outside today's window — not shared with the dashboard
    if ((g.goalItems || []).length < canon.count) {
      violations.push(
        `goalsByGoalRef returned ${key} (${g.period}/${g.date}) with `
        + `${g.goalItems.length} goalItems, but the canonical Goal has ${canon.count}. `
        + 'Apollo normalizes by id, so this response truncates the shared entity. '
        + 'Scoped queries must return a distinct type/id (or the full goalItems list).',
      );
    }
  });

  expect(violations, violations.join('\n')).toEqual([]);
});

test('R4 completeSubTaskItem returns a normalizable parent GoalItem', async () => {
  // The field is typed GoalItem but used to return the SUB-TASK's shape
  // `{ _id, body, isComplete }`. Against GoalItemType that resolves to
  // `id: null`, `subTasks: null`, and an `isComplete` belonging to the
  // sub-task — so Apollo could not normalize the response at all, the tick
  // only survived via hand-written cache surgery, and the client's
  // "sync UI to server" branch wrote the PARENT's completion onto the
  // SUB-task.
  //
  // Contract: the response must carry the parent's own id, its own
  // isComplete, and the COMPLETE subTasks list with the toggle applied.
  const parent = await gql(
    `mutation A($date: String!, $taskRef: String!) {
      addGoalItem(body: "[${SEED_TAG}] R4 parent", period: "day", date: $date,
                  taskRef: $taskRef, isComplete: false, isMilestone: false,
                  tags: ["${SEED_TAG}"]) { id }
    }`,
    { date: DATE, taskRef: seeded.tasks[0].id },
  );
  const parentId = parent.addGoalItem.id;

  const subs = [];
  for (const body of [`[${SEED_TAG}] R4 sub A`, `[${SEED_TAG}] R4 sub B`]) {
    const s = await gql(
      `mutation S($taskId: ID!, $body: String!, $date: String!) {
        addSubTaskItem(taskId: $taskId, body: $body, period: "day", date: $date,
                       isComplete: false) { id }
      }`,
      { taskId: parentId, body, date: DATE },
    );
    subs.push(s.addSubTaskItem.id);
  }

  const res = await gql(
    `mutation C($id: ID!, $taskId: ID!, $date: String!) {
      completeSubTaskItem(id: $id, taskId: $taskId, date: $date, period: "day",
                          isComplete: true) {
        id isComplete subTasks { id isComplete }
      }
    }`,
    { id: subs[0], taskId: parentId, date: DATE },
  );
  const out = res.completeSubTaskItem;

  expect(out.id, 'response must carry the PARENT goal item id — a null id cannot be normalized').toBe(parentId);
  expect(
    (out.subTasks || []).length,
    'response must carry the COMPLETE subTasks list, not null and not just the toggled one',
  ).toBe(2);
  const toggled = (out.subTasks || []).find((s) => s.id === subs[0]);
  const untouched = (out.subTasks || []).find((s) => s.id === subs[1]);
  expect(toggled.isComplete, 'the toggled sub-task must come back complete').toBe(true);
  expect(!!untouched.isComplete, 'the untouched sub-task must be unchanged').toBe(false);
  expect(
    !!out.isComplete,
    "isComplete must be the PARENT's own completion, not the sub-task's",
  ).toBe(false);
});

// ---------------------------------------------------------------------------
// R5 — the load window is interactive, and a tap made inside it sticks.
//
// This is the guard that replaces the `busy` prop. The dashboard used to
// disable the tick circle and every goal-item checkbox for as long as a feeding
// query was loading, which closed the revert race by removing the interaction —
// and cost the user a tap on every single app-open, because the dashboard is at
// its most tappable exactly when it is also refetching.
//
// The pending-entity guard (src/utils/cacheGuard.js) closes the same race by
// making the RESPONSE yield instead. So there are two things to prove:
//   (a) nothing is disabled while the queries are in flight, and
//   (b) a tap landing in that window survives the responses that follow it.
// ---------------------------------------------------------------------------

test('R5 controls stay live during load and a tap inside that window survives', async ({ page }) => {
  // Hold every QUERY response on the wire for 4s while letting mutations
  // through immediately. The request itself is sent at once (route.fetch), so
  // the server computes its answer from PRE-tap state and then delivers it
  // AFTER the tick mutation has already resolved. That is the race, made
  // deterministic instead of hoped for:
  //
  //   t=0.0  goals/routine reads leave, held
  //   t=0.5  user taps -> mutation resolves, cache says complete
  //   t=4.0  the held reads land, carrying "not complete"
  // Warm the cache FIRST. Every Playwright test gets a fresh browser context,
  // so IndexedDB starts empty here — without this the dashboard has nothing to
  // paint from and is legitimately waiting on the network, which is not the
  // scenario under test. This is the user's *second* open.
  await openApp(page);
  await closeApp(page);

  const HOLD_MS = 4000;
  let intercepted = 0;
  await page.route('**/graphql**', async (route) => {
    const body = route.request().postData() || '';
    const isMutation = /(^|["\s])mutation[\s({]/.test(body);
    if (isMutation) {
      await route.continue();
      return;
    }
    intercepted += 1;
    let response;
    try {
      response = await route.fetch();
    } catch (e) {
      await route.continue().catch(() => {});
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
    await route.fulfill({ response }).catch(() => {});
  });

  // Deliberately do NOT use openApp() — it waits for the queries to settle,
  // which is the window we need to be inside. The dashboard paints from the
  // cache the warm-up open just persisted.
  await gotoAuthed(page, '/home');
  await page.waitForFunction(() => !!window.__APOLLO_CLIENT__, { timeout: 20_000 });

  // (a0) The goals must paint FROM CACHE, well before any held response lands.
  // Every query is held for HOLD_MS, so anything on screen inside that window
  // came from IndexedDB — not the network.
  //
  // This assertion is what makes the rest of the test meaningful. When
  // `showGoalsSkeleton` was `loading && firstLoad` (no `!hasData` clause), the
  // skeleton REPLACED the cached goal list for the whole round trip, so no
  // goal item existed to inspect and the checks below silently ran *after* the
  // load window instead of inside it. A timeout here means that regressed.
  const items = page.locator('[data-testid="goal-item"]');
  await expect(
    items.first(),
    'cached goals did not paint within the hold window — a skeleton is covering them',
  ).toBeVisible({ timeout: HOLD_MS - 1500 });
  expect(intercepted, 'no query was held — the route interception did not take').toBeGreaterThan(0);

  // (a) Nothing may be disabled. Under the old build every one of these
  // carried `disabled` for the duration of the refetch — first via the `busy`
  // prop, then via `passive` (which the goals skeleton drove).
  const n = await items.count();
  expect(n, 'need at least one seeded goal item on screen').toBeGreaterThan(0);

  let target = null;
  let targetId = null;
  for (let i = 0; i < n; i += 1) {
    const row = items.nth(i);
    const box = row.locator('[data-testid="goal-checkbox"] input').first();
    if (!(await box.count())) continue;
    const disabled = await box.isDisabled();
    expect(
      disabled,
      `goal-item checkbox ${i} is disabled during the load window — the busy gate is back`,
    ).toBe(false);
    if (target === null && (await row.getAttribute('data-goal-complete')) === 'false') {
      target = row;
      targetId = await row.getAttribute('data-goal-id');
    }
  }
  expect(target, 'need an unchecked goal item to tap').not.toBeNull();

  // (b) Tap while those reads are still held. The mutation is not held, so it
  // confirms first...
  await target.locator('[data-testid="goal-checkbox"]').first().click();
  expect(
    await waitForConfirmed(page, targetId, true),
    'the tick never reached the base cache layer at all',
  ).toBe(true);

  // ...and only then do the held reads land, every one of them carrying the
  // pre-tap state. This is the exact sequence that used to revert the tick.
  await page.waitForTimeout(HOLD_MS + 2500);

  const afterTap = await page.evaluate((id) => {
    const store = window.__APOLLO_CLIENT__.cache.extract();
    const entity = store[`GoalItem:${id}`];
    return entity ? entity.isComplete : null;
  }, targetId);
  expect(
    afterTap,
    'the tap was reverted by a response that was already on the wire when it happened',
  ).toBe(true);
  expectedTicks[targetId] = true;

  // Stop holding responses before the reopen below.
  await page.unroute('**/graphql**');

  // And it is really persisted, not just held in memory by the guard: the
  // server has it too.
  const onServer = await gql(
    `query G($date: String!) {
      optimizedDailyGoals(date: $date) { period goalItems { id isComplete } }
    }`,
    { date: DATE },
  );
  const found = (onServer.optimizedDailyGoals || [])
    .flatMap((g) => g.goalItems || [])
    .find((gi) => gi.id === targetId);
  expect(!!(found && found.isComplete), 'the tap never reached the server').toBe(true);

  await closeApp(page);
  await openApp(page);
  await assertHealthy(page, 'R5 reopen after tapping during load');
});
