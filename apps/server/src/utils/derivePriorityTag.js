const moment = require('moment');

/**
 * Server-side priority fallback.
 *
 * The client stamps a deterministic `priority:<bucket>` tag on every goal item
 * it creates (see web-app `utils/taskPriority`). This helper covers the paths
 * that don't go through the UI — MCP `add_goal_item`, external API callers,
 * imports — so those items are still bucketed by the `priorityGoals` matrix.
 *
 * It implements the same rule minus `automate`: the "Start Agent" signal is
 * client-only, so the server can only ever produce `plan` / `delegate` / `do`.
 * It NEVER overrides a priority tag the client already supplied.
 */
const DATE_FORMAT = 'DD-MM-YYYY';

// "@" preceded by start-of-string or whitespace, then a name. Strict @name so
// detection is deterministic (matches the client's extractAssignee).
const MENTION_RE = /(?:^|\s)@([A-Za-z][\w.-]*)/;

/**
 * @param {Object} ctx
 * @param {string} [ctx.period='day']
 * @param {string} [ctx.date]   DD-MM-YYYY
 * @param {string} [ctx.body='']
 * @param {string} [ctx.today]  DD-MM-YYYY (defaults to now)
 * @returns {'do'|'plan'|'delegate'}
 */
function derivePriority({
  period = 'day',
  date,
  body = '',
  today = moment().format(DATE_FORMAT),
} = {}) {
  if (period && period !== 'day') return 'plan';

  const target = moment(date, DATE_FORMAT, true);
  const todayMoment = moment(today, DATE_FORMAT, true);
  if (target.isValid() && todayMoment.isValid() && target.isAfter(todayMoment, 'day')) {
    return 'plan';
  }

  if (MENTION_RE.test(String(body || ''))) return 'delegate';
  return 'do';
}

/**
 * Return tags guaranteed to carry a `priority:*` tag. If the caller already
 * supplied one, the array is returned untouched (client stamping wins);
 * otherwise a deterministic default is appended, plus `assignee:<name>` for a
 * derived delegate.
 *
 * @param {string[]} tags
 * @param {Object} context  see {@link derivePriority}
 * @returns {string[]}
 */
function ensurePriorityTag(tags, context = {}) {
  const list = Array.isArray(tags) ? tags : [];
  if (list.some((tag) => String(tag).startsWith('priority:'))) return list;

  const priority = derivePriority(context);
  const next = [...list, `priority:${priority}`];

  if (priority === 'delegate') {
    const match = MENTION_RE.exec(String(context.body || ''));
    if (match && !next.some((tag) => String(tag).startsWith('assignee:'))) {
      next.push(`assignee:${match[1]}`);
    }
  }

  return next;
}

module.exports = { derivePriority, ensurePriorityTag };
