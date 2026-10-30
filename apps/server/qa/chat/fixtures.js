/**
 * Routine contexts the chat QA suite talks to. Each one is exactly what
 * `sendRoutineChat` hands `chatWithRoutine`: the client's snapshot of the
 * focused routine plus the server-built week digest and area/project brief.
 *
 * The week text is written in the format `utils/chatWeek.weekDigest` produces,
 * so a case here exercises the same prompt a real thread does.
 */

const BASE = {
  date: '25-10-2026',
  routineStatus: 'Done',
  ticked: true,
  stimulus: 'D',
  points: 10,
  scores: { D: 60, K: 40, G: 55 },
};

/** A project routine with a full week and a project brief. */
const deepWork = {
  ...BASE,
  routineName: 'Deep Work',
  routineTime: '09:00',
  routineEnd: '12:00',
  doneCount: 1,
  totalCount: 3,
  items: [
    { id: 'gi1', body: 'Write landing page copy', isComplete: true },
    { id: 'gi2', body: 'Fix signup bug', isComplete: false },
    { id: 'gi3', body: 'Review analytics dashboard', isComplete: false },
  ],
  week: [
    'Last 7 days: 5 of 6 scheduled sessions done (4 on time, 1 late), 1 missed; checklist items 7 done, 2 left open.',
    '- Sat 24 Oct: done on time · Draft pricing page (done), Email beta users (not done)',
    '- Fri 23 Oct: done late · Fix onboarding copy (done)',
    '- Thu 22 Oct: missed · Record demo video (not done)',
    '- Wed 21 Oct: done on time · Set up analytics (done), Write FAQ (done)',
    '- Tue 20 Oct: done on time · Pricing research (done)',
    '- Mon 19 Oct: done on time · Wireframe home (done)',
    '- Sun 18 Oct: rest day',
    'This routine feeds: week goal "Launch the website" (open).',
  ].join('\n'),
  brief: [
    '[project:website]',
    'Rebuild the marketing site for the beta launch on 1 November.',
    'Next steps:',
    '- Record the demo video',
    '- Publish the pricing page',
    '- Email the beta list',
  ].join('\n'),
};

/** An area routine whose week is patchy: the coaching cases. */
const workout = {
  ...BASE,
  routineName: 'Evening Workout',
  routineTime: '18:30',
  routineEnd: '19:30',
  stimulus: 'K',
  doneCount: 0,
  totalCount: 2,
  items: [
    { id: 'w1', body: '20 min run', isComplete: false },
    { id: 'w2', body: 'Core circuit', isComplete: false },
  ],
  week: [
    'Last 7 days: 3 of 6 scheduled sessions done (1 on time, 2 late), 3 missed; checklist items 4 done, 3 left open.',
    '- Sat 24 Oct: missed · 20 min run (not done)',
    '- Fri 23 Oct: done late · Core circuit (done)',
    '- Thu 22 Oct: missed',
    '- Wed 21 Oct: done on time · 20 min run (done), Stretch (done)',
    '- Tue 20 Oct: missed · Core circuit (not done), Stretch (not done)',
    '- Mon 19 Oct: done late · 20 min run (done)',
    '- Sun 18 Oct: rest day',
    'This routine feeds: month goal "Run 50 km in October" (open).',
  ].join('\n'),
  brief: [
    '[area:health]',
    'Stay fit enough to run a 10k by December.',
    'Next steps:',
    '- Book a physio check for the knee',
    '- Add one long run on Sundays',
  ].join('\n'),
};

/** A brand-new routine: no week yet, no area or project tag. */
const fresh = {
  ...BASE,
  routineName: 'Reading',
  routineTime: '21:00',
  routineEnd: '21:30',
  stimulus: 'G',
  doneCount: 0,
  totalCount: 1,
  items: [{ id: 'r1', body: 'Read 20 pages', isComplete: false }],
  week: '',
  brief: '',
};

/** Everything on today's checklist is already done. */
const allDone = {
  ...deepWork,
  doneCount: 3,
  items: deepWork.items.map((item) => ({ ...item, isComplete: true })),
};

module.exports = {
  deepWork, workout, fresh, allDone,
};
