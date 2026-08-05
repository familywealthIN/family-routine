import type { HelpArticle } from '../types';

export const agentArticles: HelpArticle[] = [
  {
    slug: 'introduction-to-agents',
    title: 'Introduction to agents',
    summary:
      'Fire a webhook or a cURL request automatically when a routine starts or ends.',
    category: 'agents',
    subcategory: 'basics',
    updated: '2026-08-05',
    popular: true,
    keywords: ['agent', 'automation', 'webhook', 'trigger', 'integration', 'curl'],
    intro:
      'An **agent** is an automation bound to a routine. When that routine starts or ends, the agent fires a request you have configured — a URL to open, or a cURL command to run. It is the bridge between your routine and everything outside Routine Notes.',
    sections: [
      {
        id: 'what-for',
        heading: 'What agents are for',
        blocks: [
          {
            kind: 'list',
            items: [
              'Kick off a build, a backup or a script when your work block begins.',
              'Post to a chat channel when your focus block ends.',
              'Trigger an automation platform — n8n, Zapier, Make — from a routine.',
              'Pull a daily briefing so it is waiting when the routine opens.',
            ],
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'One agent per routine',
            text: 'An agent is bound to exactly one routine item, and a routine can have one agent. To automate two things from the same block, have the agent call something that fans out.',
          },
        ],
      },
      {
        id: 'events',
        heading: 'Start and end events',
        blocks: [
          {
            kind: 'p',
            text: 'An agent has a **start event** and an **end event**, each independently configurable. Two kinds are available in the app:',
          },
          {
            kind: 'table',
            head: ['Kind', 'What it does'],
            rows: [
              ['**URL (GET)**', 'Sends a GET request to the address you give.'],
              ['**cURL command**', 'Runs a cURL command — use this when you need a POST, headers, or a body.'],
            ],
          },
          {
            kind: 'p',
            text: 'Both support the placeholder `{{ goal_id }}`, replaced at fire time with the id of the goal that triggered the agent.',
          },
        ],
      },
      {
        id: 'fires',
        heading: 'When an agent fires',
        blocks: [
          {
            kind: 'list',
            items: [
              'When you **Start Task** or **Start Agent** on the routine.',
              'When the routine is checked in — including a [redeemed](/help/articles/redeem-a-missed-routine) late check-in.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Agents act on the internet',
            text: 'An agent fires a real request against a real service. Point it at something idempotent where you can — a routine you redeem after checking in twice should not double-charge anything.',
          },
        ],
      },
    ],
    related: ['create-an-agent', 'agent-statuses-and-results', 'the-priority-matrix'],
  },

  {
    slug: 'create-an-agent',
    title: 'Create, edit and delete an agent',
    summary: 'Bind an automation to a routine and configure what it fires.',
    category: 'agents',
    subcategory: 'basics',
    updated: '2026-08-05',
    keywords: ['create agent', 'add agent', 'build agent', 'edit', 'delete', 'webhook url'],
    intro:
      'Agents are managed on the **Agents** screen, and can also be created inline from a quick task.',
    sections: [
      {
        id: 'create',
        heading: 'Create an agent',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open **Agents** in the sidebar.',
              'Select **Add**.',
              'Give the agent a **name**.',
              'Choose the **routine** it is bound to.',
              'Set the **start event** — pick **URL (GET)** or **cURL command** and fill in the value.',
              'Set the **end event** the same way, if you want one.',
              'Save.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'The shortcut',
            text: 'From a [quick task](/help/articles/quick-tasks), **Build Agent** creates an agent for that routine without leaving the modal.',
          },
        ],
      },
      {
        id: 'placeholder',
        heading: 'Using {{ goal_id }}',
        blocks: [
          {
            kind: 'p',
            text: 'Anywhere in a URL or cURL command, `{{ goal_id }}` is replaced with the id of the triggering goal. That lets the receiving service tie the call back to a specific task:',
          },
          {
            kind: 'list',
            items: [
              '`https://example.com/hooks/start?goal={{ goal_id }}`',
              '`curl -X POST https://example.com/log -d \'{"goal":"{{ goal_id }}"}\'`',
            ],
          },
        ],
      },
      {
        id: 'edit',
        heading: 'Edit an agent',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open **Agents** and select the agent in the table.',
              'Change its name, routine or events.',
              'Save.',
            ],
          },
          {
            kind: 'p',
            text: 'From **Routine Settings** you can also jump straight to the agent attached to a routine.',
          },
        ],
      },
      {
        id: 'delete',
        heading: 'Delete an agent',
        blocks: [
          {
            kind: 'steps',
            items: ['Open **Agents**.', 'Select delete on the agent’s row.', 'Confirm.'],
          },
          {
            kind: 'callout',
            tone: 'note',
            text: 'Deleting an agent stops its start and end events firing. **The routine itself stays** — only the automation is removed.',
          },
        ],
      },
    ],
    related: ['introduction-to-agents', 'agent-statuses-and-results', 'quick-tasks'],
  },

  {
    slug: 'agent-statuses-and-results',
    title: 'Agent statuses and results',
    summary: 'Read the Agents table, and see what an agent returned or why it failed.',
    category: 'agents',
    subcategory: 'running',
    updated: '2026-08-05',
    keywords: ['status', 'idle', 'running', 'listening', 'failed', 'success count', 'result', 'error'],
    intro:
      'The **Agents** screen is both a list and a dashboard. Four counters sit above a table of every agent you have.',
    sections: [
      {
        id: 'counters',
        heading: 'The counters',
        blocks: [
          {
            kind: 'table',
            head: ['Counter', 'Means'],
            rows: [
              ['**Agents**', 'How many you have configured.'],
              ['**Active**', 'How many are currently *running* or *listening*.'],
              ['**Success**', 'Total successful executions.'],
              ['**Failures**', 'Total failed executions.'],
            ],
          },
        ],
      },
      {
        id: 'statuses',
        heading: 'The five statuses',
        blocks: [
          {
            kind: 'terms',
            items: [
              { term: 'idle', def: 'Configured but not currently doing anything. The normal resting state.' },
              { term: 'running', def: 'Executing right now.' },
              { term: 'listening', def: 'Started, waiting for its end event.' },
              { term: 'finished', def: 'Completed its last run successfully.' },
              { term: 'failed', def: 'The last run errored. Check the result for the reason.' },
            ],
          },
        ],
      },
      {
        id: 'results',
        heading: 'Seeing what came back',
        blocks: [
          {
            kind: 'p',
            text: 'Select an agent that has run and the **result modal** opens, showing the response the agent received, titled with the agent’s name. If the run failed, the error is shown instead.',
          },
          {
            kind: 'p',
            text: 'The table also tracks per-agent **success** and **failure** counts and the time of the last run — a slowly climbing failure count is usually a URL that has moved or a credential that has expired.',
          },
        ],
      },
      {
        id: 'debug',
        heading: 'If an agent keeps failing',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open the agent and read the last error in the result modal.',
              'Run the same URL or cURL command yourself, outside Routine Notes, and confirm it works.',
              'Check anything time-limited — tokens, signed URLs, API keys.',
              'If it uses `{{ goal_id }}`, confirm the receiving service tolerates the id format.',
              'Re-save the agent to reset it, then fire it from **Start Agent** on the routine.',
            ],
          },
        ],
      },
    ],
    related: ['create-an-agent', 'introduction-to-agents', 'connect-chatgpt-and-other-tools'],
  },
];
