/**
 * About's content — five feature tabs and the three-step start.
 *
 * ## The copy is the design's, not the old page's
 *
 * `packages/design/Profile and About.dc.html`'s README claims "the copy is kept
 * as written". It is not: the file trims the soldier metaphor out of Discipline /
 * Kinetics / Geniuses, drops the "Picture a soldier ordered to take an
 * enemy-held mountain" opener, and drops Priority's fifth point. That is the
 * newer authored text and it reads better, so `docs/redesign/chassis.md` §
 * "Conflicts" decides for the design. The README's claim is noted, not obeyed.
 *
 * ## One number is still the server's
 *
 * The design's Goals tab says "nine months a year" — the same wrong figure as
 * Profile's roll-up chain. `PROFILE_SETTINGS.autoCheckThreshold` is the one
 * definition (month = 6), so the sentence is built from it: About and Profile
 * cannot say different things about the same cascade.
 */
import { PROFILE_SETTINGS } from './settings';

/** The hero line. One belief, stated once. */
export const ABOUT_BELIEF = 'Incremental daily achievement compounds into outcomes that seemed impossible.';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve'];

/** "five", not "5" — the sentence is prose, and 13+ falls back to digits. */
export function spellOut(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return String(count);
  return WORDS[n] || String(n);
}

/** "five day wins complete a week, three weeks a month, six months a year". */
export function winsRollUpText(threshold) {
  const th = { ...PROFILE_SETTINGS.autoCheckThreshold, ...(threshold || {}) };
  return `${spellOut(th.day)} day wins complete a week, ${spellOut(th.week)} weeks a month, `
    + `${spellOut(th.month)} months a year — you never mark a year done, you arrive at it.`;
}

/**
 * The five tabs, in the design's order. A point with no `term` leads with an
 * arrow instead of a bold lead-in; one with a term renders `**term** · text`.
 */
export function aboutFeatures(threshold) {
  return [
    {
      key: 'routines',
      label: 'Routines',
      icon: 'schedule',
      title: 'Your day, time-boxed',
      lead: 'Routine Notes lays your day on a timeline, keeps score on punctuality, and never lets a missed check-in silently disappear.',
      points: [
        { term: 'Punctuality window', text: 'each routine opens a window around its start time — tick inside it and the check-in counts as on time.' },
        { term: 'Quick tasks', text: 'drop one-off work into the current routine slot, so improvised work still lands in a time box.' },
        { term: 'Past, not gone', text: 'miss the window and the routine moves to Past with a redeem button — check in late with points, streak intact.' },
        { term: 'Skip Day', text: 'pause the loop for travel or a sick day without wrecking your history.' },
      ],
    },
    {
      key: 'goals',
      label: 'Goals',
      icon: 'assignment',
      title: 'The year → day cascade',
      lead: 'Turn one yearly ambition into month, week and day milestones — then let your daily wins roll back up.',
      points: [
        { text: 'Break a year goal into month and week milestones, each decomposing into schedulable day goals.' },
        { term: 'Link days to routines', text: 'a day goal attached to a routine shows on the Home card, so the plan and the timeline are the same object.' },
        { term: 'Wins roll up', text: winsRollUpText(threshold) },
        { text: 'A calendar view prints each day’s goal count, so gaps are visible before they become months.' },
      ],
    },
    {
      key: 'priority',
      label: 'Priority',
      icon: 'view_module',
      title: 'A self-sorting Do / Plan / Delegate / Automate matrix',
      lead: 'You never pick a quadrant. How and where you create a task decides it, so the matrix mirrors the shape of your day on its own.',
      points: [
        { term: 'Do', text: 'anything you start — or create — for today.' },
        { term: 'Plan', text: 'anything you schedule for a future day.' },
        { term: 'Delegate', text: '@mention a person in the task and it hands off.' },
        { term: 'Automate', text: 'kick a task off with an agent and it lands here.' },
      ],
    },
    {
      key: 'agents',
      label: 'Agents',
      icon: 'smart_toy',
      title: 'Automation attached to routines',
      lead: 'An agent is a worker glued to a routine — start the task and it fires, work and it listens, finish and it reports success or failure.',
      points: [
        { text: 'Bind an agent to a routine; the routine’s schedule becomes the agent’s schedule.' },
        { term: 'Wire the events', text: 'point a start event (and optional end event) at any URL — your webhook, n8n flow, or own endpoint — with the goal id substituted in.' },
        { term: 'Auditable lifecycle', text: 'idle → listening → finished, with success and failure counts per agent.' },
        { text: 'Redeem a late check-in and its agents still fire — automation shouldn’t punish a late human.' },
      ],
    },
    {
      key: 'evolution',
      label: 'Evolution',
      icon: 'military_tech',
      title: 'The point system — a soldier taking the mountain',
      lead: 'Three things decide whether he makes it — and they are the three ways you earn points: 100 each, 300 a day.',
      points: [
        { term: 'Discipline', text: 'be present. Tick routines inside their punctuality window.' },
        { term: 'Kinetics', text: 'put in the work. Clear the steps and quick tasks in every slot.' },
        { term: 'Geniuses', text: 'plan the campaign. Plan week, month and year milestones and link them to today.' },
        { text: 'Points settle overnight and fund your AI agents — show up daily and AI stays free.' },
      ],
      link: 'https://blog.familywealth.in/2022/01/point-system-of-family-routine.html',
      linkLabel: 'Read the full soldier analogy',
    },
  ];
}

/** Built once with the shipped thresholds; a page may rebuild with the server's. */
export const ABOUT_FEATURES = aboutFeatures();

/**
 * "Getting started" — three numbered steps, each a link to the page where you
 * do that thing. `route` is the app's real path, so the step is navigable rather
 * than instructional.
 */
export const GETTING_STARTED = [
  {
    key: 'routines',
    title: 'Set honest start times',
    text: 'Morning first, where Discipline is cheapest.',
    route: '/settings',
  },
  {
    key: 'year-goals',
    title: 'Write one year goal',
    text: 'Cascade it down to a day goal you can schedule.',
    route: '/year-goals',
  },
  {
    key: 'home',
    title: 'Link it to a routine and show up',
    text: 'Earn your points on time and watch the loop compound.',
    route: '/home',
  },
];

export default {
  ABOUT_BELIEF,
  ABOUT_FEATURES,
  GETTING_STARTED,
  aboutFeatures,
  spellOut,
  winsRollUpText,
};
