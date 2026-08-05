import type { HelpArticle } from '../types';

export const aiArticles: HelpArticle[] = [
  {
    slug: 'ai-search',
    title: 'AI search',
    summary:
      'Write a task in plain language and let Routine Notes fill in the period, routine, tags and parent goal.',
    category: 'ai',
    subcategory: 'search',
    updated: '2026-08-05',
    popular: true,
    keywords: ['ai', 'search', 'natural language', 'quick add', 'assistant', 'prompt'],
    intro:
      'The search box in the toolbar — *Build your routine goals with AI* — is the main entry point to everything AI in Routine Notes. It has three modes, and only one of them actually searches.',
    sections: [
      {
        id: 'modes',
        heading: 'The three modes',
        blocks: [
          {
            kind: 'table',
            head: ['Mode', 'What it does'],
            rows: [
              ['**Task**', 'Turns what you typed into a single day task, filling in title, description, tags, due date and priority.'],
              ['**Goal**', 'Turns what you typed into a goal at the period you choose, and can generate a whole [milestone plan](/help/articles/generate-a-milestone-plan).'],
              ['**Search**', 'Searches your existing goals — see [Search your goals](/help/articles/search-your-goals).'],
            ],
          },
        ],
      },
      {
        id: 'task-mode',
        heading: 'Create a task from a sentence',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open the search box, or select **+** on Home.',
              'Set the mode toggle to **Task**.',
              'Type it as you would say it — “draft the Q3 summary before Friday’s review”.',
              'Adjust the period, date, routine or parent goal in the toolbar underneath.',
              'Review what came back and save.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Context chips',
            text: 'The prompt box accepts context tags with autocomplete. Referencing an existing routine or project by name gives noticeably better results than describing it.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            text: 'Always read what the AI produced before saving — especially the **date**. A misread deadline is a missed goal.',
          },
        ],
      },
      {
        id: 'settings',
        heading: 'Per-routine AI settings',
        blocks: [
          {
            kind: 'p',
            text: 'Three toggles control how much the AI does. They are remembered **per routine**, so your work block can behave differently from your evening one.',
          },
          {
            kind: 'terms',
            items: [
              {
                term: 'AI Enhanced Task',
                def: 'Expands what you typed into a fuller task with a description, rather than storing the raw sentence.',
              },
              {
                term: 'Associate Parent Goal',
                def: 'Looks for an existing goal one period up and links the new task to it as a milestone.',
              },
              {
                term: 'Build on Next Steps',
                def: 'Uses the AI-generated next steps for that routine as context, so new tasks continue the thread instead of starting cold.',
              },
            ],
          },
        ],
      },
      {
        id: 'privacy',
        heading: 'What gets sent',
        blocks: [
          {
            kind: 'p',
            text: 'AI features send your prompt and the relevant context — the routine, tags and related goals — to a language model provider to generate a response. Your stored content stays [encrypted at rest](/help/articles/privacy-and-encryption). If you would rather not use AI, everything in Routine Notes can be created by hand.',
          },
        ],
      },
    ],
    related: ['generate-a-milestone-plan', 'search-your-goals', 'introduction-to-goals', 'privacy-and-encryption'],
  },

  {
    slug: 'generate-a-milestone-plan',
    title: 'Generate a milestone plan',
    summary: 'Turn one big goal into a set of linked milestones you can review and save.',
    category: 'ai',
    subcategory: 'planning',
    updated: '2026-08-05',
    keywords: ['plan', 'milestone plan', 'generate', 'breakdown', 'bulk add', 'ai'],
    intro:
      'Breaking a year goal into months, or a month into weeks, is the part people skip. **Generate a milestone plan** does the first draft for you — you edit it and decide what to keep.',
    sections: [
      {
        id: 'generate',
        heading: 'Generate a plan',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open the AI search box and set the mode to **Goal**.',
              'Choose the **period** you are planning at — month, week and so on.',
              'Describe the outcome: “ship the redesign by the end of Q4”.',
              'Generate. You get a plan with a title, a description and a set of entries.',
              'Review and edit the entries — delete anything that is not real.',
              'Save. The entries are created as linked goals in one go.',
            ],
          },
        ],
      },
      {
        id: 'review',
        heading: 'Review before you save',
        blocks: [
          {
            kind: 'callout',
            tone: 'warning',
            title: 'A generated plan is a draft',
            text: 'The model does not know your calendar, your capacity or what is already in flight. Expect to cut roughly half of what it proposes. A plan you did not edit is a plan you will not follow.',
          },
          {
            kind: 'p',
            text: 'Two things worth checking every time: the **dates** are ones you could actually hit, and the **parent links** are set so the plan feeds the [cascade](/help/articles/milestones-and-the-cascade).',
          },
        ],
      },
      {
        id: 'next-steps',
        heading: 'Next steps and descriptions',
        blocks: [
          {
            kind: 'p',
            text: 'Two more AI-written cards appear on the [Projects and Areas](/help/articles/projects-and-areas) screens:',
          },
          {
            kind: 'list',
            items: [
              '**Description** — a summary of what the project or area currently contains.',
              '**Next Steps** — suggested follow-on work, based on what you have completed.',
            ],
          },
          {
            kind: 'p',
            text: 'Turn on **Build on Next Steps** in the [AI settings](/help/articles/ai-search) to have new tasks continue from these.',
          },
        ],
      },
    ],
    related: ['ai-search', 'milestones-and-the-cascade', 'year-goals', 'projects-and-areas'],
  },
];
