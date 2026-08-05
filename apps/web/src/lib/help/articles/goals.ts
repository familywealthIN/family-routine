import type { HelpArticle } from '../types';

export const goalArticles: HelpArticle[] = [
  {
    slug: 'introduction-to-goals',
    title: 'Introduction to goals',
    summary:
      'The five goal periods, what a goal holds, and how to create your first one.',
    category: 'goals',
    subcategory: 'basics',
    updated: '2026-08-05',
    popular: true,
    keywords: ['goal', 'task', 'day goal', 'week goal', 'add goal', 'period'],
    intro:
      'A **goal** is anything you plan or do. Every goal sits at one of five periods — **day**, **week**, **month**, **year** or **lifetime** — and the whole system is built on smaller periods feeding larger ones.',
    sections: [
      {
        id: 'periods',
        heading: 'The five periods',
        blocks: [
          {
            kind: 'table',
            head: ['Period', 'Typical use', 'Where you see it'],
            rows: [
              ['**Day**', 'What you will actually do today', 'Home, and the Goals calendar'],
              ['**Week**', 'The handful of outcomes that make the week count', 'Goals → period accordions'],
              ['**Month**', 'A theme or deliverable', 'Goals → period accordions'],
              ['**Year**', 'The big ones', 'The dedicated **Year goals** screen'],
              ['**Lifetime**', 'Direction, not deadline', 'Milestones'],
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Plan downwards, work upwards',
            text: 'The app nudges you with *It’s better to set Month and Weekly goals first to better guide daily milestones.* It is right. A day goal with no parent earns fewer Geniuses points and tells you nothing about whether the week is on track.',
          },
        ],
      },
      {
        id: 'fields',
        heading: 'What a goal holds',
        blocks: [
          {
            kind: 'table',
            head: ['Field', 'What it is for'],
            rows: [
              ['**Body**', 'The goal itself. The input is labelled *Type your task*.'],
              ['**Period + date**', 'Which horizon it belongs to, and when.'],
              ['**Routine Task**', 'The routine this goal is worked on during.'],
              ['**Goal Task**', 'The parent goal one period up — this is what makes it a [milestone](/help/articles/milestones-and-the-cascade).'],
              ['**Tags**', 'Labels, including `project:` and `area:` prefixes.'],
              ['**Contribution**', 'Markdown notes. Auto-saves as you type.'],
              ['**Reward**', 'What you have promised yourself for finishing.'],
              ['**Sub-tasks**', 'A checklist. Day goals only.'],
            ],
          },
        ],
      },
      {
        id: 'create',
        heading: 'Create a goal',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open **Goals** in the sidebar, or select **+** on Home.',
              'Choose the **period** and the date.',
              'Type the goal into *Type your task*.',
              'Pick the **Routine Task** it will be worked on during.',
              'Pick a **Goal Task** — the parent one period up — if it is a milestone.',
              'Save.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            text: 'You can also describe the goal in plain language and let the app fill in the fields — see [AI search](/help/articles/ai-search).',
          },
        ],
      },
      {
        id: 'complete',
        heading: 'Complete a goal',
        blocks: [
          {
            kind: 'p',
            text: 'Tick the goal from Home, from the **Goals** screen, or from the [Priority matrix](/help/articles/the-priority-matrix). Completing a goal earns Kinetics, and earns Geniuses in proportion to its period — see [How points work](/help/articles/how-points-work).',
          },
        ],
      },
    ],
    related: [
      'milestones-and-the-cascade',
      'sub-tasks',
      'task-statuses',
      'year-goals',
    ],
  },

  {
    slug: 'milestones-and-the-cascade',
    title: 'Milestones and the auto-complete cascade',
    summary:
      'Link a goal to its parent so that finishing enough small ones closes the big one automatically.',
    category: 'goals',
    subcategory: 'cascade',
    updated: '2026-08-05',
    popular: true,
    keywords: ['milestone', 'cascade', 'auto complete', 'parent goal', 'rollup', 'threshold'],
    intro:
      'A **milestone** is a goal that is linked to a parent goal one period up. Milestones are what make Routine Notes more than a dated list: complete enough of them and the parent completes itself.',
    sections: [
      {
        id: 'thresholds',
        heading: 'The thresholds',
        blocks: [
          {
            kind: 'table',
            head: ['Complete this many…', '…and this closes'],
            rows: [
              ['**5** day goals', 'Their parent **week** goal'],
              ['**3** week goals', 'Their parent **month** goal'],
              ['**6** month goals', 'Their parent **year** goal'],
            ],
          },
          {
            kind: 'p',
            text: 'The numbers are deliberately less than the period contains. Five days, not seven; three weeks, not four; six months, not twelve. You are not expected to be perfect — you are expected to be present most of the time.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Six months, not nine',
            text: 'Some older explainer copy in and around the app says nine months close a year. The app’s actual threshold is **six** — that is what **Profile Settings** shows and what the cascade applies.',
          },
        ],
      },
      {
        id: 'make',
        heading: 'Make a goal a milestone',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Create or open the goal.',
              'Set **Goal Task** to the parent goal one period up.',
              'Save.',
            ],
          },
          {
            kind: 'p',
            text: 'The goal now counts towards its parent, and the parent shows its progress. The parent must be exactly one period up — a day goal links to a week goal, not straight to a year goal.',
          },
        ],
      },
      {
        id: 'reading',
        heading: 'Reading the cascade',
        blocks: [
          {
            kind: 'list',
            items: [
              'The **Year goals** screen shows the full tree — year → month → week → day — with a progress donut and the auto-complete rules in a legend.',
              'The **Goals** screen groups by period in accordions, with a month calendar showing how many goals sit on each day.',
              'The **Week Goal Streak** card shows five check dots — the five day goals that will close the week.',
            ],
          },
        ],
      },
      {
        id: 'why',
        heading: 'Why bother linking?',
        blocks: [
          {
            kind: 'p',
            text: 'Two reasons. First, points: a completed goal earns Geniuses in proportion to its period, and unlinked day goals are the cheapest thing in the system. Second, honesty — an unlinked day goal cannot tell you whether a productive-feeling week actually moved anything.',
          },
        ],
      },
    ],
    related: ['introduction-to-goals', 'year-goals', 'how-points-work', 'geniuses-points'],
  },

  {
    slug: 'year-goals',
    title: 'Year goals',
    summary: 'The tree view for your biggest goals, and how to break one down.',
    category: 'goals',
    subcategory: 'cascade',
    updated: '2026-08-05',
    keywords: ['year goal', 'tree', 'breakdown', 'donut', 'annual'],
    intro:
      'Year goals get their own screen because they are the only goals big enough to need breaking down more than once. The screen shows the whole tree from year down to day.',
    sections: [
      {
        id: 'screen',
        heading: 'What is on the screen',
        blocks: [
          {
            kind: 'list',
            items: [
              'A **progress donut** for the year goal.',
              'A markdown **description** — room for the why, not just the what.',
              'The nested tree: **month → week → day** goals beneath it.',
              'An **add** control at every level.',
              'A legend restating the [auto-complete rules](/help/articles/milestones-and-the-cascade).',
            ],
          },
        ],
      },
      {
        id: 'breakdown',
        heading: 'Break a year goal down',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open **Goals → Year goals** and select the year goal.',
              'Add the **month goals** that would add up to it — six is enough to close the year.',
              'Open a month goal and add its **week goals** — three closes the month.',
              'Open a week goal and add **day goals** — five closes the week.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Do not build the whole tree at once',
            text: 'Six months of week goals is a planning exercise, not progress. Break down the current month properly and leave the rest as month goals until you get there.',
          },
        ],
      },
    ],
    related: ['milestones-and-the-cascade', 'introduction-to-goals', 'progress-reports'],
  },

  {
    slug: 'sub-tasks',
    title: 'Sub-tasks',
    summary: 'Add a checklist inside a day goal and tick items off as you go.',
    category: 'goals',
    subcategory: 'basics',
    updated: '2026-08-05',
    keywords: ['sub task', 'subtask', 'checklist', 'break down'],
    intro:
      '**Sub-tasks** are checklist items inside a single day goal. Unlike [routine steps](/help/articles/routine-steps), their tick state is saved — so they are the right tool when you need a record of what you got through.',
    sections: [
      {
        id: 'add',
        heading: 'Add sub-tasks',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open a **day** goal.',
              'In the **Sub tasks** section, type into *Type your sub task*.',
              'Confirm to add it, and repeat.',
            ],
          },
          {
            kind: 'callout',
            tone: 'note',
            text: 'Sub-tasks are available on day goals only. A week, month or year goal is broken down with [milestones](/help/articles/milestones-and-the-cascade) instead.',
          },
        ],
      },
      {
        id: 'work',
        heading: 'Tick, edit and delete',
        blocks: [
          {
            kind: 'list',
            items: [
              'Tick a sub-task to mark it complete — this is saved and survives a reload.',
              'Select the text to edit it.',
              'Use the delete control on the row to remove it.',
            ],
          },
          {
            kind: 'p',
            text: 'Ticking every sub-task does not automatically complete the parent goal. Complete the goal itself when it is genuinely done.',
          },
        ],
      },
    ],
    related: ['introduction-to-goals', 'routine-steps', 'milestones-and-the-cascade'],
  },

  {
    slug: 'contribution-notes-and-rewards',
    title: 'Contribution notes and rewards',
    summary: 'The auto-saving markdown notes field on every goal, and the reward you set yourself.',
    category: 'goals',
    subcategory: 'basics',
    updated: '2026-08-05',
    keywords: ['contribution', 'notes', 'markdown', 'reward', 'autosave', 'journal'],
    intro:
      'Every goal has a **Contribution** field — free-form markdown notes that save themselves as you type — and a **Reward** field for what you have promised yourself when it is done.',
    sections: [
      {
        id: 'contribution',
        heading: 'Contribution',
        blocks: [
          {
            kind: 'p',
            text: 'Open any goal and write in the Contribution editor. It supports markdown — headings, lists, bold, links, code. It saves on its own, showing *Auto-saving…*, then *Saved*, and *Unsaved changes* if a save has not gone through yet.',
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Use it as a work log',
            text: 'The most useful thing to put here is what you actually did and what got in the way. When a goal drags across a fortnight, that log is the only record of why.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            text: 'If you close the app while it still reads *Unsaved changes*, the last few keystrokes may not have reached the server. Wait for *Saved* on anything you would hate to retype.',
          },
        ],
      },
      {
        id: 'reward',
        heading: 'Reward',
        blocks: [
          {
            kind: 'p',
            text: 'The **Reward** field is a plain text promise — “long lunch”, “buy the lens”. Routine Notes stores and shows it; it does not enforce it and it is unrelated to [points](/help/articles/how-points-work). It exists because a goal with something waiting at the end gets finished more often than one without.',
          },
        ],
      },
    ],
    related: ['introduction-to-goals', 'how-points-work', 'search-your-goals'],
  },

  {
    slug: 'task-statuses',
    title: 'Task statuses',
    summary: 'What To Do, In Progress, Done, Missed and Rescheduled mean.',
    category: 'goals',
    subcategory: 'organising',
    updated: '2026-08-05',
    keywords: ['status', 'todo', 'in progress', 'done', 'missed', 'rescheduled', 'colour'],
    intro:
      'Every goal carries a status. Most of the time it is set for you by what you do — you rarely need to set one by hand.',
    sections: [
      {
        id: 'statuses',
        heading: 'The five statuses',
        blocks: [
          {
            kind: 'table',
            head: ['Status', 'Colour', 'Means'],
            rows: [
              ['**To Do**', 'Blue', 'Created, not started.'],
              ['**In Progress**', 'Orange', 'Started — marked ready, or being worked in its routine.'],
              ['**Done**', 'Green', 'Completed.'],
              ['**Missed**', 'Red', 'Its date passed without completion.'],
              ['**Rescheduled**', 'Purple', 'Moved to a later date. The original date is kept.'],
            ],
          },
        ],
      },
      {
        id: 'reschedule',
        heading: 'Reschedule a goal',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open the goal.',
              'Change its date to the new one.',
              'Save — the status becomes **Rescheduled**.',
            ],
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Rescheduling is recorded, not hidden',
            text: 'The goal keeps its original date alongside the new one. A goal you have pushed five times looks different from one you planned properly — that is the information you want.',
          },
        ],
      },
    ],
    related: ['introduction-to-goals', 'the-priority-matrix', 'progress-reports'],
  },

  {
    slug: 'search-your-goals',
    title: 'Search your goals',
    summary: 'Find any goal by text, and filter by routine or tag.',
    category: 'goals',
    subcategory: 'organising',
    updated: '2026-08-05',
    keywords: ['search', 'find', 'filter', 'tags', 'lookup'],
    intro:
      'Once you have a few months of history, search is the fastest route back to a goal — including the ones you finished long ago.',
    sections: [
      {
        id: 'search',
        heading: 'Run a search',
        blocks: [
          {
            kind: 'platformSteps',
            groups: [
              {
                platform: 'web',
                steps: [
                  'Select the search box in the toolbar.',
                  'Switch the mode toggle to **Search**.',
                  'Type any part of the goal text.',
                  'Narrow with the **Routine** and **Tags** filters.',
                  'Select a result to open it in the goal editor.',
                ],
              },
              {
                platform: 'ios',
                steps: [
                  'Tap the search icon in the toolbar.',
                  'Switch the mode toggle to **Search**.',
                  'Type any part of the goal text.',
                  'Narrow with the **Routine** and **Tags** filters.',
                  'Tap a result to open it.',
                ],
              },
              {
                platform: 'android',
                steps: [
                  'Tap the search icon in the toolbar.',
                  'Switch the mode toggle to **Search**.',
                  'Type any part of the goal text.',
                  'Narrow with the **Routine** and **Tags** filters.',
                  'Tap a result to open it.',
                ],
              },
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            text: 'The same box also creates things. Leave the toggle on **Task** or **Goal** and it writes instead of searching — see [AI search](/help/articles/ai-search).',
          },
        ],
      },
      {
        id: 'tags',
        heading: 'Searching with tags',
        blocks: [
          {
            kind: 'p',
            text: 'Tags are the main organising tool. Two prefixes are special:',
          },
          {
            kind: 'list',
            items: [
              '`project:` — the tag becomes a **Project** in the sidebar.',
              '`area:` — the tag becomes an **Area**, and supports nesting with `area:main/sub`.',
            ],
          },
          {
            kind: 'p',
            text: 'See [Projects and Areas](/help/articles/projects-and-areas).',
          },
        ],
      },
    ],
    related: ['ai-search', 'projects-and-areas', 'introduction-to-goals'],
  },
];
