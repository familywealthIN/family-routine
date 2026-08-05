import type { HelpArticle } from '../types';

export const priorityArticles: HelpArticle[] = [
  {
    slug: 'the-priority-matrix',
    title: 'The priority matrix',
    summary:
      'The Do / Plan / Delegate / Automate view, and what each quadrant is for.',
    category: 'priority',
    subcategory: 'matrix',
    updated: '2026-08-05',
    popular: true,
    keywords: ['priority', 'matrix', 'do', 'plan', 'delegate', 'automate', 'quadrant', 'eisenhower'],
    intro:
      'The **Priority** screen sorts your open goals into four quadrants — **Do**, **Plan**, **Delegate** and **Automate**. It is a different cut of the same goals you see everywhere else, arranged by what you should do with them rather than when they are due.',
    sections: [
      {
        id: 'quadrants',
        heading: 'The four quadrants',
        blocks: [
          {
            kind: 'table',
            head: ['Quadrant', 'Colour', 'Holds'],
            rows: [
              ['**Do**', 'Red', 'Day goals due now. Work these.'],
              ['**Plan**', 'Blue', 'Anything dated in the future, or at a period above day.'],
              ['**Delegate**', 'Orange', 'Anything with an `@mention` in its text — work that belongs to someone else.'],
              ['**Automate**', 'Grey', 'Anything started by an [agent](/help/articles/introduction-to-agents).'],
            ],
          },
          {
            kind: 'p',
            text: 'Each quadrant has a count card at the top of the screen, so you can see the shape of your load before reading a single task.',
          },
        ],
      },
      {
        id: 'derived',
        heading: 'Quadrants are derived, not chosen',
        blocks: [
          {
            kind: 'callout',
            tone: 'note',
            title: 'There is no “set priority” control',
            text: 'You cannot drag a task between quadrants. Routine Notes works out the quadrant from the task itself, so the matrix always reflects reality rather than what you wished you had labelled it.',
          },
          {
            kind: 'p',
            text: 'The rules are applied in this order:',
          },
          {
            kind: 'steps',
            items: [
              'Is it dated in the future, or at a period above **day**? → **Plan**.',
              'Was it started by an agent? → **Automate**.',
              'Does its text contain an `@mention`? → **Delegate**, tagged with the assignee.',
              'Otherwise → **Do**.',
            ],
          },
        ],
      },
      {
        id: 'move',
        heading: 'Moving a task between quadrants',
        blocks: [
          {
            kind: 'p',
            text: 'Change the thing the rule looks at:',
          },
          {
            kind: 'table',
            head: ['To move it to…', 'Do this'],
            rows: [
              ['**Plan**', 'Push its date into the future, or raise it to a week/month period.'],
              ['**Do**', 'Bring its date to today and make it a day goal.'],
              ['**Delegate**', 'Add `@name` to the goal text.'],
              ['**Automate**', 'Attach and start an [agent](/help/articles/create-an-agent) on its routine.'],
            ],
          },
        ],
      },
      {
        id: 'working',
        heading: 'Working from the matrix',
        blocks: [
          {
            kind: 'list',
            items: [
              'Tick a task in place to complete it without leaving the screen.',
              'Select a task to open the full goal editor.',
              'Use refresh after changing dates elsewhere, to re-derive the quadrants.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'A fat Do column is the warning sign',
            text: 'If **Do** is overflowing, the problem happened at planning time. Push what is genuinely not today into **Plan** by re-dating it, rather than working a list you cannot finish.',
          },
        ],
      },
    ],
    related: ['introduction-to-goals', 'task-statuses', 'introduction-to-agents'],
  },
];
