import type { HelpArticle } from '../types';

export const groupArticles: HelpArticle[] = [
  {
    slug: 'introduction-to-groups',
    title: 'Introduction to groups',
    summary: 'Share your daily scores with family or friends and keep each other honest.',
    category: 'groups',
    subcategory: 'sharing',
    updated: '2026-08-05',
    popular: true,
    keywords: ['group', 'family', 'friends', 'share', 'accountability', 'members'],
    intro:
      'A **group** is a small circle — a family, a couple of friends, a team — who can see each other’s daily routine scores. It exists for accountability, not management: nobody can assign you anything.',
    sections: [
      {
        id: 'what-you-see',
        heading: 'What a group shows',
        blocks: [
          {
            kind: 'p',
            text: 'The **Groups** screen lists every member with **seven day-score dots** — a week of check-in performance at a glance. Select a member to open their routine history in more detail.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Scores are shared, contents are not',
            text: 'Members see how your days went, not what your goals say. Your goal text, contribution notes and rewards stay yours.',
          },
        ],
      },
      {
        id: 'one-group',
        heading: 'One group at a time',
        blocks: [
          {
            kind: 'p',
            text: 'You belong to a single group. Accepting an invitation to a different one means [leaving](/help/articles/leave-a-group) your current group first.',
          },
          {
            kind: 'p',
            text: 'A group holds up to about ten members.',
          },
        ],
      },
      {
        id: 'why',
        heading: 'Why share at all',
        blocks: [
          {
            kind: 'p',
            text: 'A routine nobody can see is easy to quietly abandon. Seven dots that someone else glances at is a very small amount of social pressure, applied to exactly the thing that is hard — showing up on an ordinary Tuesday.',
          },
        ],
      },
    ],
    related: ['invite-people-to-your-group', 'leave-a-group', 'referrals'],
  },

  {
    slug: 'invite-people-to-your-group',
    title: 'Invite people to your group',
    summary: 'Send an invitation by email, and accept or decline one you have received.',
    category: 'groups',
    subcategory: 'sharing',
    updated: '2026-08-05',
    keywords: ['invite', 'join', 'accept', 'decline', 'email', 'add member'],
    intro:
      'Groups are invitation-only. You invite by email address, and the other person chooses whether to join.',
    sections: [
      {
        id: 'send',
        heading: 'Send an invitation',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Open **Groups** in the sidebar.',
              'Select **Invite User**.',
              'Enter the person’s email address.',
              'Select **Invite**.',
            ],
          },
          {
            kind: 'callout',
            tone: 'tip',
            text: 'Use the address they will sign in with. An invitation sent to a different address will not find their account.',
          },
        ],
      },
      {
        id: 'receive',
        heading: 'Accept or decline',
        blocks: [
          {
            kind: 'p',
            text: 'When someone invites you, a dialog appears: *User X has invited you to join their group. Do you want to join?*',
          },
          {
            kind: 'list',
            items: [
              '**Accept** — you join, and members can see each other’s day scores from then on.',
              '**Decline** — nothing changes, and the inviter is not told anything beyond the invitation lapsing.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            text: 'Accepting an invitation while you are already in a group moves you. Leave deliberately rather than discovering it after the fact.',
          },
        ],
      },
      {
        id: 'referral',
        heading: 'Invitations and referral points',
        blocks: [
          {
            kind: 'p',
            text: 'If the person you invite is new to Routine Notes, the same invitation counts towards [referral rewards](/help/articles/referrals) — 300 points once they have earned points on three settled days.',
          },
        ],
      },
    ],
    related: ['introduction-to-groups', 'leave-a-group', 'referrals'],
  },

  {
    slug: 'leave-a-group',
    title: 'Leave a group',
    summary: 'Step out of a shared group and stop sharing your scores.',
    category: 'groups',
    subcategory: 'sharing',
    updated: '2026-08-05',
    keywords: ['leave', 'exit', 'remove', 'quit group', 'stop sharing'],
    intro: 'Leaving a group is immediate and does not affect any of your own data.',
    sections: [
      {
        id: 'leave',
        heading: 'Leave',
        blocks: [
          {
            kind: 'steps',
            items: ['Open **Groups**.', 'Select **Leave Group**.', 'Confirm.'],
          },
        ],
      },
      {
        id: 'after',
        heading: 'What happens next',
        blocks: [
          {
            kind: 'list',
            items: [
              'Former members can no longer see your day scores, and you can no longer see theirs.',
              'Your routines, goals, points and history are untouched.',
              'You can accept a new invitation, or be invited back, at any time.',
            ],
          },
          {
            kind: 'callout',
            tone: 'note',
            text: 'There is no way to remove someone else from a group — each person leaves for themselves.',
          },
        ],
      },
    ],
    related: ['introduction-to-groups', 'invite-people-to-your-group', 'delete-your-account'],
  },
];
