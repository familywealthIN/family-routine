/**
 * Demo data seed for grvpanchalus@gmail.com.
 *
 * In dev mode the server (`apps/server`) defaults the authenticated email to
 * grvpanchalus@gmail.com (see apps/server/src/utils/getEmailfromSession.js),
 * so this script can hit /graphql with no auth header.
 *
 * Run:
 *   yarn workspace web seed
 *   # or
 *   node apps/web/scripts/seed-demo.mjs --endpoint http://localhost:3000/graphql
 *
 * Idempotency: this script will only ADD new routines/goals — it does NOT
 * delete existing items. Re-running creates duplicates. If you need a clean
 * slate, drop the relevant collections in Mongo first.
 */

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((a) => a.replace(/^--/, '').split('='))
    .map(([k, v]) => [k, v ?? true])
);

const ENDPOINT = args.endpoint || 'http://localhost:3000/graphql';
const TOKEN = args.token || process.env.ROUTINE_NOTES_TOKEN || '';

async function gql(query, variables = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors, null, 2));
  return json.data;
}

// ---------- Routines (5 daily agents) ----------
const routines = [
  {
    name: 'Morning movement',
    description: 'Stretch, run, mobility — wake the body up before the inbox opens.',
    time: '06:00',
    points: 25,
    tags: ['area:health'],
    steps: [
      { name: 'Stretch — 5 min' },
      { name: '20-min run' },
      { name: 'Mobility / cooldown' },
    ],
  },
  {
    name: 'Deep work block',
    description: 'Single-tasked, deep work on the most important shipping milestone.',
    time: '09:00',
    points: 30,
    tags: ['area:work', 'project:routine-notes'],
    steps: [
      { name: 'Inbox triage — 15 min' },
      { name: "Ship today's milestone" },
      { name: 'Code review' },
    ],
  },
  {
    name: 'Reading & reset',
    description: 'Read, walk, lunch. Recharge before the afternoon push.',
    time: '12:30',
    points: 15,
    tags: ['area:mind'],
    steps: [
      { name: '30-min reading' },
      { name: 'Walk + lunch' },
    ],
  },
  {
    name: 'Build session',
    description: 'Open the IDE, push the next piece of Routine Notes.',
    time: '16:00',
    points: 25,
    tags: ['area:work', 'project:routine-notes'],
    steps: [
      { name: 'Open IDE' },
      { name: 'Pick next milestone' },
      { name: 'Ship one PR' },
      { name: 'Update changelog' },
    ],
  },
  {
    name: 'Wind-down',
    description: 'Journal, plan tomorrow, lights out by 10:30.',
    time: '21:00',
    points: 5,
    tags: ['area:mind'],
    steps: [
      { name: 'Journal — 5 min' },
      { name: 'Plan tomorrow' },
      { name: 'Lights out' },
    ],
  },
];

const ADD_ROUTINE = `
  mutation AddRoutineItem(
    $name: String!,
    $description: String!,
    $time: String!,
    $points: Int!,
    $tags: [String],
    $steps: [StepInputItem]
  ) {
    addRoutineItem(
      name: $name,
      description: $description,
      time: $time,
      points: $points,
      tags: $tags,
      steps: $steps
    ) { id name time points }
  }
`;

async function seedRoutines() {
  console.log('\n→ Seeding 5 daily routines...');
  for (const r of routines) {
    try {
      const data = await gql(ADD_ROUTINE, r);
      console.log(`  ✓ ${r.time} · ${r.name}  (id ${data.addRoutineItem.id})`);
    } catch (e) {
      console.error(`  ✗ ${r.name}: ${e.message}`);
    }
  }
}

// ---------- Goals (year → month → week → day cascade) ----------
// Date format expected by the server is DD-MM-YYYY (see goal.js usage of
// moment(date, 'DD-MM-YYYY')).
function fmt(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

function endOfYear(d) { return new Date(d.getFullYear(), 11, 31); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function endOfWeekFriday(d) {
  const r = new Date(d);
  const day = r.getDay(); // 0 sun .. 6 sat
  const diff = (5 - day + 7) % 7; // upcoming Friday (incl. today if Fri)
  r.setDate(r.getDate() + diff);
  return r;
}

const today = new Date();
const yearDate = fmt(endOfYear(today));
const monthDate = fmt(endOfMonth(today));
const weekDate = fmt(endOfWeekFriday(today));
const dayDate = fmt(today);

const ADD_GOAL = `
  mutation AddGoalItem(
    $date: String!,
    $period: String!,
    $body: String,
    $isComplete: Boolean,
    $isMilestone: Boolean,
    $tags: [String]
  ) {
    addGoalItem(
      date: $date,
      period: $period,
      body: $body,
      isComplete: $isComplete,
      isMilestone: $isMilestone,
      tags: $tags
    ) { id body period date }
  }
`;

const goals = [
  { period: 'year', date: yearDate, body: 'Ship Routine Notes 1.0 to the App Store', isMilestone: true },
  { period: 'month', date: monthDate, body: 'Public marketing site launch', isMilestone: true },
  { period: 'month', date: monthDate, body: 'Stripe billing live', isMilestone: true },
  { period: 'month', date: monthDate, body: 'Beta feedback round', isMilestone: true },
  { period: 'week', date: weekDate, body: 'Ship marketing site rebuild', isMilestone: true },
  { period: 'day', date: dayDate, body: 'Lock design system', isComplete: true, isMilestone: true },
  { period: 'day', date: dayDate, body: 'Capture demo screenshots', isComplete: true, isMilestone: true },
  { period: 'day', date: dayDate, body: 'Deploy to Netlify', isMilestone: true },
];

async function seedGoals() {
  console.log('\n→ Seeding goal cascade (year → month → week → day)...');
  for (const g of goals) {
    try {
      await gql(ADD_GOAL, { tags: [], ...g });
      console.log(`  ✓ ${g.period.toUpperCase().padEnd(5)} ${g.date}  ${g.body}`);
    } catch (e) {
      console.error(`  ✗ ${g.body}: ${e.message}`);
    }
  }
}

// ---------- Main ----------
(async () => {
  console.log(`Routine Notes — demo seed`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Today:    ${dayDate}`);

  // Smoke check that the endpoint is reachable
  try {
    await gql('{ __typename }');
  } catch (e) {
    console.error(`\nCould not reach GraphQL at ${ENDPOINT}.`);
    console.error('Start apps/server first:  yarn workspace server dev');
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }

  await seedRoutines();
  await seedGoals();

  console.log('\n✓ Seed complete.');
  console.log('  Now open http://localhost:8080/home (web-app dev server) to verify visually.');
})();
