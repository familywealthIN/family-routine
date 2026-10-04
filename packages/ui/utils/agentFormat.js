/**
 * Agent run labels — "Today 09:02", "Fri 15:48", "never".
 *
 * The mock hands the view pre-written strings (`lastRunAt: 'Today 09:02'`).
 * The real `Agent.lastRunAt` is a timestamp, so the sentence has to be built
 * here. Kept out of `constants/agents.js` because that file is colour and copy
 * tokens only and must stay dependency-free.
 */
import moment from 'moment';

/** Older than a week the weekday stops identifying the day — show the date. */
const WEEK_DAYS = 6;

/**
 * @param {string|number|Date} value  an Agent's lastRunAt
 * @param {string|number|Date} [now]  injectable clock, for tests
 * @returns {string} 'never' when the agent has not run
 */
export function formatLastRun(value, now = undefined) {
  if (value === null || value === undefined || value === '') return 'never';
  // A numeric string is a millisecond timestamp (what Mongo gives GraphQL for a
  // Date through a String field); moment would otherwise read '1696000000000'
  // as an ISO year.
  const raw = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  const at = moment(raw);
  if (!at.isValid()) return String(value);
  const ref = now === undefined ? moment() : moment(now);
  if (at.isSame(ref, 'day')) return `Today ${at.format('HH:mm')}`;
  if (ref.diff(at, 'days') <= WEEK_DAYS && at.isBefore(ref)) return at.format('ddd HH:mm');
  return at.format('D MMM HH:mm');
}

/**
 * The card's one-line footer. A failed run says so instead of naming a result
 * type it does not have.
 */
export function lastRunLabel(agent, now = undefined) {
  if (!agent) return '';
  const when = formatLastRun(agent.lastRunAt, now);
  if (agent.executionStatus === 'failed') return `Last run ${when} · failed`;
  if (when === 'never') return 'Never run';
  return `Last run ${when} · ${agent.lastResultType || '—'}`;
}

/** The detail pane's LAST RESULT right-hand meta. */
export function lastResultMeta(agent, now = undefined) {
  if (!agent) return '';
  const when = formatLastRun(agent.lastRunAt, now);
  const kind = agent.executionStatus === 'failed' ? 'error' : (agent.lastResultType || '—');
  return `${when} · ${kind}`;
}

export default { formatLastRun, lastRunLabel, lastResultMeta };
