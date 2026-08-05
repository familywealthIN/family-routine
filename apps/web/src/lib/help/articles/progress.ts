import type { HelpArticle } from '../types';

export const progressArticles: HelpArticle[] = [
  {
    slug: 'progress-reports',
    title: 'Progress reports',
    summary:
      'Read the Progress screen — efficiency, on-track, the radar chart, and what is going well or badly.',
    category: 'progress',
    subcategory: 'reports',
    updated: '2026-08-05',
    popular: true,
    keywords: ['progress', 'efficiency', 'on track', 'radar', 'report', 'stats', 'analytics'],
    intro:
      'The **Progress** screen is the weekly read-back: what your routines and goals actually did over a period, rather than what you intended.',
    sections: [
      {
        id: 'cards',
        heading: 'What is on the screen',
        blocks: [
          {
            kind: 'table',
            head: ['Card', 'Shows'],
            rows: [
              ['**Progress statement**', 'A written summary of the period.'],
              ['**Sparkline**', 'The shape of the period at a glance.'],
              ['**Radar chart**', 'Your balance across dimensions — where you are strong and where you are thin.'],
              ['**Efficiency**', 'The proportion of check-ins that landed on time.'],
              ['**On-track**', 'How well your goals are keeping to their dates.'],
              ['**Tasks completed**', 'Raw volume for the period.'],
              ['**Good / Bad**', 'Two tables naming what worked and what did not.'],
            ],
          },
          {
            kind: 'p',
            text: 'Switch the period to see the same cards for a day, week, month or year.',
          },
        ],
      },
      {
        id: 'efficiency',
        heading: 'Routine Efficiency',
        blocks: [
          {
            kind: 'p',
            text: '**Routine Efficiency** is the headline number: the percentage of routine check-ins that happened inside the [punctuality window](/help/articles/check-in-and-the-punctuality-window).',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'What counts against it',
            text: 'A missed routine lowers efficiency. A [skipped day](/help/articles/skip-day) does not — that is the entire point of Skip Day. A [redeemed](/help/articles/redeem-a-missed-routine) check-in still records that you were late.',
          },
        ],
      },
      {
        id: 'reading',
        heading: 'Reading it honestly',
        blocks: [
          {
            kind: 'p',
            text: 'Two patterns are worth looking for:',
          },
          {
            kind: 'list',
            items: [
              '**High efficiency, low on-track.** You are showing up but the work is not landing — your routines are fine, your goals are unrealistic.',
              '**Low efficiency, high volume.** You are getting a lot done at the wrong times. Usually a sign the routine times were set for a day you do not actually have.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            text: 'The most useful response to a bad week is almost never “try harder”. It is to re-time a routine, cut one, or lower what you committed to.',
          },
        ],
      },
    ],
    related: ['check-in-history', 'skip-day', 'projects-and-areas', 'how-points-work'],
  },

  {
    slug: 'check-in-history',
    title: 'Check-in history',
    summary: 'The day-by-day record of every routine you did and did not check in to.',
    category: 'progress',
    subcategory: 'reports',
    updated: '2026-08-05',
    keywords: ['history', 'past', 'record', 'log', 'streak', 'sparkline'],
    intro:
      '**History** is the raw record behind the Progress numbers — every day, every routine, checked in or not.',
    sections: [
      {
        id: 'open',
        heading: 'Open your history',
        blocks: [
          {
            kind: 'steps',
            items: ['Open **Progress** in the sidebar.', 'Select the history link.'],
          },
          {
            kind: 'p',
            text: 'The page leads with **Routine Efficiency** and a sparkline, then lists per-day check-in history beneath.',
          },
        ],
      },
      {
        id: 'members',
        heading: 'A group member’s history',
        blocks: [
          {
            kind: 'p',
            text: 'If you are in a [group](/help/articles/introduction-to-groups), selecting a member opens the same view for them — their day scores, not their goal contents.',
          },
        ],
      },
      {
        id: 'use',
        heading: 'What to use it for',
        blocks: [
          {
            kind: 'list',
            items: [
              'Spotting the one routine that is dragging the average down.',
              'Finding the day a habit actually broke, rather than when you noticed.',
              'Checking whether a change you made to a routine’s time worked.',
            ],
          },
        ],
      },
    ],
    related: ['progress-reports', 'introduction-to-groups', 'skip-day'],
  },

  {
    slug: 'projects-and-areas',
    title: 'Projects and Areas',
    summary: 'Group work across routines using `project:` and `area:` tags.',
    category: 'progress',
    subcategory: 'views',
    updated: '2026-08-05',
    keywords: ['project', 'area', 'tag', 'group by', 'sidebar', 'nesting'],
    intro:
      '**Projects** and **Areas** are views built from tags. Anything tagged `project:something` gets a Projects entry in the sidebar; anything tagged `area:something` gets an Areas entry.',
    sections: [
      {
        id: 'create',
        heading: 'Create a project or area',
        blocks: [
          {
            kind: 'p',
            text: 'There is no “new project” button — you create one by using the tag.',
          },
          {
            kind: 'steps',
            items: [
              'Open a routine in **Routine Settings**, or open a goal.',
              'Add a tag of the form `project:redesign` or `area:health`.',
              'Save. The entry appears in the sidebar.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Projects finish, areas do not',
            text: 'The usual split: a **project** has an end — a launch, a move, a certification. An **area** is a standing part of your life you maintain — health, finances, relationships. If you cannot say when it is done, it is an area.',
          },
        ],
      },
      {
        id: 'nesting',
        heading: 'Nested areas',
        blocks: [
          {
            kind: 'p',
            text: 'Areas support one level of nesting with a slash: `area:health/strength` and `area:health/sleep` both sit under **health** in the sidebar.',
          },
        ],
      },
      {
        id: 'screen',
        heading: 'What each screen shows',
        blocks: [
          {
            kind: 'list',
            items: [
              'An AI-written **Description** summarising what is in it.',
              '**Goal completion counts** per period.',
              'A **recent activity** timeline.',
              'A **Next Steps** card suggesting what to do next — see [Generate a milestone plan](/help/articles/generate-a-milestone-plan).',
            ],
          },
        ],
      },
    ],
    related: ['search-your-goals', 'generate-a-milestone-plan', 'progress-reports'],
  },
];
