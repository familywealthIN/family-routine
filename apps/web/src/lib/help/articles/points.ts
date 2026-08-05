import type { HelpArticle } from '../types';

export const pointArticles: HelpArticle[] = [
  {
    slug: 'how-points-work',
    title: 'How points work',
    summary:
      'Discipline, Kinetics and Geniuses — the three stimuli, the 300-a-day cap, and what each is worth.',
    category: 'points',
    subcategory: 'earning',
    updated: '2026-08-05',
    popular: true,
    keywords: ['points', 'kdg', 'discipline', 'kinetics', 'geniuses', 'xp', 'score', 'cap'],
    intro:
      'Points are the scoreboard and the currency. You earn them through three **stimuli** — Discipline, Kinetics and Geniuses — each capped at 100 a day, for a maximum of **300 points a day**.',
    sections: [
      {
        id: 'three',
        heading: 'The three stimuli',
        blocks: [
          {
            kind: 'table',
            head: ['', 'Earned by', 'Daily cap'],
            rows: [
              ['**D** — Discipline', 'Checking in to a routine inside its [punctuality window](/help/articles/check-in-and-the-punctuality-window)', '100'],
              ['**K** — Kinetics', 'Clearing tasks through the day, paced at roughly one per two hours', '100'],
              ['**G** — Geniuses', 'Completing goals that ladder up to a larger period', '100'],
            ],
          },
          {
            kind: 'p',
            text: 'They measure different things on purpose. Discipline is *did you show up*. Kinetics is *did you keep moving*. Geniuses is *did any of it compound*. It is entirely possible to max one and score nothing on another — and that gap is the useful signal.',
          },
        ],
      },
      {
        id: 'discipline',
        heading: 'Discipline (D)',
        blocks: [
          {
            kind: 'p',
            text: 'Every routine item carries a point value you set in **Routine Settings**, drawn from a shared daily budget. Check in inside the window and you earn it. Check in late and you earn nothing unless you [redeem](/help/articles/redeem-a-missed-routine).',
          },
          {
            kind: 'callout',
            tone: 'tip',
            text: 'Because the budget is shared, weighting a routine heavily is a statement about what matters. Use it.',
          },
        ],
      },
      {
        id: 'kinetics',
        heading: 'Kinetics (K)',
        blocks: [
          {
            kind: 'p',
            text: 'Kinetics rewards steady movement rather than a single burst. The pacing works out at roughly one cleared task every two hours across a working day — so ten tasks at 11pm will not score the same as ten spread across the day.',
          },
        ],
      },
      {
        id: 'geniuses',
        heading: 'Geniuses (G)',
        blocks: [
          {
            kind: 'p',
            text: 'Geniuses scales with the period of the goal you completed. A goal is worth a percentage of its point value depending on where it sits:',
          },
          {
            kind: 'table',
            head: ['Goal period', 'Share of its points'],
            rows: [
              ['Day', '25%'],
              ['Week', '50%'],
              ['Month', '75%'],
              ['Year', '100%'],
            ],
          },
          {
            kind: 'p',
            text: 'On top of that, longer periods carry a scaling factor — so closing a week goal is worth substantially more than closing a day goal, and closing a year goal more again. This is the mechanism that makes [linking milestones](/help/articles/milestones-and-the-cascade) worth doing.',
          },
        ],
      },
      {
        id: 'see',
        heading: 'Where to see your points',
        blocks: [
          {
            kind: 'list',
            items: [
              'The **D / K / G dials** on Home show today, by stimulus.',
              'The **points chip** in the toolbar (diamond icon) shows your spendable balance.',
              '**Progress** shows the trend across a period.',
            ],
          },
        ],
      },
    ],
    related: [
      'settled-pending-and-available',
      'redeem-a-missed-routine',
      'milestones-and-the-cascade',
      'check-in-and-the-punctuality-window',
    ],
  },

  {
    slug: 'settled-pending-and-available',
    title: 'Settled, pending and available points',
    summary: 'Why what you earned today is not spendable until tomorrow.',
    category: 'points',
    subcategory: 'balance',
    updated: '2026-08-05',
    popular: true,
    keywords: ['settle', 'settled', 'pending', 'available', 'balance', 'overnight', 'ledger'],
    intro:
      'Points earned today do not become spendable today. They **settle** overnight. This one rule explains most questions about the points chip.',
    sections: [
      {
        id: 'states',
        heading: 'The three numbers',
        blocks: [
          {
            kind: 'table',
            head: ['Number', 'Means'],
            rows: [
              ['**Pending today**', 'Earned today. Not spendable yet.'],
              ['**Available**', 'Settled and spendable right now.'],
              ['**Used**', 'Already spent on redeems.'],
            ],
          },
          {
            kind: 'p',
            text: 'The points chip in the toolbar shows *Available*, with a tooltip reading “N points available · M pending today”.',
          },
        ],
      },
      {
        id: 'why',
        heading: 'Why the delay?',
        blocks: [
          {
            kind: 'p',
            text: 'Because otherwise the system has an obvious exploit: miss your 07:00 routine, hurriedly earn points elsewhere in the morning, and buy the miss back before lunch. Settling overnight means a redeem is always paid for out of a day you already completed.',
          },
        ],
      },
      {
        id: 'ledger',
        heading: 'The ledger',
        blocks: [
          {
            kind: 'p',
            text: 'Point movements are append-only — nothing is silently rewritten. There are four kinds of entry:',
          },
          {
            kind: 'terms',
            items: [
              { term: 'settle', def: 'The overnight conversion of a day’s earnings into available points.' },
              { term: 'redeem', def: 'Points spent to rescue a missed routine.' },
              { term: 'referral', def: 'A reward for inviting someone who sticks around.' },
              { term: 'grant', def: 'Points given directly — including the 300-point welcome grant.' },
            ],
          },
        ],
      },
      {
        id: 'welcome',
        heading: 'The welcome grant',
        blocks: [
          {
            kind: 'p',
            text: 'New accounts start with **300 points** so that your first missed routine is covered before you have earned anything.',
          },
        ],
      },
    ],
    related: ['how-points-work', 'redeem-a-missed-routine', 'referrals', 'running-out-of-points'],
  },

  {
    slug: 'redeem-a-missed-routine',
    title: 'Redeem a missed routine',
    summary: 'Spend points to check in a routine whose window has closed.',
    category: 'points',
    subcategory: 'spending',
    updated: '2026-08-05',
    popular: true,
    keywords: ['redeem', 'missed', 'late', 'rescue', 'recover', 'buy back', 'streak'],
    intro:
      'When a routine’s [punctuality window](/help/articles/check-in-and-the-punctuality-window) closes without a check-in, it moves to **Past** — but it is not gone. For the rest of that day you can **redeem** it by spending points.',
    sections: [
      {
        id: 'how',
        heading: 'Redeem',
        blocks: [
          {
            kind: 'steps',
            items: [
              'On **Home**, open the **Past** tab.',
              'Find the missed routine — its button shows a **white diamond**.',
              'Select it and confirm.',
            ],
          },
          {
            kind: 'p',
            text: 'The routine is now checked in, and the points come out of your **available** balance.',
          },
        ],
      },
      {
        id: 'cost',
        heading: 'What it costs',
        blocks: [
          {
            kind: 'p',
            text: 'The price is the routine’s point value **frozen at the moment it passed**. Lowering the routine’s points afterwards does not make an outstanding redeem cheaper.',
          },
        ],
      },
      {
        id: 'rules',
        heading: 'The rules',
        blocks: [
          {
            kind: 'table',
            head: ['Rule', 'Why'],
            rows: [
              ['**Today only.** Yesterday’s misses cannot be redeemed.', 'A redeem is a same-day recovery, not a rewrite of history.'],
              ['**Only passed, unchecked routines.**', 'There is nothing to redeem on a routine you already ticked.'],
              ['**You must have the points available.**', 'Pending points do not count — see [Settled, pending and available](/help/articles/settled-pending-and-available).'],
            ],
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Messages you might see',
            text: '*Not enough points* — your available balance is short. *Already checked in* — the routine is done. *Wrong date* — the miss is from a previous day and can no longer be redeemed.',
          },
        ],
      },
      {
        id: 'agents',
        heading: 'Agents still fire',
        blocks: [
          {
            kind: 'p',
            text: 'A redeemed check-in fires the routine’s [agent](/help/articles/introduction-to-agents) exactly as an on-time one would. Late is still done.',
          },
        ],
      },
    ],
    related: [
      'settled-pending-and-available',
      'running-out-of-points',
      'skip-day',
      'check-in-and-the-punctuality-window',
    ],
  },

  {
    slug: 'running-out-of-points',
    title: 'Running out of points',
    summary: 'What happens at zero, and how to get your balance back up.',
    category: 'points',
    subcategory: 'spending',
    updated: '2026-08-05',
    keywords: ['out of points', 'zero', 'not enough', 'paywall', 'subscription', 'broke'],
    intro:
      'Points only ever gate one thing: redeeming a routine you missed. Running out does not lock you out of the app — you keep every feature, you just cannot buy back a miss until you have earned more.',
    sections: [
      {
        id: 'what-happens',
        heading: 'What happens at zero',
        blocks: [
          {
            kind: 'list',
            items: [
              'Everything still works — routines, goals, agents, groups, progress.',
              'Attempting a redeem shows a **Not enough points** drawer.',
              'Missed routines stay missed and count against your [Routine Efficiency](/help/articles/progress-reports).',
            ],
          },
        ],
      },
      {
        id: 'recover',
        heading: 'Rebuild your balance',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Check in on time — Discipline is the fastest and most reliable earner.',
              'Clear goals steadily through the day for Kinetics.',
              'Link day goals to week goals so completions earn Geniuses too.',
              'Wait for the overnight settle — today’s earnings are spendable tomorrow.',
              'Invite someone who sticks around: see [Referrals](/help/articles/referrals).',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            title: 'A dry balance is information',
            text: 'If you are permanently broke, you are missing more routines than you are hitting. That is a scheduling problem, not a points problem — re-time the routines you keep missing, or lower their points and stop pretending.',
          },
        ],
      },
      {
        id: 'subscription',
        heading: 'Subscriptions',
        blocks: [
          {
            kind: 'p',
            text: 'The out-of-points drawer previews paid plans — **Monthly $4.99** and **Annual $49.99** — which would make redeems unlimited.',
          },
          {
            kind: 'callout',
            tone: 'note',
            text: 'These are not on sale yet. The drawer itself says *Subscriptions are coming soon*, and there is no way to buy one today. Everything in Routine Notes is currently free.',
          },
        ],
      },
    ],
    related: ['redeem-a-missed-routine', 'referrals', 'how-points-work', 'skip-day'],
  },

  {
    slug: 'referrals',
    title: 'Referrals',
    summary: 'Earn 300 points for each person you invite who actually sticks with it.',
    category: 'points',
    subcategory: 'earning',
    updated: '2026-08-05',
    keywords: ['referral', 'invite', 'refer a friend', 'bonus', 'reward'],
    intro:
      'Inviting someone to Routine Notes earns you **300 points** — but not immediately, and not for an invite that goes nowhere.',
    sections: [
      {
        id: 'how',
        heading: 'How it works',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Invite someone — the same invite used for [Groups](/help/articles/invite-people-to-your-group).',
              'They create an account.',
              'They use it for **3 settled earning days** — three separate days on which they actually earned points.',
              'Your 300 points land as a `referral` entry in your ledger.',
            ],
          },
        ],
      },
      {
        id: 'limits',
        heading: 'Limits',
        blocks: [
          {
            kind: 'table',
            head: ['Limit', 'Value'],
            rows: [
              ['Reward per referral', '300 points'],
              ['Qualifying period', '3 settled earning days by the invitee'],
              ['Maximum rewarded invites', '10'],
            ],
          },
          {
            kind: 'callout',
            tone: 'note',
            text: 'The three-day qualifier is why the reward does not appear straight away. If someone signs up and never returns, no points are awarded.',
          },
        ],
      },
    ],
    related: ['invite-people-to-your-group', 'settled-pending-and-available', 'running-out-of-points'],
  },
];
