const getGoalMilestone = require('./getGoalMilestone');

const DB_OBJ = [
  {
    id: 'a',
    date: '10-07-2020',
    period: 'day',
    goalItems: [
      {
        id: 'p',
        isMilestone: true,
        body: 'day task',
        goalRef: 'q',
      },
      {
        id: 'p1',
        isMilestone: false,
        body: 'Non Milestone Day task',
        goalRef: '',
      },
    ],
  },
  {
    id: 'x',
    date: '11-07-2020',
    period: 'day',
    goalItems: [
      {
        id: 'xx',
        isMilestone: true,
        body: 'day task',
        goalRef: 'q',
      },
      {
        id: 'xx1',
        isMilestone: false,
        body: 'Non Milestone Day task',
        goalRef: '',
      },
    ],
  },
  {
    id: 'y',
    date: '12-07-2020',
    period: 'day',
    goalItems: [
      {
        id: 'yy',
        isMilestone: true,
        body: 'day task',
        goalRef: '',
      },
      {
        id: 'yy1',
        isMilestone: false,
        body: 'Non Milestone Day task',
        goalRef: '',
      },
    ],
  },
  {
    id: 'b',
    date: '10-07-2020',
    period: 'week',
    goalItems: [
      {
        id: 'q',
        isMilestone: true,
        body: 'Week task',
        goalRef: 'r',
      },
      {
        id: 'q1',
        isMilestone: false,
        body: 'Non Milestone Week task',
        goalRef: '',
      },
    ],
  },
  {
    id: 'c',
    date: '31-07-2020',
    period: 'month',
    goalItems: [
      {
        id: 'r',
        isMilestone: true,
        body: 'Month task',
        goalRef: 's',
      },
      {
        id: 'r1',
        isMilestone: false,
        body: 'Non Milestone Month task',
        goalRef: '',
      },
    ],
  },
  {
    id: 'd',
    date: '31-12-2020',
    period: 'year',
    goalItems: [
      {
        id: 's',
        isMilestone: true,
        body: 'Year task',
        goalRef: 't',
      },
      {
        id: 's1',
        isMilestone: false,
        body: 'Non Milestone Year task',
        goalRef: '',
      },
    ],
  },
  {
    id: 'e',
    date: '01-01-1970',
    period: 'lifetime',
    goalItems: [
      {
        id: 't',
        isMilestone: false,
        body: 'lifetime task',
        goalRef: 'q',
      },
      {
        id: 'q1',
        isMilestone: false,
        body: 'Non Milestone lifetime task',
        goalRef: '',
      },
    ],
  },
];

test('getGoalMilestone runs without throwing on a representative DB shape', () => {
  expect(() => getGoalMilestone(DB_OBJ)).not.toThrow();
});

// The resolver feeds this JSON.parse(JSON.stringify(goalDocs)), so goal items
// carry `_id` — which is what the goalRef matching actually keys on.
const AI_PLAN = [
  {
    _id: 'gy',
    date: '31-12-2026',
    period: 'year',
    goalItems: [
      {
        _id: 'y', isMilestone: true, body: 'Ship 1.0', goalRef: null,
      },
    ],
  },
  {
    _id: 'gm',
    date: '30-09-2026',
    period: 'month',
    goalItems: [
      {
        _id: 'm', isMilestone: true, body: 'Plan title', goalRef: 'y',
      },
    ],
  },
  {
    _id: 'gw',
    date: '11-09-2026',
    period: 'week',
    goalItems: [
      {
        _id: 'w', isMilestone: true, body: 'Plan entry', goalRef: 'm',
      },
      {
        _id: 'w1', isMilestone: false, body: 'Ordinary week goal', goalRef: '',
      },
    ],
  },
];

test('getGoalMilestone keeps a plan whose top link has no goalRef', () => {
  const milestonesView = getGoalMilestone(AI_PLAN);

  // The unrooted milestone is the top of what is left of the tree, so it is
  // listed at its own period rather than dropped with everything below it.
  expect(milestonesView.year.map((goalItem) => goalItem.id)).toEqual(['y']);
  expect(milestonesView.year[0].milestones.map((milestone) => milestone.id)).toEqual(['m']);
  expect(milestonesView.year[0].milestones[0].milestones.map((milestone) => milestone.id)).toEqual(['w']);
});

test('getGoalMilestone does not list a milestone that already hangs off a parent', () => {
  const milestonesView = getGoalMilestone(AI_PLAN);

  expect(milestonesView.month).toEqual([]);
  expect(milestonesView.week.map((goalItem) => goalItem.id)).toEqual(['w1']);
});

// Nesting each section of GoalMilestoneType can express, and MilestonesTime
// asks for — 1 is the root row on its own.
const QUERY_DEPTH = {
  day: 1, week: 2, month: 3, year: 4, lifetime: 5,
};

/** Every id the page can render, mapped to how many rows it is listed in. */
function renderedCounts(milestonesView) {
  const counts = new Map();

  Object.keys(milestonesView).forEach((period) => {
    const walk = (goalItems, depth) => goalItems.forEach((goalItem) => {
      if (depth > QUERY_DEPTH[period]) return;
      counts.set(goalItem.id, (counts.get(goalItem.id) || 0) + 1);
      if (goalItem.milestones) walk(goalItem.milestones, depth + 1);
    });

    walk(milestonesView[period], 1);
  });

  return counts;
}

/**
 * One month plan chained to the year goal, and a second month plan whose own
 * top link is `topRef` — each with a week milestone of its own.
 */
const twoPlans = (topRef) => [
  {
    _id: 'gy',
    date: '31-12-2026',
    period: 'year',
    goalItems: [
      {
        _id: 'y', isMilestone: false, body: 'Ship 1.0', goalRef: null,
      },
    ],
  },
  {
    _id: 'gm',
    date: '30-09-2026',
    period: 'month',
    goalItems: [
      {
        _id: 'm', isMilestone: true, body: 'Rebuild my evening recovery habits', goalRef: 'y',
      },
      {
        _id: 'm2', isMilestone: !!topRef, body: 'Ship the onboarding revamp', goalRef: topRef,
      },
    ],
  },
  {
    _id: 'gw',
    date: '18-09-2026',
    period: 'week',
    goalItems: [
      {
        _id: 'w', isMilestone: true, body: 'Establish a consistent wind-down time', goalRef: 'm',
      },
      {
        _id: 'w2', isMilestone: true, body: 'Final QA and A/B Test Setup', goalRef: 'm2',
      },
    ],
  },
];

test.each([
  ['no parent at all', null],
  ['a parent of its own period', 'm'],
  ['a parent of a smaller period', 'w'],
  ['a parent that no longer exists', 'deleted'],
])('getGoalMilestone roots a plan saved with %s at its own period', (unused, topRef) => {
  const milestonesView = getGoalMilestone(twoPlans(topRef));
  const monthPlan = milestonesView.month.find((goalItem) => goalItem.id === 'm2');

  // Nesting it under an item of its own period or below would push its week
  // milestone past the deepest `milestones` the month section can select, and
  // the plan and the milestone both fell out of the response with no error.
  expect(monthPlan.body).toBe('Ship the onboarding revamp');
  expect(monthPlan.milestones.map((milestone) => milestone.id)).toEqual(['w2']);

  // The chained plan still renders under the year goal, and nothing is listed
  // in two places.
  expect(milestonesView.year[0].milestones.map((milestone) => milestone.id)).toEqual(['m']);
  ['y', 'm', 'm2', 'w', 'w2'].forEach((id) => expect(renderedCounts(milestonesView).get(id)).toBe(1));
});
