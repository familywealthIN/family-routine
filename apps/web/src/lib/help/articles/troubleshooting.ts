import type { HelpArticle } from '../types';

export const troubleshootingArticles: HelpArticle[] = [
  {
    slug: 'notifications-are-not-arriving',
    title: 'Notifications are not arriving',
    summary: 'Work through the usual causes of missing routine reminders.',
    category: 'troubleshooting',
    subcategory: 'common',
    updated: '2026-08-05',
    popular: true,
    keywords: ['no notifications', 'missing reminder', 'push not working', 'silent', 'alerts'],
    intro:
      'Missing reminders almost always come down to one of four things: permission, the wrong install, a device power setting, or a time zone that does not match your day.',
    sections: [
      {
        id: 'permission',
        heading: '1. Check the permission',
        blocks: [
          {
            kind: 'platformSteps',
            groups: [
              {
                platform: 'web',
                steps: [
                  'Select the padlock in the address bar.',
                  'Set **Notifications** to Allow.',
                  'Reload the app.',
                  'Check the notification setting in your operating system too — a browser can be allowed while the OS silences it.',
                ],
              },
              {
                platform: 'ios',
                steps: [
                  'Open **Settings → Notifications → Routine Notes**.',
                  'Turn on **Allow Notifications**.',
                  'Check that **Focus** or Do Not Disturb is not filtering the app.',
                  'Confirm **Background App Refresh** is on.',
                ],
              },
              {
                platform: 'android',
                steps: [
                  'Open **Settings → Apps → Routine Notes → Notifications**.',
                  'Turn notifications on.',
                  'Under **Battery**, set the app to **Unrestricted** — aggressive battery saving is the most common cause on Android.',
                  'Check that Do Not Disturb is not filtering the app.',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'install',
        heading: '2. Check which install you are using',
        blocks: [
          {
            kind: 'callout',
            tone: 'note',
            title: 'A browser tab is not a reliable delivery channel',
            text: 'For dependable reminders on a phone, use the App Store or Play Store build rather than the website. See [Get the apps](/help/articles/get-the-apps).',
          },
        ],
      },
      {
        id: 'timezone',
        heading: '3. Check your time zone',
        blocks: [
          {
            kind: 'p',
            text: 'If reminders arrive but at the wrong time, your profile time zone is out of date. Open **Settings → Profile Settings** and correct it — see [Profile settings](/help/articles/profile-settings). If you have travelled recently and declined the prompt, this is almost certainly the cause.',
          },
        ],
      },
      {
        id: 'reinstall',
        heading: '4. Re-register the device',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Sign out of Routine Notes.',
              'Sign back in — this re-registers the device for push.',
              'If that fails, reinstall the app and sign in again.',
            ],
          },
          {
            kind: 'p',
            text: 'Still nothing? Email [support@familywealth.in](mailto:support@familywealth.in) with your platform and the routine time you expected.',
          },
        ],
      },
    ],
    related: ['notification-settings', 'get-the-apps', 'profile-settings'],
  },

  {
    slug: 'i-cannot-check-in',
    title: 'I cannot check in to a routine',
    summary: 'Why a check-in button is greyed out, red, or not doing what you expect.',
    category: 'troubleshooting',
    subcategory: 'common',
    updated: '2026-08-05',
    popular: true,
    keywords: ['cannot tick', 'button disabled', 'greyed out', 'check in failed', 'missed'],
    intro: 'Work down this list — the answer is usually the first one.',
    sections: [
      {
        id: 'causes',
        heading: 'Common causes',
        blocks: [
          {
            kind: 'table',
            head: ['What you see', 'Why', 'Fix'],
            rows: [
              ['Alarm icon, nothing happens', 'The window has not opened yet — it opens 60 minutes before the routine’s time.', 'Wait, or move the routine earlier.'],
              ['White diamond', 'The window closed. It is redeemable.', '[Redeem it](/help/articles/redeem-a-missed-routine) with points.'],
              ['Red cross', 'Passed and locked — the day has moved on.', 'Nothing today. Consider re-timing the routine.'],
              ['Already green', 'You have already checked in.', 'Nothing to do. Check-ins cannot be undone.'],
              ['*Not enough points*', 'A redeem needs available points.', 'See [Running out of points](/help/articles/running-out-of-points).'],
              ['Routine missing entirely', 'The day is on [Skip Day](/help/articles/skip-day), or you are looking at another date.', 'Turn Skip Day off, or select today on the week strip.'],
            ],
          },
        ],
      },
      {
        id: 'timezone',
        heading: 'Windows opening at the wrong time',
        blocks: [
          {
            kind: 'p',
            text: 'If every window seems shifted by a whole number of hours, your profile time zone is wrong. Fix it in [Profile settings](/help/articles/profile-settings).',
          },
        ],
      },
      {
        id: 'nothing',
        heading: 'The button does nothing at all',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Check you are online — a check-in has to reach the server.',
              'Pull to refresh, or use the refresh control on Home.',
              'Reload the app.',
              'Sign out and back in.',
            ],
          },
        ],
      },
    ],
    related: [
      'check-in-and-the-punctuality-window',
      'redeem-a-missed-routine',
      'running-out-of-points',
      'sync-and-offline',
    ],
  },

  {
    slug: 'sync-and-offline',
    title: 'Sync and offline behaviour',
    summary: 'How Routine Notes caches your data, and what to do when devices disagree.',
    category: 'troubleshooting',
    subcategory: 'common',
    updated: '2026-08-05',
    keywords: ['sync', 'offline', 'stale', 'not updating', 'cache', 'refresh', 'out of date'],
    intro:
      'Routine Notes caches your data on the device so it opens instantly and keeps working through a brief drop in connection. Occasionally that cache gets ahead of, or behind, the server.',
    sections: [
      {
        id: 'how',
        heading: 'How it works',
        blocks: [
          {
            kind: 'list',
            items: [
              'Your data is cached locally, so recently viewed screens render offline.',
              'Changes are sent to the server when you make them — the server is the source of truth.',
              'Scoring — check-in windows, point settlement — is decided by the server, not the device.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Check in online',
            text: 'Because scoring happens server-side, a check-in made with no connection may not register. If you are somewhere with no signal at routine time, check in as soon as you are back — and [redeem](/help/articles/redeem-a-missed-routine) if the window has closed.',
          },
        ],
      },
      {
        id: 'stale',
        heading: 'One device is showing stale data',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Use the refresh control on the screen.',
              'Reload the app fully.',
              'Confirm both devices are signed in to the **same account and provider** — Google and Apple sign-in create separate accounts.',
              'Sign out and back in on the device that is wrong, which clears its cache.',
            ],
          },
        ],
      },
      {
        id: 'midnight',
        heading: 'Around midnight',
        blocks: [
          {
            kind: 'p',
            text: 'Points [settle overnight](/help/articles/settled-pending-and-available), so *pending* becoming *available* is expected behaviour rather than a sync fault. If your day appears to roll over at the wrong hour, check your time zone in [Profile settings](/help/articles/profile-settings).',
          },
        ],
      },
    ],
    related: ['i-cannot-check-in', 'settled-pending-and-available', 'profile-settings'],
  },

  {
    slug: 'sign-in-problems',
    title: 'Sign-in problems',
    summary: 'When Google or Apple sign-in fails, or you land in an empty account.',
    category: 'troubleshooting',
    subcategory: 'common',
    updated: '2026-08-05',
    keywords: ['cannot log in', 'sign in failed', 'empty account', 'wrong account', 'oauth error'],
    intro:
      'Two very different problems look similar: sign-in that fails outright, and sign-in that succeeds into an account you did not mean to use.',
    sections: [
      {
        id: 'empty',
        heading: 'I signed in and everything is gone',
        blocks: [
          {
            kind: 'callout',
            tone: 'note',
            title: 'Almost always the wrong provider',
            text: 'Signing in with Apple when you originally used Google — or with a second Google address — creates a **separate account**, which looks exactly like data loss. Sign out, then sign back in with the provider and address you first used.',
          },
          {
            kind: 'p',
            text: 'On iOS, be careful with *Hide My Email* — an Apple relay address is a different identity from your Google address.',
          },
        ],
      },
      {
        id: 'fails',
        heading: 'Sign-in fails',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Check your device clock is correct and set automatically — a skewed clock invalidates the sign-in token.',
              'On the web, allow popups for the app domain.',
              'Try a private window, to rule out an extension.',
              'Clear the site’s cookies, or reinstall the mobile app.',
              'Try a different network — some corporate networks block the sign-in provider.',
            ],
          },
        ],
      },
      {
        id: 'help',
        heading: 'Still stuck',
        blocks: [
          {
            kind: 'p',
            text: 'Email [support@familywealth.in](mailto:support@familywealth.in) with the platform, the provider you used and any error message. Do not include your client secret or API key.',
          },
        ],
      },
    ],
    related: ['create-your-account', 'sync-and-offline', 'privacy-and-encryption'],
  },

  {
    slug: 'faq',
    title: 'Frequently asked questions',
    summary: 'Short answers to the things people ask most.',
    category: 'troubleshooting',
    subcategory: 'faq',
    updated: '2026-08-05',
    popular: true,
    keywords: ['faq', 'questions', 'common', 'quick answers'],
    intro: 'The quick answers. Each one links to the article with the detail.',
    sections: [
      {
        id: 'points',
        heading: 'Points',
        blocks: [
          {
            kind: 'terms',
            items: [
              {
                term: 'Why can’t I spend the points I earned today?',
                def: 'They settle overnight and become spendable tomorrow. See [Settled, pending and available](/help/articles/settled-pending-and-available).',
              },
              {
                term: 'What is the most I can earn in a day?',
                def: '300 — 100 each from Discipline, Kinetics and Geniuses. See [How points work](/help/articles/how-points-work).',
              },
              {
                term: 'Do I lose points for missing a routine?',
                def: 'No. You simply do not earn them, and you can spend points to [redeem](/help/articles/redeem-a-missed-routine) the check-in the same day.',
              },
              {
                term: 'Is Routine Notes free?',
                def: 'Yes. Subscriptions are announced in the app but are not on sale. See [Running out of points](/help/articles/running-out-of-points).',
              },
            ],
          },
        ],
      },
      {
        id: 'routines',
        heading: 'Routines and goals',
        blocks: [
          {
            kind: 'terms',
            items: [
              {
                term: 'Can I undo a check-in?',
                def: 'No. Check-ins are final by design. See [Check in and the punctuality window](/help/articles/check-in-and-the-punctuality-window).',
              },
              {
                term: 'How long do I have to check in?',
                def: '1 hour 30 minutes — from 60 minutes before to 30 minutes after the routine’s time.',
              },
              {
                term: 'How many days can I skip?',
                def: 'Two per week. See [Skip Day](/help/articles/skip-day).',
              },
              {
                term: 'How many day goals close a week goal?',
                def: 'Five. Three weeks close a month, and six months close a year. See [Milestones and the cascade](/help/articles/milestones-and-the-cascade).',
              },
              {
                term: 'What is the difference between steps and sub-tasks?',
                def: 'Steps belong to a routine and repeat daily; sub-tasks belong to one day goal and their ticks are saved. See [Routine steps](/help/articles/routine-steps).',
              },
              {
                term: 'Can I choose a task’s priority quadrant?',
                def: 'No — it is derived from the task’s date, period, mentions and agent. See [The priority matrix](/help/articles/the-priority-matrix).',
              },
            ],
          },
        ],
      },
      {
        id: 'account',
        heading: 'Account and data',
        blocks: [
          {
            kind: 'terms',
            items: [
              {
                term: 'Can I use the same account on my phone and laptop?',
                def: 'Yes — sign in with the same provider on each. See [Get the apps](/help/articles/get-the-apps).',
              },
              {
                term: 'Can other people see my goals?',
                def: 'Group members see your day scores, not your goal contents. See [Privacy and encryption](/help/articles/privacy-and-encryption).',
              },
              {
                term: 'Can I export my data?',
                def: 'Not currently. Copy out anything you need before [deleting your account](/help/articles/delete-your-account).',
              },
              {
                term: 'How do I contact support?',
                def: 'Email [support@familywealth.in](mailto:support@familywealth.in).',
              },
            ],
          },
        ],
      },
    ],
    related: ['glossary', 'how-points-work', 'what-is-routine-notes'],
  },
];
