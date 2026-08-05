import type { HelpCategory } from './types';

/**
 * Top-level help taxonomy. Order here is the order shown in the sidebar,
 * on the help home page and in the header dropdown.
 */
export const categories: HelpCategory[] = [
  {
    id: 'get-started',
    label: 'Get started',
    icon: 'ph:rocket-launch',
    accent: '#288bd5',
    blurb: 'Create your account, set up your first routines and learn the vocabulary.',
    subcategories: [
      { id: 'basics', label: 'Account basics' },
      { id: 'setup', label: 'Set up your day' },
      { id: 'apps', label: 'Get the apps' },
      { id: 'reference', label: 'Reference' },
    ],
  },
  {
    id: 'routines',
    label: 'Routines',
    icon: 'ph:clock-countdown',
    accent: '#288bd5',
    blurb: 'Time-boxed blocks of your day, the check-in window, steps and quick tasks.',
    subcategories: [
      { id: 'essentials', label: 'Routine essentials' },
      { id: 'checking-in', label: 'Checking in' },
      { id: 'day-off', label: 'Days off' },
    ],
  },
  {
    id: 'goals',
    label: 'Goals & milestones',
    icon: 'ph:target',
    accent: '#7c4dff',
    blurb: 'Day, week, month, year and lifetime goals, and how they complete each other.',
    subcategories: [
      { id: 'basics', label: 'Goal basics' },
      { id: 'cascade', label: 'Milestones & the cascade' },
      { id: 'organising', label: 'Organising goals' },
    ],
  },
  {
    id: 'priority',
    label: 'Priority',
    icon: 'ph:squares-four',
    accent: '#F44336',
    blurb: 'The Do / Plan / Delegate / Automate matrix and how tasks land in it.',
    subcategories: [{ id: 'matrix', label: 'The priority matrix' }],
  },
  {
    id: 'points',
    label: 'Points',
    icon: 'ph:diamond',
    accent: '#FF9800',
    blurb: 'Discipline, Kinetics and Geniuses — earning, settling and spending points.',
    subcategories: [
      { id: 'earning', label: 'Earning points' },
      { id: 'spending', label: 'Spending points' },
      { id: 'balance', label: 'Your balance' },
    ],
  },
  {
    id: 'agents',
    label: 'Agents',
    icon: 'ph:robot',
    accent: '#757575',
    blurb: 'Fire a webhook or a cURL request when a routine starts or ends.',
    subcategories: [
      { id: 'basics', label: 'Agent basics' },
      { id: 'running', label: 'Running agents' },
    ],
  },
  {
    id: 'ai',
    label: 'AI features',
    icon: 'ph:sparkle',
    accent: '#00bfa5',
    blurb: 'Write tasks in plain language, generate milestone plans and get next steps.',
    subcategories: [
      { id: 'search', label: 'AI search' },
      { id: 'planning', label: 'AI planning' },
    ],
  },
  {
    id: 'groups',
    label: 'Groups',
    icon: 'ph:users-three',
    accent: '#4CAF50',
    blurb: 'Share your routine with family or friends and keep each other accountable.',
    subcategories: [{ id: 'sharing', label: 'Sharing your routine' }],
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: 'ph:chart-line-up',
    accent: '#1976D2',
    blurb: 'Efficiency, on-track scores, history, and the Projects and Areas views.',
    subcategories: [
      { id: 'reports', label: 'Reports & history' },
      { id: 'views', label: 'Projects & Areas' },
    ],
  },
  {
    id: 'account',
    label: 'Account & settings',
    icon: 'ph:gear-six',
    accent: '#415374',
    blurb: 'Profile, notifications, integrations, privacy and account deletion.',
    subcategories: [
      { id: 'profile', label: 'Profile & preferences' },
      { id: 'integrations', label: 'Integrations' },
      { id: 'privacy', label: 'Privacy & data' },
    ],
  },
  {
    id: 'troubleshooting',
    label: 'Troubleshooting',
    icon: 'ph:lifebuoy',
    accent: '#FF5252',
    blurb: 'Fixes for notifications, check-ins, sync and sign-in problems.',
    subcategories: [
      { id: 'common', label: 'Common problems' },
      { id: 'faq', label: 'FAQ' },
    ],
  },
];
