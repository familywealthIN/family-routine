/**
 * The Routines field-guide content: one chapter per product surface.
 * Shared by the /guide overview, the per-feature pages under /guide/<id>,
 * and the header's Guide dropdown.
 */
export type GuideMedia =
  | { type: 'video'; src: string; poster: string; label: string }
  | { type: 'matrix' };

export interface GuideDetailItem {
  title: string;
  body: string;
  img: string;
  alt: string;
}

export interface GuideChapter {
  id: string;
  num: string;
  accent: string;
  icon: string;
  label: string;
  eyebrow: string;
  title: string;
  lead: string;
  media: GuideMedia;
  steps: [string, string][];
  notes: [string, string][];
  points: [string, string, string][];
  details: {
    heading: string;
    intro: string;
    items: GuideDetailItem[];
  };
}

export const chapters: GuideChapter[] = [
  {
    id: 'dashboard',
    num: '01',
    accent: '#288bd5',
    icon: 'ph:house-simple',
    label: 'Dashboard',
    eyebrow: 'Where the day happens',
    title: 'Dashboard — your day, time-boxed',
    lead:
      'The Dashboard is the only page you strictly need. It lays your routines on a timeline, keeps score on punctuality, and never lets a missed check-in silently disappear.',
    media: {
      type: 'video',
      src: '/videos/routines-desktop.webm',
      poster: '/videos/routines-desktop-poster.jpg',
      label: 'routine notes — dashboard',
    },
    steps: [
      ['The week strip', 'Seven day dials up top. Your current day is ringed with live progress; past days show how much of the loop you closed.'],
      ['The focused routine card', 'Whatever routine is due now sits front and centre — its time slot, steps, quick tasks, and a Today / Week / Month / Year toggle that shows the goals this routine feeds.'],
      ['The punctuality window', 'Every routine opens a 1h 30m window around its start time. Tick inside the window and the check-in counts as on time. The app knows the difference — that is the whole point.'],
      ['Upcoming and Past', 'Everything later today queues under Upcoming. Anything you missed moves to Past — where you can still check it in by spending points, streak intact, agents still running.'],
    ],
    notes: [
      ['Skip Day exists for a reason', 'Travel day? Sick? Flip Skip Day and the loop pauses without wrecking your history. Honest data beats a fake streak.'],
      ['Quick tasks ride along', 'The + button drops a one-off task into the current routine slot, so improvised work still happens inside a time box.'],
    ],
    points: [
      ['D', 'Discipline', 'earned by ticking inside the punctuality window'],
      ['K', 'Kinetics', 'earned by clearing steps and quick tasks'],
    ],
    details: {
      heading: 'The Dashboard, in detail',
      intro: 'Everything on this page exists to answer one question: are you where you said you’d be, right now?',
      items: [
        {
          title: 'The week strip and the focused card',
          body: 'Seven day dials up top — the current day wears a live progress ring. Below, the routine due right now sits front and centre with its time slot, description and task count. You never hunt for what’s next; the page has already decided.',
          img: '/screenshots/guide/dashboard-day.jpg',
          alt: 'The Dashboard with the week strip and the focused routine card',
        },
        {
          title: 'One card, four horizons',
          body: 'The Today / Week / Month / Year toggle swaps the focused card between today’s checklist and the goals this routine feeds. Set Week’s Goal and Set Month’s Goal chips nag you — politely — until the cascade above this routine exists.',
          img: '/screenshots/guide/dashboard-cascade.jpg',
          alt: 'The focused routine card switched to the Week horizon',
        },
        {
          title: 'Past is not gone',
          body: 'Miss the punctuality window and the routine moves to the Past tab with a redeem button — not a delete button. Spend points to check it in late: the streak stays intact and its agents still fire. The app forgives; it just keeps receipts.',
          img: '/screenshots/guide/dashboard-past.jpg',
          alt: 'The Past tab listing missed routines, each with a redeem button',
        },
        {
          title: 'Quick tasks, boxed',
          body: 'The + button opens the quick-task modal: type the task, hit Start Task, and it lives inside the current routine slot — improvised work still lands in a time box. Build Agent sits right next to it for the moment you notice a repetition.',
          img: '/screenshots/guide/dashboard-quicktask.jpg',
          alt: 'The quick-task modal with Start Task and Build Agent actions',
        },
      ],
    },
  },
  {
    id: 'priority',
    num: '02',
    accent: '#f44336',
    icon: 'ph:squares-four',
    label: 'Priority',
    eyebrow: 'Where the day gets ordered',
    title: 'Priority — an Eisenhower matrix for day goals',
    lead:
      'Priority takes today’s goal items and sorts them into four quadrants — Do now, Plan, Delegate, Automate. You classify with a single tag; the matrix does the arguing for you.',
    media: { type: 'matrix' },
    steps: [
      ['Tag it once', 'Add a priority:do, priority:plan, priority:delegate or priority:automate tag to any day goal — from the goal editor or straight from the matrix.'],
      ['Read the counts', 'Four scorecards up top tell you the shape of your day at a glance. A tall Do-now column before 9am is a warning, not a badge.'],
      ['Work the quadrants', 'Tick items complete without leaving the matrix, or tap one to open the full goal editor — sub-tasks, contribution, reward and all.'],
      ['Automate means automate', 'The fourth quadrant isn’t a graveyard. Recurring drudge work belongs in a routine with an agent attached — see chapter 04.'],
    ],
    notes: [
      ['Do-now is a budget', 'Keep it to three or fewer. Everything can’t be urgent and important — that’s the matrix’s one rule.'],
      ['Plan feeds the cascade', 'Items you park in Plan are the raw material for next week’s milestones on the Goals page.'],
    ],
    points: [
      ['K', 'Kinetics', 'the matrix orders the work; doing it earns the points'],
    ],
    details: {
      heading: 'The matrix, in detail',
      intro: 'Four quadrants, straight from the app — each one is just a tag on a day goal.',
      items: [
        {
          title: 'Four counts, one glance',
          body: 'The scorecards read your day back to you: how much is on fire, how much is parked, what you’ve handed off, what a machine should own. If Do-now is tall before breakfast, today’s plan was written by yesterday’s procrastination.',
          img: '/screenshots/guide/priority-counts.jpg',
          alt: 'The Priority page with Do, Plan, Delegate and Automate scorecards',
        },
        {
          title: 'Quadrants that argue for you',
          body: 'Important + urgent lands in Do; important but not urgent in Plan; urgent but not yours in Delegate; neither in Automate. Ticking an item complete happens right in the quadrant — the strikethrough is the day’s most honest chart.',
          img: '/screenshots/guide/priority-quadrants.jpg',
          alt: 'The four priority quadrants with tagged day goals',
        },
        {
          title: 'Edit without leaving',
          body: 'Tap any item and the full goal editor slides up — sub-tasks, contribution notes, reward, tags. Reclassify by swapping the priority tag and the item walks itself to the right quadrant on the next refresh.',
          img: '/screenshots/guide/priority-editor.jpg',
          alt: 'The goal editor opened from a matrix item',
        },
      ],
    },
  },
  {
    id: 'goals',
    num: '03',
    accent: '#1f6fb0',
    icon: 'ph:tree-structure',
    label: 'Goals',
    eyebrow: 'Where days compound',
    title: 'Goals — the year → day cascade',
    lead:
      'Goals turns one yearly ambition into month, week and day milestones — then rolls your daily wins back up. Five day wins auto-complete a week, three weeks a month, nine months a year.',
    media: {
      type: 'video',
      src: '/videos/goals-desktop.webm',
      poster: '/videos/goals-desktop-poster.jpg',
      label: 'routine notes — goals',
    },
    steps: [
      ['Start at the top', 'Write the year goal first. It is allowed to be too big — the cascade exists to shrink it.'],
      ['Break it down', 'Month and week accordions hold milestones; each week milestone decomposes into day goals you can actually schedule.'],
      ['Attach days to routines', 'A day goal linked to a routine shows up on the Dashboard card’s goal toggle — so the plan and the timeline are the same object.'],
      ['Let wins roll up', 'Complete the day goals and the parents close themselves. The calendar view shows every day’s goal count, so gaps are visible before they become months.'],
    ],
    notes: [
      ['Milestones re-plan, not restart', 'Editing a milestone mid-month is Geniuses work — the framework rewards improving the plan, not clinging to draft one.'],
      ['The stats banner is a mirror', 'Total day tasks, completion counts, streaks — read it weekly, not hourly.'],
    ],
    points: [
      ['G', 'Geniuses', 'earned by planning, linking and improving the cascade'],
    ],
    details: {
      heading: 'The cascade, in detail',
      intro: 'One page holds the whole hierarchy — year at the bottom, today at the top, everything visibly connected.',
      items: [
        {
          title: 'The month at a glance',
          body: 'The stats banner totals your day tasks and completions; the calendar prints each day’s goal count in its cell. A blank fortnight is impossible to miss — which is exactly the point.',
          img: '/screenshots/guide/goals-calendar.jpg',
          alt: 'The Goals page stats banner and month calendar with per-day goal counts',
        },
        {
          title: 'Week milestones unfold',
          body: 'Each week is an accordion. Open it and the milestones inside show their day goals — the same items you tick on the Dashboard, filed under the milestone they serve.',
          img: '/screenshots/guide/goals-week.jpg',
          alt: 'A week accordion expanded to show its milestones and day goals',
        },
        {
          title: 'Months and years roll up',
          body: 'Below the weeks sit the month and year accordions. Complete the children and the parents close themselves: five day wins complete a week, three weeks a month, nine months a year. You never mark a year goal done — you arrive at it.',
          img: '/screenshots/guide/goals-cascade.jpg',
          alt: 'Month and year goal accordions in the cascade',
        },
      ],
    },
  },
  {
    id: 'agents',
    num: '04',
    accent: '#143d60',
    icon: 'ph:sparkle',
    label: 'Agents',
    eyebrow: 'Where the loop runs itself',
    title: 'Agents — automation attached to routines',
    lead:
      'An agent is a worker glued to a routine. Start the task and it fires; work, and it listens; finish, and it reports success or failure. It even runs when you redeem a missed check-in.',
    media: {
      type: 'video',
      src: '/videos/agents-desktop.webm',
      poster: '/videos/agents-desktop-poster.jpg',
      label: 'routine notes — agents',
    },
    steps: [
      ['Attach to a routine', 'Every agent binds to one routine — Morning briefing to Wake Up, Evening recap to Wind-down. The routine’s schedule is the agent’s schedule.'],
      ['Wire the events', 'A start event fires when you begin the task, an optional end event when you finish. Point them at any URL — your n8n flow, a webhook, your own endpoint — with {{ goal_id }} substituted in.'],
      ['Watch the lifecycle', 'Idle → listening → finished. The table keeps success and failure counts per agent, so a flaky webhook can’t hide.'],
      ['Redeemed check-ins still fire', 'Check in a missed routine with points and its agents run anyway — automation should not punish a late human.'],
    ],
    notes: [
      ['Agents are the Automate quadrant', 'If something shows up in Priority’s fourth quadrant twice, it is telling you to build an agent.'],
      ['Build from the task', 'The quick-task modal has a Build Agent button — automate at the exact moment you notice the repetition.'],
    ],
    points: [
      ['D', 'Discipline', 'agents anchor you to the routine that earns it'],
      ['K', 'Kinetics', 'listening agents keep the work session honest'],
    ],
    details: {
      heading: 'Agents, in detail',
      intro: 'A small fleet, fully auditable — every agent belongs to a routine and answers for its record.',
      items: [
        {
          title: 'The fleet at a glance',
          body: 'The banner counts your agents, how many are active right now, and their lifetime successes and failures. Below it, the table names each agent and the routine it serves — no orphan automations floating around.',
          img: '/screenshots/guide/agents-table.jpg',
          alt: 'The Agents page banner and table listing each agent and its routine',
        },
        {
          title: 'A lifecycle you can audit',
          body: 'Idle → listening → finished. Each row carries its own success and failure counts, so a webhook that quietly started failing last Tuesday shows up as a number, not a feeling.',
          img: '/screenshots/guide/agents-lifecycle.jpg',
          alt: 'An agent row highlighted with its status and success and failure counts',
        },
        {
          title: 'Wiring an agent',
          body: 'The editor asks for four things: a name, the routine to bind to, a start event and an optional end event. Events are plain URLs — your n8n flow, a webhook, your own endpoint — with {{ goal_id }} substituted at fire time.',
          img: '/screenshots/guide/agents-editor.jpg',
          alt: 'The Edit agent dialog with routine binding and start and end event URLs',
        },
      ],
    },
  },
];

export const matrix = {
  stats: [
    { label: 'DO NOW', count: 2, color: '#f44336' },
    { label: 'PLAN', count: 3, color: '#1976d2' },
    { label: 'DELEGATE', count: 1, color: '#ff9800' },
    { label: 'AUTOMATE', count: 2, color: '#757575' },
  ],
  quads: [
    { title: 'Do now', tag: 'priority:do', color: '#f44336', items: [{ t: 'Ship the pricing fix', done: false }, { t: 'Call the bank before noon', done: true }] },
    { title: 'Plan', tag: 'priority:plan', color: '#1976d2', items: [{ t: 'Outline week 29 milestones', done: false }, { t: 'Draft the launch email', done: false }] },
    { title: 'Delegate', tag: 'priority:delegate', color: '#ff9800', items: [{ t: 'Collect screenshots for review', done: false }] },
    { title: 'Automate', tag: 'priority:automate', color: '#757575', items: [{ t: 'Daily focus-session log', done: true }, { t: 'Morning briefing digest', done: false }] },
  ],
};

export const kdgColor: Record<string, string> = {
  D: '#288bd5',
  K: '#e53935',
  G: '#1a5a8f',
};
