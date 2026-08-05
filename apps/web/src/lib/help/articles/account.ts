import type { HelpArticle } from '../types';

export const accountArticles: HelpArticle[] = [
  {
    slug: 'profile-settings',
    title: 'Profile settings',
    summary: 'Time zone, 12- or 24-hour clock, and the reference values behind your scoring.',
    category: 'account',
    subcategory: 'profile',
    updated: '2026-08-05',
    keywords: ['profile', 'timezone', 'time format', '24 hour', 'settings', 'preferences'],
    intro:
      'Open **Settings → Profile Settings** for the handful of preferences that change how the app reads your day.',
    sections: [
      {
        id: 'timezone',
        heading: 'Time zone',
        blocks: [
          {
            kind: 'p',
            text: 'Your time zone decides when each routine’s [punctuality window](/help/articles/check-in-and-the-punctuality-window) opens and when your points [settle](/help/articles/settled-pending-and-available). Pick yours from the list.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Travelling',
            text: 'Routine Notes detects a time-zone change and offers to update your profile. Accept it and your routines follow you; decline and they stay on home time. Either is valid — a 06:30 routine on a two-day trip is usually better left on home time.',
          },
        ],
      },
      {
        id: 'format',
        heading: 'Time format',
        blocks: [
          {
            kind: 'p',
            text: 'Switch between **12-hour** and **24-hour** display. It affects presentation only.',
          },
        ],
      },
      {
        id: 'reference',
        heading: 'Scoring reference',
        blocks: [
          {
            kind: 'p',
            text: 'The page also displays, read-only, the numbers the app scores you against — your point rate and the **auto-check thresholds** for the [cascade](/help/articles/milestones-and-the-cascade): 5 days to a week, 3 weeks to a month, 6 months to a year.',
          },
        ],
      },
      {
        id: 'name',
        heading: 'Name and email',
        blocks: [
          {
            kind: 'p',
            text: 'Your name, email and picture come from the account you sign in with and are read-only here. To change them, change them with Google or Apple and sign in again.',
          },
        ],
      },
    ],
    related: ['notification-settings', 'connect-chatgpt-and-other-tools', 'delete-your-account'],
  },

  {
    slug: 'notification-settings',
    title: 'Notifications',
    summary: 'How routine reminders are delivered today, and what is still to come.',
    category: 'account',
    subcategory: 'profile',
    updated: '2026-08-05',
    keywords: ['notification', 'reminder', 'push', 'alert', 'coming soon'],
    intro:
      'Routine Notes sends push notifications when a routine’s window opens, plus periodic agenda and progress summaries.',
    sections: [
      {
        id: 'status',
        heading: 'Where the controls are',
        blocks: [
          {
            kind: 'callout',
            tone: 'warning',
            title: 'The in-app settings page is not finished',
            text: '**Settings → Notifications** currently shows *Coming soon*. Until it ships, notifications are controlled by your device’s permission for the app, not by a preference inside Routine Notes.',
          },
        ],
      },
      {
        id: 'enable',
        heading: 'Turn notifications on',
        blocks: [
          {
            kind: 'platformSteps',
            groups: [
              {
                platform: 'web',
                steps: [
                  'Allow notifications when the browser prompts on first use.',
                  'If you dismissed it, select the padlock in the address bar and set **Notifications** to Allow.',
                  'Keep the app installed as a PWA so notifications arrive without a tab open — see [Get the apps](/help/articles/get-the-apps).',
                ],
              },
              {
                platform: 'ios',
                steps: [
                  'Allow notifications when the app asks on first launch.',
                  'If you declined: open **Settings → Notifications → Routine Notes**.',
                  'Turn on **Allow Notifications**.',
                ],
              },
              {
                platform: 'android',
                steps: [
                  'Allow notifications when the app asks on first launch.',
                  'If you declined: open **Settings → Apps → Routine Notes → Notifications**.',
                  'Turn notifications on.',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'what',
        heading: 'What you receive',
        blocks: [
          {
            kind: 'list',
            items: [
              'A reminder when a routine’s punctuality window opens.',
              'A weekly agenda summary.',
              'Periodic progress summaries.',
            ],
          },
          {
            kind: 'p',
            text: 'Not getting them? See [Notifications are not arriving](/help/articles/notifications-are-not-arriving).',
          },
        ],
      },
    ],
    related: ['notifications-are-not-arriving', 'get-the-apps', 'profile-settings'],
  },

  {
    slug: 'connect-chatgpt-and-other-tools',
    title: 'Connect ChatGPT, n8n, Gemini and Perplexity',
    summary:
      'Use the built-in MCP server so an AI assistant can read and update your routines and goals.',
    category: 'account',
    subcategory: 'integrations',
    updated: '2026-08-05',
    popular: true,
    keywords: ['mcp', 'chatgpt', 'n8n', 'gemini', 'perplexity', 'oauth', 'integration', 'connect', 'api'],
    intro:
      'Routine Notes exposes an **MCP server**, so tools that speak Model Context Protocol — ChatGPT, n8n, Gemini, Perplexity — can read your goals and create new ones on your behalf, with your authorisation.',
    sections: [
      {
        id: 'credentials',
        heading: 'Find your credentials',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open **Settings → Profile Settings**.',
              'Scroll to the MCP section.',
              'Copy the **Server URL** and **Client ID**.',
              'Reveal and copy the **Client Secret**.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Treat the secret like a password',
            text: 'Anyone holding it can read and change your routines and goals. Do not paste it into a shared document, a support ticket or a screenshot.',
          },
        ],
      },
      {
        id: 'setup',
        heading: 'Connect a tool',
        blocks: [
          {
            kind: 'p',
            text: 'The same Profile Settings section has step-by-step tabs for each supported tool — **ChatGPT**, **n8n**, **Gemini** and **Perplexity**. The shape is the same everywhere:',
          },
          {
            kind: 'steps',
            items: [
              'In the other tool, add a new MCP or custom connector.',
              'Paste the **Server URL**.',
              'Choose OAuth 2.0 and paste the **Client ID** and **Client Secret**.',
              'Authorise — you will be asked to approve the connection.',
              'Confirm the tools appear on the other side.',
            ],
          },
        ],
      },
      {
        id: 'tools',
        heading: 'What a connected tool can do',
        blocks: [
          {
            kind: 'table',
            head: ['Capability', 'What it covers'],
            rows: [
              ['Read', 'Daily goals, your routine, progress, priority goals, goal search'],
              ['Create', 'Add a goal item, bulk-add goal items, extract a task from a sentence'],
              ['Update', 'Complete a goal item, reschedule a goal item'],
              ['Plan', 'Generate a milestone plan'],
              ['Query', 'Run a direct GraphQL query'],
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            text: 'Because a connected assistant can create and complete goals, ask it to *propose* rather than *apply* until you trust it. Points earned from goals an assistant closed on your behalf are not worth much.',
          },
        ],
      },
      {
        id: 'api-key',
        heading: 'Legacy API keys',
        blocks: [
          {
            kind: 'p',
            text: 'Profile Settings can also generate a plain **API key**. It predates the MCP integration and is kept for existing scripts — prefer OAuth for anything new. You can regenerate the key at any time, which immediately invalidates the old one.',
          },
        ],
      },
      {
        id: 'automation',
        heading: 'Automation without AI',
        blocks: [
          {
            kind: 'p',
            text: 'To fire a request when a routine starts or ends — no assistant involved — use an [agent](/help/articles/introduction-to-agents) instead.',
          },
        ],
      },
    ],
    related: ['introduction-to-agents', 'profile-settings', 'privacy-and-encryption'],
  },

  {
    slug: 'privacy-and-encryption',
    title: 'Privacy and encryption',
    summary: 'What Routine Notes stores, what is encrypted, and who can see your data.',
    category: 'account',
    subcategory: 'privacy',
    updated: '2026-08-05',
    keywords: ['privacy', 'encryption', 'security', 'data', 'gdpr', 'who can see'],
    intro:
      'Routine Notes holds a fairly intimate record — when you get up, what you are working on, what you keep failing to do. Here is what happens to it.',
    sections: [
      {
        id: 'encrypted',
        heading: 'What is encrypted',
        blocks: [
          {
            kind: 'p',
            text: 'Content you write is encrypted at rest with AES-256-GCM, per field. That covers:',
          },
          {
            kind: 'list',
            items: [
              'Your name.',
              'Goal bodies, contribution notes and rewards.',
              'Sub-tasks.',
              'Routine names, descriptions and steps.',
              'Agent event values — the URLs and cURL commands.',
            ],
          },
        ],
      },
      {
        id: 'stored',
        heading: 'What is stored about you',
        blocks: [
          {
            kind: 'p',
            text: 'From your sign-in provider: name, email address and profile picture, used to run your account. Alongside that, the app records your check-ins, goals, points ledger and usage analytics used to improve the product.',
          },
          {
            kind: 'p',
            text: 'The full policy is at [familywealth.in/privacy-policy](https://familywealth.in/privacy-policy).',
          },
        ],
      },
      {
        id: 'who-sees',
        heading: 'Who can see your data',
        blocks: [
          {
            kind: 'table',
            head: ['Who', 'Sees'],
            rows: [
              ['You', 'Everything.'],
              ['[Group](/help/articles/introduction-to-groups) members', 'Your day scores and check-in history. **Not** your goal text, notes or rewards.'],
              ['A [connected AI tool](/help/articles/connect-chatgpt-and-other-tools)', 'Whatever you authorised it to read — treat this as full access.'],
              ['AI providers', 'The prompt and context you send when using an AI feature.'],
            ],
          },
        ],
      },
      {
        id: 'control',
        heading: 'Staying in control',
        blocks: [
          {
            kind: 'list',
            items: [
              '[Leave a group](/help/articles/leave-a-group) to stop sharing scores.',
              'Regenerate your API key in Profile Settings to cut off anything holding the old one.',
              'Skip the AI features entirely — nothing in the app requires them.',
              '[Delete your account](/help/articles/delete-your-account) to remove your data.',
            ],
          },
        ],
      },
    ],
    related: ['delete-your-account', 'connect-chatgpt-and-other-tools', 'introduction-to-groups'],
  },

  {
    slug: 'delete-your-account',
    title: 'Delete your account',
    summary: 'Permanently remove your account and everything in it.',
    category: 'account',
    subcategory: 'privacy',
    updated: '2026-08-05',
    keywords: ['delete', 'remove account', 'close account', 'erase', 'wipe', 'gdpr'],
    intro:
      'You can delete your Routine Notes account yourself, from inside the app. It is immediate and it cannot be undone.',
    sections: [
      {
        id: 'delete',
        heading: 'Delete',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open **Settings → Profile Settings**.',
              'Scroll to the danger zone at the bottom.',
              'Select **Delete Account**.',
              'Type `DELETE` to confirm.',
              'Confirm.',
            ],
          },
        ],
      },
      {
        id: 'removed',
        heading: 'What is removed',
        blocks: [
          {
            kind: 'list',
            items: [
              'All routines and routine items.',
              'All goals, milestones, sub-tasks, contribution notes and rewards.',
              'Your progress and check-in history.',
              'Your settings and preferences.',
              'Your API keys and integration credentials.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'There is no export and no undo',
            text: 'Routine Notes cannot restore a deleted account, and there is no export to take with you. If any of your notes matter, copy them out **before** you delete.',
          },
        ],
      },
      {
        id: 'alternatives',
        heading: 'Before you delete',
        blocks: [
          {
            kind: 'p',
            text: 'If the problem is smaller than the whole account, there is probably a smaller fix:',
          },
          {
            kind: 'table',
            head: ['If…', 'Try'],
            rows: [
              ['You need a break', '[Skip Day](/help/articles/skip-day), or simply stop opening it — nothing is lost.'],
              ['It is too demanding', 'Cut down to two or three routines and lower their points.'],
              ['You do not want to share', '[Leave your group](/help/articles/leave-a-group).'],
              ['You are worried about an integration', 'Regenerate your API key in Profile Settings.'],
            ],
          },
          {
            kind: 'p',
            text: 'Deleting also removes you from any group. Members are not notified individually.',
          },
        ],
      },
    ],
    related: ['privacy-and-encryption', 'leave-a-group', 'skip-day'],
  },
];
