import type { HelpArticle } from '../types';

export const routineArticles: HelpArticle[] = [
  {
    slug: 'introduction-to-routines',
    title: 'Introduction to routines',
    summary:
      'What a routine item is, how the day dial works, and how routines relate to goals.',
    category: 'routines',
    subcategory: 'essentials',
    updated: '2026-08-05',
    popular: true,
    keywords: ['routine', 'home', 'dashboard', 'circadian', 'day', 'time box'],
    intro:
      'A **routine item** is a named block of your day with a time on it — “Deep work, 09:00”, “Gym, 18:30”. Routines are the backbone of Routine Notes: goals attach to them, points are earned through them, and agents fire from them.',
    sections: [
      {
        id: 'anatomy',
        heading: 'What a routine item holds',
        blocks: [
          {
            kind: 'table',
            head: ['Field', 'What it is for'],
            rows: [
              ['**Routine Name**', 'What you see on Home. Keep it short — “Morning pages”, not “Do my morning pages every day”.'],
              ['**Description**', 'Optional context, shown when you open the routine.'],
              ['**Tags**', 'Free-form labels. Tags starting `project:` or `area:` also build the [Projects and Areas](/help/articles/projects-and-areas) views.'],
              ['**Steps**', 'An ordered checklist inside the routine. See [Routine steps](/help/articles/routine-steps).'],
              ['**Time**', 'When the block starts, in 10-minute increments. This sets the [punctuality window](/help/articles/check-in-and-the-punctuality-window).'],
              ['**Points**', 'What checking in on time is worth, drawn from your daily budget.'],
            ],
          },
        ],
      },
      {
        id: 'home',
        heading: 'The Home screen',
        blocks: [
          {
            kind: 'p',
            text: 'Home is the only screen you strictly need. Top to bottom:',
          },
          {
            kind: 'list',
            items: [
              '**The week strip** — seven day dials. Today is ringed with live progress; past days show how much of the loop you closed.',
              '**The current routine card** — whatever is due now, with its time slot, steps, quick tasks, and a Today / Week / Month / Year toggle showing the goals this routine feeds.',
              '**Upcoming** — everything still to come today.',
              '**Past** — anything you missed, where it can still be [redeemed](/help/articles/redeem-a-missed-routine).',
              '**The D / K / G dials** — today’s points, by stimulus.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            text: 'The desktop sidebar labels this screen **Home**; the mobile tab bar labels it **Routine**. Same screen.',
          },
        ],
      },
      {
        id: 'circadian',
        heading: 'The circadian cycle dial',
        blocks: [
          {
            kind: 'p',
            text: '**Routine Settings** shows your whole day as a ring, with each routine laid out at its time. It is the fastest way to spot a day that is packed at one end and empty at the other, or two routines fighting for the same hour.',
          },
        ],
      },
      {
        id: 'routines-vs-goals',
        heading: 'Routines vs goals',
        blocks: [
          {
            kind: 'p',
            text: 'A routine is *when*. A goal is *what*. “Deep work, 09:00” is a routine; “Finish the Q3 report” is a goal you attach to it. Routines repeat every day without being re-created; goals are dated and finish.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'The app says “task” for both',
            text: 'You will see **Routine Task**, **Goal Task** and **Start Task** in the interface. When a screen is ambiguous, look at whether the thing has a time (routine) or a date and period (goal).',
          },
        ],
      },
    ],
    related: [
      'create-and-edit-routines',
      'routine-steps',
      'check-in-and-the-punctuality-window',
      'introduction-to-goals',
    ],
  },

  {
    slug: 'create-and-edit-routines',
    title: 'Create, edit and delete a routine',
    summary: 'Add a routine item, change its time or points, and remove one you no longer use.',
    category: 'routines',
    subcategory: 'essentials',
    updated: '2026-08-05',
    popular: true,
    keywords: ['add routine', 'new routine', 'edit', 'delete', 'settings', 'points budget'],
    intro:
      'Routine items are managed on the **Routine Settings** screen, not on Home. Home is for running your day; Settings is for changing its shape.',
    sections: [
      {
        id: 'create',
        heading: 'Create a routine item',
        blocks: [
          {
            kind: 'platformSteps',
            groups: [
              {
                platform: 'web',
                steps: [
                  'Open **Settings → Routine Settings** in the sidebar.',
                  'Select **Add** above the routine table.',
                  'Enter a **Routine Name** and, optionally, a description and tags.',
                  'Add **Steps** if the routine has a checklist.',
                  'Set the **Time** — this is the start of the block, in 10-minute increments.',
                  'Set the **Points** the check-in is worth, watching *Point Remaining*.',
                  'Save.',
                ],
              },
              {
                platform: 'ios',
                steps: [
                  'Open the drawer and tap **Routine** in the tab bar, then the settings icon.',
                  'Tap **Add**.',
                  'Enter a **Routine Name**, and optionally a description and tags.',
                  'Add **Steps** if the routine has a checklist.',
                  'Set the **Time** and the **Points**.',
                  'Tap Save.',
                ],
              },
              {
                platform: 'android',
                steps: [
                  'Open the drawer and tap **Routine** in the tab bar, then the settings icon.',
                  'Tap **Add**.',
                  'Enter a **Routine Name**, and optionally a description and tags.',
                  'Add **Steps** if the routine has a checklist.',
                  'Set the **Time** and the **Points**.',
                  'Tap Save.',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'budget',
        heading: 'The point budget',
        blocks: [
          {
            kind: 'p',
            text: 'Your routine items share one daily pool. **Routine Settings** shows *Point Remaining* — what is left to assign. If it reads zero you cannot give a new routine any points until you take some back from another.',
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Let the points say what matters',
            text: 'The budget is a forcing function. If everything is worth a lot, nothing is. Weight the two or three routines that genuinely change your week and leave the rest small.',
          },
        ],
      },
      {
        id: 'edit',
        heading: 'Edit a routine item',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open **Routine Settings**.',
              'Select the routine in the table.',
              'Change any field — name, description, tags, steps, time or points.',
              'Save.',
            ],
          },
          {
            kind: 'callout',
            tone: 'note',
            text: 'Editing changes the routine going forward. Check-ins you have already made keep the points they were worth at the time.',
          },
        ],
      },
      {
        id: 'delete',
        heading: 'Delete a routine item',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open **Routine Settings**.',
              'Select the routine, then choose **Delete**.',
              'Confirm.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Deleting is permanent',
            text: 'The routine stops appearing on Home from now on. If it has an [agent](/help/articles/introduction-to-agents) attached, delete or repoint the agent too — an agent is bound to exactly one routine.',
          },
          {
            kind: 'p',
            text: 'If you only want a break from a routine, use [Skip Day](/help/articles/skip-day) or set its points low rather than deleting it — deleting loses the link from your past goals.',
          },
        ],
      },
    ],
    related: ['introduction-to-routines', 'routine-steps', 'skip-day', 'how-points-work'],
  },

  {
    slug: 'routine-steps',
    title: 'Routine steps',
    summary: 'Break a routine into an ordered checklist you work down during the block.',
    category: 'routines',
    subcategory: 'essentials',
    updated: '2026-08-05',
    keywords: ['steps', 'checklist', 'sub steps', 'order', 'drag'],
    intro:
      '**Steps** are the ordered checklist inside a routine item. They are part of the routine’s definition, so they appear every day the routine runs — unlike a goal’s sub-tasks, which belong to one dated goal.',
    sections: [
      {
        id: 'add',
        heading: 'Add steps',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open **Routine Settings** and select the routine.',
              'In the **Steps** field, type into *Type your step*.',
              'Select **Add Step**.',
              'Repeat for each step, then drag to reorder.',
              'Save.',
            ],
          },
        ],
      },
      {
        id: 'during',
        heading: 'Working the steps',
        blocks: [
          {
            kind: 'p',
            text: 'When the routine is the current one on Home, open its steps from the routine card to see the list in order. Steps are a prompt for you, not a scoring mechanism — points come from the check-in itself, not from individual steps.',
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Steps beat memory for anything with an order',
            text: 'Warm-up sequences, shutdown rituals, a pre-flight list before you publish. Anything where doing it out of order costs you.',
          },
        ],
      },
      {
        id: 'vs-subtasks',
        heading: 'Steps vs sub-tasks',
        blocks: [
          {
            kind: 'table',
            head: ['', 'Steps', 'Sub-tasks'],
            rows: [
              ['Belong to', 'A routine item', 'A single day goal'],
              ['Repeat', 'Every day the routine runs', 'No — one goal only'],
              ['Edited in', 'Routine Settings', 'The goal editor'],
              ['Tick state', 'Not tracked per day', 'Tracked and saved'],
            ],
          },
          {
            kind: 'p',
            text: 'If you need the ticks recorded, use [sub-tasks on a day goal](/help/articles/sub-tasks) instead.',
          },
        ],
      },
    ],
    related: ['create-and-edit-routines', 'sub-tasks', 'introduction-to-routines'],
  },

  {
    slug: 'check-in-and-the-punctuality-window',
    title: 'Check in and the punctuality window',
    summary:
      'How the 1h 30m window works, what the button colours mean, and why a check-in cannot be undone.',
    category: 'routines',
    subcategory: 'checking-in',
    updated: '2026-08-05',
    popular: true,
    keywords: ['tick', 'check in', 'window', 'on time', 'late', 'punctual', 'missed'],
    intro:
      'Checking in is the core action in Routine Notes. Every routine opens a **1 hour 30 minute window** around its time — 60 minutes before and 30 minutes after — and a check-in inside that window earns Discipline.',
    sections: [
      {
        id: 'window',
        heading: 'The window',
        blocks: [
          {
            kind: 'table',
            head: ['Relative to the routine’s time', 'State'],
            rows: [
              ['More than 60 minutes before', 'Upcoming — you cannot check in yet'],
              ['60 minutes before → 30 minutes after', '**Open** — check in here and it counts'],
              ['More than 30 minutes after', 'Passed — the check-in must be [redeemed](/help/articles/redeem-a-missed-routine)'],
            ],
          },
          {
            kind: 'p',
            text: 'The window is deliberately generous at the front and tight at the back. Being early is fine; drifting late is the habit the app is trying to catch.',
          },
        ],
      },
      {
        id: 'how',
        heading: 'Check in',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open **Home**.',
              'Find the routine on the current card, or in **Upcoming**.',
              'Select its action button.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'A check-in is final',
            text: 'Once a routine is ticked it cannot be un-ticked. This is on purpose — an undoable score is not a score. If you tick the wrong routine, leave it and carry on.',
          },
        ],
      },
      {
        id: 'buttons',
        heading: 'What the button means',
        blocks: [
          {
            kind: 'table',
            head: ['Icon', 'Colour', 'Meaning'],
            rows: [
              ['Alarm', '—', 'Upcoming. The window has not opened.'],
              ['Check', 'Green', 'Checked in. Done.'],
              ['Diamond', 'White', 'Passed, but still redeemable today for points.'],
              ['Cross', 'Red', 'Passed and locked. The day has moved on.'],
              ['Ellipsis', '—', 'More actions for this routine.'],
            ],
          },
        ],
      },
      {
        id: 'points',
        heading: 'What you earn',
        blocks: [
          {
            kind: 'p',
            text: 'An on-time check-in earns **Discipline (D)**, capped at 100 a day across all your routines. Clearing the goals attached to a routine earns **Kinetics (K)** and **Geniuses (G)** separately. See [How points work](/help/articles/how-points-work).',
          },
        ],
      },
    ],
    related: ['redeem-a-missed-routine', 'how-points-work', 'skip-day', 'quick-tasks'],
  },

  {
    slug: 'quick-tasks',
    title: 'Quick tasks',
    summary: 'Drop an unplanned task into the routine slot that is running right now.',
    category: 'routines',
    subcategory: 'checking-in',
    updated: '2026-08-05',
    keywords: ['quick task', 'unplanned', 'ad hoc', 'fab', 'plus button', 'start task'],
    intro:
      'Work does not always arrive on schedule. A **quick task** is a one-off you add to the routine that is running now, so improvised work still happens inside a time box instead of derailing the day.',
    sections: [
      {
        id: 'add',
        heading: 'Add a quick task',
        blocks: [
          {
            kind: 'steps',
            items: [
              'On **Home**, select the **+** button (bottom right), or the quick-task control on the current routine card.',
              'Type the task into *Type your task*.',
              'Optionally pick the routine it belongs to and a parent goal.',
              'Add tags if you want it to show up under a project or area.',
              'Choose **Start Task**.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            text: 'The modal also shows a timeline of related tasks, so you can see whether you have done this thing before under the same routine.',
          },
        ],
      },
      {
        id: 'agents',
        heading: 'Start Agent and Build Agent',
        blocks: [
          {
            kind: 'p',
            text: 'The same modal offers two more buttons:',
          },
          {
            kind: 'list',
            items: [
              '**Start Agent** — appears when the chosen routine already has an agent, and fires it.',
              '**Build Agent** — creates an agent for the routine on the spot.',
            ],
          },
          {
            kind: 'p',
            text: 'See [Introduction to agents](/help/articles/introduction-to-agents).',
          },
        ],
      },
      {
        id: 'vs-pending',
        heading: 'Quick task or pending item?',
        blocks: [
          {
            kind: 'p',
            text: 'Use a **quick task** when you are going to do it now, inside the current block. Use [Pending items](/help/articles/pending-items) when something has landed that you do not want to lose but are not going to touch yet.',
          },
        ],
      },
    ],
    related: ['pending-items', 'introduction-to-agents', 'check-in-and-the-punctuality-window'],
  },

  {
    slug: 'pending-items',
    title: 'Pending items',
    summary: 'The inbox for unplanned tasks, and how to turn one into a goal.',
    category: 'routines',
    subcategory: 'checking-in',
    updated: '2026-08-05',
    keywords: ['pending', 'inbox', 'unplanned', 'capture', 'motto', 'checklist icon'],
    intro:
      '**Pending items** is the capture inbox. When something arrives mid-day that you do not want to lose but are not going to do now, put it here and get back to what you were doing.',
    sections: [
      {
        id: 'open',
        heading: 'Open pending items',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Select the checklist icon in the toolbar.',
              'The full-screen **Pending Items** drawer opens.',
            ],
          },
          {
            kind: 'p',
            text: 'With nothing captured it reads *You have 0 Pending tasks*.',
          },
        ],
      },
      {
        id: 'capture',
        heading: 'Capture and convert',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Type into *Type your unplanned task* and confirm.',
              'When you are ready to schedule it, select the convert icon on the item.',
              'It opens in the goal editor, where you set a period, date and routine.',
              'Save — it is now a goal and leaves the pending list.',
            ],
          },
          {
            kind: 'p',
            text: 'To drop an item instead, select delete on the row.',
          },
        ],
      },
      {
        id: 'habit',
        heading: 'Working the inbox',
        blocks: [
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Empty it at a fixed time',
            text: 'Pending items is a buffer, not a backlog. Attach it to an existing routine — a planning or shutdown block — and clear it there. An inbox nobody empties turns into a list nobody reads.',
          },
        ],
      },
    ],
    related: ['quick-tasks', 'introduction-to-goals', 'ai-search'],
  },

  {
    slug: 'skip-day',
    title: 'Skip Day',
    summary: 'Pause scoring for a day without breaking your history — twice a week, maximum.',
    category: 'routines',
    subcategory: 'day-off',
    updated: '2026-08-05',
    popular: true,
    keywords: ['skip', 'day off', 'rest', 'holiday', 'sick', 'travel', 'pause', 'streak'],
    intro:
      'Some days the routine is not going to happen — you are travelling, ill, or the day has simply been taken from you. **Skip Day** pauses scoring so an honest day off does not look identical to a day you dropped the ball.',
    sections: [
      {
        id: 'use',
        heading: 'Skip a day',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open **Home** and select the day on the week strip.',
              'Turn on the **Skip Day** switch.',
            ],
          },
          {
            kind: 'p',
            text: 'The day stops accruing points and no routine is marked missed.',
          },
        ],
      },
      {
        id: 'limit',
        heading: 'The two-a-week limit',
        blocks: [
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Maximum two skip days per week',
            text: 'Try for a third and the app refuses with *You have already skip 2 days this week.* The cap is the point — a skip you can use every day is just a pause button on the whole idea.',
          },
        ],
      },
      {
        id: 'why',
        heading: 'Why not just miss the day?',
        blocks: [
          {
            kind: 'p',
            text: 'You can. The difference is what your history says afterwards. A missed day drags your [Routine Efficiency](/help/articles/progress-reports) down and reads as a failure when you look back. A skipped day reads as a day off. Honest data is worth more than a flattering streak — but it is also worth more than a punishing one.',
          },
        ],
      },
      {
        id: 'alternatives',
        heading: 'Alternatives',
        blocks: [
          {
            kind: 'list',
            items: [
              'Missed one routine, not the day? [Redeem it](/help/articles/redeem-a-missed-routine) with points instead.',
              'Is a routine consistently not happening? That is a design problem — change its time or points in [Routine Settings](/help/articles/create-and-edit-routines).',
            ],
          },
        ],
      },
    ],
    related: ['redeem-a-missed-routine', 'check-in-and-the-punctuality-window', 'progress-reports'],
  },
];
