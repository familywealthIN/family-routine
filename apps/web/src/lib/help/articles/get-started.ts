import type { HelpArticle } from '../types';

export const getStartedArticles: HelpArticle[] = [
  {
    slug: 'what-is-routine-notes',
    title: 'What is Routine Notes?',
    summary:
      'An overview of how routines, goals and points fit together, and what makes Routine Notes different from a to-do list.',
    category: 'get-started',
    subcategory: 'basics',
    updated: '2026-08-05',
    popular: true,
    keywords: ['overview', 'introduction', 'kdg', 'evolution'],
    intro:
      'Routine Notes is a productivity and habit-tracking app for people who want their day to have a shape. Instead of one long list, you build a small set of time-boxed **routines**, hang **goals** off them, and earn **points** for showing up on time.',
    sections: [
      {
        id: 'the-idea',
        heading: 'The idea in one minute',
        blocks: [
          {
            kind: 'p',
            text: 'Most task apps measure output — how many boxes you ticked. Routine Notes measures something harder to fake: whether you did the thing *when you said you would*, and whether today’s work actually rolled up into something bigger.',
          },
          {
            kind: 'p',
            text: 'That produces three moving parts, and almost everything in the app is one of them:',
          },
          {
            kind: 'terms',
            items: [
              {
                term: 'Routines',
                def: 'Named, time-boxed blocks of your day — “Morning workout, 06:30”. You check in when the block comes around.',
              },
              {
                term: 'Goals',
                def: 'What you want to get done, at five time horizons: day, week, month, year and lifetime. Day goals feed week goals, week goals feed month goals, and so on.',
              },
              {
                term: 'Points',
                def: 'What you earn for checking in on time and clearing goals. Points are also the currency you spend to rescue a routine you missed.',
              },
            ],
          },
        ],
      },
      {
        id: 'kdg',
        heading: 'Discipline, Kinetics and Geniuses',
        blocks: [
          {
            kind: 'p',
            text: 'Points come in three flavours — collectively the **KDG framework**. Each is capped at 100 a day, so the most you can earn in a day is 300.',
          },
          {
            kind: 'table',
            head: ['Stimulus', 'You earn it by', 'What it measures'],
            rows: [
              ['**D** — Discipline', 'Checking in inside a routine’s punctuality window', 'Whether you showed up on time'],
              ['**K** — Kinetics', 'Clearing tasks through the day at a steady pace', 'Whether you kept moving'],
              ['**G** — Geniuses', 'Planning ahead and completing goals that ladder up', 'Whether the work compounds'],
            ],
          },
          {
            kind: 'p',
            text: 'See [How points work](/help/articles/how-points-work) for the exact rates.',
          },
        ],
      },
      {
        id: 'what-you-do-first',
        heading: 'What you do first',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Sign in with Google, or with Apple on iOS. See [Create your account](/help/articles/create-your-account).',
              'Walk the [welcome wizard](/help/articles/the-welcome-wizard) — it asks about your sleep and work hours and builds a starter set of routines from your answers.',
              'On **Home**, check in to the routine that is due now.',
              'Add a day goal or two and link them to a routine.',
              'Come back tomorrow. The loop only means anything repeated.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'Start smaller than you think',
            text: 'Three or four routines you actually hit beats twelve you resent. You can add more from **Routine Settings** any time.',
          },
        ],
      },
      {
        id: 'what-it-costs',
        heading: 'What it costs',
        blocks: [
          {
            kind: 'p',
            text: 'Routine Notes is free to use. Points are earned by showing up, and you only ever spend them to redeem a routine you missed. New accounts start with a 300-point grant so your first missed day is covered.',
          },
          {
            kind: 'callout',
            tone: 'note',
            text: 'Paid subscriptions (which make redeems unlimited) are announced in the app but are not on sale yet.',
          },
        ],
      },
    ],
    related: ['create-your-account', 'the-welcome-wizard', 'how-points-work', 'glossary'],
  },

  {
    slug: 'create-your-account',
    title: 'Create your account and sign in',
    summary: 'Sign in with Google or Apple, on the web or in the mobile apps.',
    category: 'get-started',
    subcategory: 'basics',
    updated: '2026-08-05',
    popular: true,
    keywords: ['login', 'log in', 'sign up', 'google', 'apple', 'oauth', 'register'],
    intro:
      'Routine Notes has no separate password. You sign in with an existing Google account, or with Apple on iPhone and iPad, and an account is created for you the first time.',
    sections: [
      {
        id: 'sign-in',
        heading: 'Sign in',
        blocks: [
          {
            kind: 'platformSteps',
            groups: [
              {
                platform: 'web',
                steps: [
                  'Go to the app at **routine.familywealth.in**.',
                  'Select **Sign in with Google**.',
                  'Pick the Google account you want to use and approve the permission prompt.',
                  'First time only: you land on the welcome wizard.',
                ],
              },
              {
                platform: 'ios',
                steps: [
                  'Open Routine Notes.',
                  'Select **Sign in with Google** or **Sign in with Apple**.',
                  'Complete the system sign-in sheet.',
                  'First time only: you land on the welcome wizard.',
                ],
              },
              {
                platform: 'android',
                steps: [
                  'Open Routine Notes.',
                  'Select **Sign in with Google**.',
                  'Pick the Google account you want to use.',
                  'First time only: you land on the welcome wizard.',
                ],
              },
            ],
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'One account, every device',
            text: 'Your data lives on the server, so the same account on web, iOS and Android shows the same routines and goals. Sign in with the *same provider* each time — signing in with Apple where you first used Google creates a separate account.',
          },
        ],
      },
      {
        id: 'what-we-store',
        heading: 'What is stored about you',
        blocks: [
          {
            kind: 'p',
            text: 'From the sign-in provider Routine Notes keeps your name, email address and profile picture. Everything you then write — routine names, steps, goal text, notes — is encrypted at rest. See [Privacy and encryption](/help/articles/privacy-and-encryption).',
          },
        ],
      },
      {
        id: 'sign-out',
        heading: 'Sign out',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open the sidebar (or the drawer on mobile).',
              'Select **Log Out** at the bottom.',
            ],
          },
          {
            kind: 'p',
            text: 'Signing out clears your session token and the offline cache from the device.',
          },
        ],
      },
      {
        id: 'trouble',
        heading: 'If sign-in fails',
        blocks: [
          {
            kind: 'list',
            items: [
              'Check the device clock is correct — a skewed clock invalidates the sign-in token.',
              'If the popup is blocked on the web, allow popups for the app domain and retry.',
              'Still stuck? See [Sign-in problems](/help/articles/sign-in-problems).',
            ],
          },
        ],
      },
    ],
    related: ['the-welcome-wizard', 'sign-in-problems', 'delete-your-account', 'get-the-apps'],
  },

  {
    slug: 'the-welcome-wizard',
    title: 'The welcome wizard',
    summary:
      'The six-step setup that turns your sleep and work hours into a starter set of routines.',
    category: 'get-started',
    subcategory: 'setup',
    updated: '2026-08-05',
    popular: true,
    keywords: ['onboarding', 'wizard', 'setup', 'first run', 'starter routines'],
    intro:
      'The first time you sign in, Routine Notes asks six short questions and builds your first routines from the answers. It takes about a minute and you can change everything afterwards.',
    sections: [
      {
        id: 'steps',
        heading: 'The six steps',
        blocks: [
          {
            kind: 'table',
            head: ['Step', 'What it asks', 'What it does'],
            rows: [
              ['1. Your name', 'What to call you', 'Used in greetings and in Groups'],
              ['2. Sleep schedule', 'Bed time and wake time', 'Sets the boundaries of your day dial'],
              ['3. Work hours', 'Start and end of your working day', 'Reserves the block your work routines sit in'],
              ['4. Morning routine', 'What you do after waking', 'Creates your first morning routine items'],
              ['5. Evening activities', 'What you do before bed', 'Creates your first evening routine items'],
              ['6. Earn points', 'Nothing — it explains the point system', 'Introduces Discipline, Kinetics and Geniuses'],
            ],
          },
          {
            kind: 'p',
            text: 'Select **Complete Setup** on the last step and the routines are created on your account.',
          },
        ],
      },
      {
        id: 'after',
        heading: 'After the wizard',
        blocks: [
          {
            kind: 'p',
            text: 'You land on **Home** with a full day of routines. Nothing is fixed:',
          },
          {
            kind: 'list',
            items: [
              'Rename, re-time or delete any of them in **Routine Settings** — see [Create and edit routines](/help/articles/create-and-edit-routines).',
              'Add [steps](/help/articles/routine-steps) to break a routine into a checklist.',
              'Add your first [day goals](/help/articles/introduction-to-goals).',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Watch your point budget',
            text: 'Routine items share a fixed daily point budget. **Routine Settings** shows *Point Remaining* — if it hits zero, lower the points on an existing routine before adding another.',
          },
        ],
      },
      {
        id: 'rerun',
        heading: 'Can I run the wizard again?',
        blocks: [
          {
            kind: 'p',
            text: 'The wizard only runs for a brand-new account. To rebuild your day later, edit your routine items directly in **Routine Settings** — the wizard would only create duplicates.',
          },
        ],
      },
    ],
    related: ['create-and-edit-routines', 'introduction-to-routines', 'how-points-work'],
  },

  {
    slug: 'get-the-apps',
    title: 'Get the apps',
    summary: 'Where to download Routine Notes for iPhone, iPad, Mac, Android and the web.',
    category: 'get-started',
    subcategory: 'apps',
    updated: '2026-08-05',
    popular: true,
    keywords: ['download', 'install', 'ios', 'android', 'app store', 'play store', 'pwa', 'mac'],
    intro:
      'Routine Notes runs in any modern browser and ships as a native app on Apple and Android devices. All of them sign in to the same account and show the same data.',
    sections: [
      {
        id: 'where',
        heading: 'Where to get it',
        blocks: [
          {
            kind: 'table',
            head: ['Platform', 'Requirement', 'Where'],
            rows: [
              ['Web', 'Any current browser', '[routine.familywealth.in](https://routine.familywealth.in)'],
              ['iPhone / iPad', 'iOS or iPadOS 14 and later', '[App Store](https://apps.apple.com/us/app/routine-notes/id6744820484)'],
              ['Mac', 'macOS 11 and later, Apple silicon', '[App Store](https://apps.apple.com/us/app/routine-notes/id6744820484)'],
              ['Apple Vision', 'visionOS 1.0 and later', '[App Store](https://apps.apple.com/us/app/routine-notes/id6744820484)'],
              ['Android', 'Google Play', '[Google Play](https://play.google.com/store/apps/details?id=com.routine.note)'],
            ],
          },
        ],
      },
      {
        id: 'why-native',
        heading: 'What the mobile apps add',
        blocks: [
          {
            kind: 'list',
            items: [
              '**Push notifications** when a routine’s window opens, so you do not have to keep a tab open.',
              '**Sign in with Apple** on iPhone and iPad.',
              'A home-screen icon and offline access to data already loaded.',
            ],
          },
          {
            kind: 'callout',
            tone: 'note',
            text: 'The in-app **Notifications** settings page is still marked *Coming soon*. Until it ships, notification permission is requested by the app itself and managed in your device settings.',
          },
        ],
      },
      {
        id: 'install-web',
        heading: 'Install the web app to your home screen',
        blocks: [
          {
            kind: 'p',
            text: 'The web app is a PWA, so you can install it without an app store.',
          },
          {
            kind: 'platformSteps',
            groups: [
              {
                platform: 'web',
                steps: [
                  'Open the app in Chrome or Edge.',
                  'Select the install icon in the address bar, or **⋮ → Install app**.',
                  'Confirm. It now opens in its own window.',
                ],
              },
              {
                platform: 'ios',
                steps: [
                  'Prefer the App Store build — it supports push notifications and Sign in with Apple.',
                  'To install the web version instead: open the app in Safari.',
                  'Tap **Share → Add to Home Screen**.',
                ],
              },
              {
                platform: 'android',
                steps: [
                  'Prefer the Play Store build for push notifications.',
                  'To install the web version instead: open the app in Chrome.',
                  'Tap **⋮ → Add to Home screen**.',
                ],
              },
            ],
          },
        ],
      },
    ],
    related: ['create-your-account', 'notifications-are-not-arriving', 'sync-and-offline'],
  },

  {
    slug: 'glossary',
    title: 'Routine Notes glossary',
    summary: 'Every term the app uses, defined — from Discipline to Skip Day.',
    category: 'get-started',
    subcategory: 'reference',
    updated: '2026-08-05',
    popular: true,
    keywords: ['terms', 'vocabulary', 'definitions', 'dictionary', 'what does mean'],
    intro:
      'Routine Notes uses some words in a specific way. This page is the reference — each entry links on to the article that covers it in full.',
    sections: [
      {
        id: 'day',
        heading: 'Your day',
        blocks: [
          {
            kind: 'terms',
            items: [
              {
                term: 'Routine / routine item',
                def: 'A named, time-boxed block of your day. The desktop sidebar calls this screen **Home**; the mobile tab bar calls it **Routine**. See [Introduction to routines](/help/articles/introduction-to-routines).',
              },
              {
                term: 'Steps',
                def: 'The ordered checklist inside a routine item. Not to be confused with a goal’s sub-tasks.',
              },
              {
                term: 'Punctuality window',
                def: 'The 1 hour 30 minute window in which a check-in counts — from 60 minutes before the routine’s time to 30 minutes after.',
              },
              {
                term: 'Check in / tick',
                def: 'Marking a routine as done. A check-in cannot be undone.',
              },
              {
                term: 'Quick task',
                def: 'A one-off task dropped into the routine slot that is running now.',
              },
              {
                term: 'Skip Day',
                def: 'A switch that pauses scoring for a day without breaking your history. Limited to two per week.',
              },
              {
                term: 'Pending items',
                def: 'The inbox for unplanned tasks, opened from the checklist icon in the toolbar.',
              },
            ],
          },
        ],
      },
      {
        id: 'goals',
        heading: 'Goals',
        blocks: [
          {
            kind: 'terms',
            items: [
              {
                term: 'Goal / goal item',
                def: 'Anything you plan or do, at one of five periods: **day**, **week**, **month**, **year** or **lifetime**.',
              },
              {
                term: 'Milestone',
                def: 'A goal linked to a parent goal one period up. Milestones are what make the cascade work.',
              },
              {
                term: 'Cascade',
                def: 'Completing enough goals at one period automatically completes the parent: 5 day goals close a week, 3 weeks close a month, 6 months close a year.',
              },
              {
                term: 'Sub-task',
                def: 'A checklist item under a day goal.',
              },
              {
                term: 'Contribution',
                def: 'The free-form markdown notes field on a goal. It auto-saves as you type.',
              },
              {
                term: 'Reward',
                def: 'What you promise yourself for finishing a goal. Text only — the app does not enforce it.',
              },
              {
                term: 'Task status',
                def: 'One of **To Do**, **In Progress**, **Done**, **Missed** or **Rescheduled**.',
              },
            ],
          },
        ],
      },
      {
        id: 'points',
        heading: 'Points',
        blocks: [
          {
            kind: 'terms',
            items: [
              {
                term: 'Discipline (D)',
                def: 'Points for checking in inside the punctuality window. Capped at 100 a day.',
              },
              {
                term: 'Kinetics (K)',
                def: 'Points for clearing tasks through the day. Capped at 100 a day.',
              },
              {
                term: 'Geniuses (G)',
                def: 'Points for planning and for goals that ladder up. Capped at 100 a day.',
              },
              {
                term: 'Settle',
                def: 'The overnight step that turns what you earned today into points you can spend tomorrow.',
              },
              {
                term: 'Pending today',
                def: 'Points earned today that have not settled yet.',
              },
              {
                term: 'Available',
                def: 'Settled points you can spend right now.',
              },
              {
                term: 'Redeem',
                def: 'Spending points to check in a routine you missed earlier today.',
              },
              {
                term: 'Entitled',
                def: 'A subscribed account, which redeems without spending points. Shown as ∞ on the points chip.',
              },
            ],
          },
        ],
      },
      {
        id: 'elsewhere',
        heading: 'Everywhere else',
        blocks: [
          {
            kind: 'terms',
            items: [
              {
                term: 'Priority matrix',
                def: 'The **Do / Plan / Delegate / Automate** view. Quadrants are derived from the task, never picked by hand.',
              },
              {
                term: 'Agent',
                def: 'An automation bound to a routine that fires a URL or cURL request when the routine starts or ends.',
              },
              {
                term: 'Group',
                def: 'A shared circle — family or friends — who can see each other’s daily scores.',
              },
              {
                term: 'Project / Area',
                def: 'Views built from routine tags prefixed `project:` and `area:`.',
              },
              {
                term: 'Routine Efficiency',
                def: 'The percentage of your routine check-ins that landed on time, shown on **Progress** and **History**.',
              },
            ],
          },
        ],
      },
    ],
    related: ['what-is-routine-notes', 'how-points-work', 'the-priority-matrix'],
  },
];
