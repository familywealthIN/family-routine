/* eslint-disable no-await-in-loop, no-console */
/**
 * seed.js — build a realistic, fully-stacked day for the cache e2e suite.
 *
 * The cache bugs only surface when the dashboard has the *shape* a real user
 * has: a routine document for the day, several routine tasks spread across the
 * clock, a week goal, and day goals hanging off that week goal under multiple
 * routine tasks. A single goal on a single task never reproduces them.
 *
 * Everything created here is tagged `e2e-cache` so `purgeSeed()` can remove it
 * without touching the user's real goals.
 */

const { gql, todayDate } = require('./api');

const SEED_TAG = 'e2e-cache';

/** DD-MM-YYYY for today + `offset` days. */
function dateOffset(offset = 0, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + offset);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

/**
 * The week-goal date the app uses for a given day date: the Friday of that
 * week (moment `.weekday(5)`, Sunday-start locale). Mirrors
 * packages/ui/utils/getDates.js `periodGoalDates('week', date)` so seeded week
 * goals land in the same bucket the dashboard reads.
 */
function weekGoalDate(dayDate = todayDate()) {
  const [dd, mm, yyyy] = dayDate.split('-').map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  // getDay(): 0=Sun..6=Sat. Friday === 5.
  d.setDate(d.getDate() + (5 - d.getDay()));
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

/** Ensure a Routine document exists for `date` (idempotent server-side upsert). */
async function ensureRoutine(date = todayDate()) {
  const data = await gql(
    `mutation AddRoutine($date: String!) {
      addRoutine(date: $date) {
        id date skip
        tasklist { id name time points ticked passed wait redeemed stimuli { name splitRate earned } }
      }
    }`,
    { date },
  );
  return data.addRoutine;
}

async function getRoutine(date = todayDate()) {
  const data = await gql(
    `query R($date: String!) {
      routineDate(date: $date) {
        id date skip
        tasklist { id name time points ticked passed wait redeemed stimuli { name splitRate earned } }
      }
    }`,
    { date },
  );
  return data.routineDate;
}

async function addGoalItem({
  body, period, date, taskRef = null, goalRef = null, isMilestone = false, tags = [],
}) {
  const data = await gql(
    `mutation A(
      $body: String!, $period: String!, $date: String!,
      $taskRef: String, $goalRef: String, $isMilestone: Boolean, $tags: [String]
    ) {
      addGoalItem(
        body: $body, period: $period, date: $date,
        taskRef: $taskRef, goalRef: $goalRef, isMilestone: $isMilestone,
        isComplete: false, tags: $tags
      ) { id body period date isComplete taskRef goalRef isMilestone }
    }`,
    {
      body, period, date, taskRef, goalRef, isMilestone, tags: [...tags, SEED_TAG],
    },
  );
  return data.addGoalItem;
}

/**
 * Stack the account for `date`:
 *   - a Routine document for the day (all routine templates, time-sorted)
 *   - one week goal item per routine task (milestones)
 *   - two day goal items per routine task, each pointing at its week goal
 *
 * Returns { routine, weekDate, weekGoals[], dayGoals[] } so specs can assert
 * against known ids instead of scraping the DOM for "whatever is there".
 */
async function seedStackedDay({ date = todayDate(), dayGoalsPerTask = 2 } = {}) {
  const routine = await ensureRoutine(date);
  if (!routine || !routine.tasklist || !routine.tasklist.length) {
    throw new Error(`[seed] no routine tasklist for ${date} — add routine items first`);
  }

  const weekDate = weekGoalDate(date);
  const tasks = routine.tasklist;

  const weekGoals = [];
  const dayGoals = [];

  for (const task of tasks) {
    const week = await addGoalItem({
      body: `[${SEED_TAG}] Week: ${task.name}`,
      period: 'week',
      date: weekDate,
      taskRef: task.id,
      isMilestone: true,
    });
    weekGoals.push({ ...week, taskName: task.name, taskTime: task.time });

    for (let i = 0; i < dayGoalsPerTask; i += 1) {
      const day = await addGoalItem({
        body: `[${SEED_TAG}] ${task.name} — step ${i + 1}`,
        period: 'day',
        date,
        taskRef: task.id,
        goalRef: week.id,
        isMilestone: true,
      });
      dayGoals.push({
        ...day, taskName: task.name, taskTime: task.time, taskRef: task.id,
      });
    }
  }

  return {
    routine, date, weekDate, tasks, weekGoals, dayGoals,
  };
}

/**
 * Total stimulus points earned across a routine — the signal for "did a real
 * person make progress on this day?".
 */
function routineEarned(routine) {
  return ((routine && routine.tasklist) || []).reduce(
    (sum, t) => sum + ((t.stimuli || []).reduce((a, s) => a + (s.earned || 0), 0)),
    0,
  );
}

/**
 * Record whether `date`'s routine is safe to reset afterwards.
 *
 * This suite runs against the real database, and ticking goal items earns K/G
 * stimuli on the routine while the clock-walk marks tasks `passed` — residue a
 * user would see as a day they never lived. `restoreRoutine` undoes it, but
 * only when this snapshot proves there was nothing real there to begin with.
 */
async function snapshotRoutine(date = todayDate()) {
  const routine = await getRoutine(date);
  return {
    date,
    existed: !!routine,
    earned: routineEarned(routine),
    // Safe to delete afterwards only if the day started with no progress.
    resettable: !routine || routineEarned(routine) === 0,
  };
}

/**
 * Undo the suite's effect on the routine document.
 *
 * Deleting is the reset: `addRoutine` rebuilds the day from the routine-item
 * templates with earned:0, which is exactly the state a resettable day was in.
 * Refuses to touch a routine that already held earned points.
 */
async function restoreRoutine(snapshot) {
  if (!snapshot || !snapshot.resettable) return false;
  const routine = await getRoutine(snapshot.date);
  if (!routine) return false;
  await gql(
    'mutation D($id: ID!) { deleteRoutine(id: $id) { id } }',
    { id: routine.id },
  );
  // If the day genuinely had a routine before we started, put a clean one back.
  if (snapshot.existed) await ensureRoutine(snapshot.date);
  return true;
}

/** Delete every goal item tagged `e2e-cache` across the given dates. */
async function purgeSeed({ dates = [todayDate()], periods = ['day', 'week', 'month', 'year'] } = {}) {
  let removed = 0;
  for (const date of dates) {
    const data = await gql(
      `query G($date: String!) {
        optimizedDailyGoals(date: $date) { id date period goalItems { id body tags } }
      }`,
      { date },
    );
    const groups = (data && data.optimizedDailyGoals) || [];
    for (const g of groups) {
      if (!periods.includes(g.period)) continue;
      for (const item of g.goalItems || []) {
        const tags = item.tags || [];
        const tagged = tags.includes(SEED_TAG) || (item.body || '').includes(`[${SEED_TAG}]`);
        if (!tagged) continue;
        try {
          await gql(
            `mutation D($id: ID!, $date: String!, $period: String!) {
              deleteGoalItem(id: $id, date: $date, period: $period) { id }
            }`,
            { id: item.id, date: g.date, period: g.period },
          );
          removed += 1;
        } catch (e) {
          console.warn(`[seed] purge failed for ${item.id}: ${e.message}`);
        }
      }
    }
  }
  return removed;
}

module.exports = {
  SEED_TAG,
  dateOffset,
  weekGoalDate,
  ensureRoutine,
  getRoutine,
  addGoalItem,
  seedStackedDay,
  purgeSeed,
  snapshotRoutine,
  restoreRoutine,
};
