// Direct GraphQL helpers for seeding/teardown of test data. Bypasses
// the UI so e2e tests can set up known state without flake.

const { mintToken } = require('./auth');

const GRAPHQL_URL = process.env.PLAYWRIGHT_GRAPHQL_URL || 'http://localhost:3000/graphql';

async function gql(query, variables = {}) {
  const token = mintToken();
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GraphQL ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors && json.errors.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

function todayDate() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

async function addTestGoal(body, opts = {}) {
  const {
    period = 'day', date = todayDate(), tags = ['e2e-test'], taskRef,
  } = opts;
  const data = await gql(
    `mutation AddGoalItem(
      $body: String!, $period: String!, $date: String!, $tags: [String], $taskRef: String
    ) {
      addGoalItem(body: $body, period: $period, date: $date, tags: $tags, taskRef: $taskRef) {
        id body period date isComplete taskRef
      }
    }`,
    { body, period, date, tags, taskRef },
  );
  return data.addGoalItem;
}

/**
 * Returns the FIRST routine task ID for the user's routine on `date`.
 * Used by tests that need a real taskRef so seeded goals show up under
 * a current/upcoming task on the dashboard.
 */
async function firstRoutineTaskId(date = todayDate()) {
  const data = await gql(
    `query R($date: String!) {
      routineDate(date: $date) { id tasklist { id name time } }
    }`,
    { date },
  );
  const list = (data.routineDate && data.routineDate.tasklist) || [];
  if (!list.length) throw new Error('No routine tasks for ' + date);
  return list[0].id;
}

/**
 * Find the task ID corresponding to the dashboard's "current task" — the
 * task whose time bucket contains the current wall-clock minute. Mirrors
 * DashBoard.vue's currentTask computed.
 */
async function currentRoutineTaskId(date = todayDate()) {
  const data = await gql(
    `query R($date: String!) {
      routineDate(date: $date) { id tasklist { id name time } }
    }`,
    { date },
  );
  const list = (data.routineDate && data.routineDate.tasklist) || [];
  if (!list.length) throw new Error('No routine tasks for ' + date);

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  // tasklist is assumed time-ordered. Walk and find current bucket.
  for (let i = 0; i < list.length; i += 1) {
    const tMin = toMin(list[i].time);
    const nextMin = i + 1 < list.length ? toMin(list[i + 1].time) : 24 * 60;
    if (nowMin >= tMin && nowMin < nextMin) return list[i].id;
    // Before the very first task — pick the first.
    if (i === 0 && nowMin < tMin) return list[i].id;
  }
  return list[list.length - 1].id;
}

async function deleteTestGoal(id, { period = 'day', date = todayDate() } = {}) {
  try {
    await gql(
      `mutation DeleteGoalItem($id: ID!, $date: String!, $period: String!) {
        deleteGoalItem(id: $id, date: $date, period: $period) { id }
      }`,
      { id, date, period },
    );
  } catch (e) {
    // Best effort cleanup — don't fail the test on a teardown miss
    console.warn(`[e2e] deleteTestGoal(${id}) failed: ${e.message}`);
  }
}

async function purgeTestGoals() {
  // Pull the user's day goals; delete anything tagged e2e-test.
  const data = await gql(
    `query Today($date: String!) {
      optimizedDailyGoals(date: $date) {
        period date
        goalItems { id body tags }
      }
    }`,
    { date: todayDate() },
  );
  const groups = data.optimizedDailyGoals || [];
  const targets = [];
  for (const g of groups) {
    for (const item of g.goalItems || []) {
      if ((item.tags || []).includes('e2e-test')) {
        targets.push({ id: item.id, period: g.period, date: g.date });
      }
    }
  }
  await Promise.all(targets.map((t) => deleteTestGoal(t.id, t)));
  return targets.length;
}

module.exports = {
  gql,
  addTestGoal,
  deleteTestGoal,
  purgeTestGoals,
  todayDate,
  firstRoutineTaskId,
  currentRoutineTaskId,
};
