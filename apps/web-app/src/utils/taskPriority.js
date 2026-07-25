/**
 * Deterministic priority tagging for goal items.
 *
 * Every goal item carries exactly one Eisenhower quadrant tag —
 * `priority:do` | `priority:plan` | `priority:delegate` | `priority:automate` —
 * decided by HOW / WHERE it was created, not by AI classification:
 *
 *   - do       Start Task, or any task created for today.
 *   - plan     A task created for a future day (or a non-day planning horizon).
 *   - delegate A task with a person @mentioned in its body.
 *   - automate A task started with an agent ("Start Agent").
 *
 * Precedence: any future date (or non-`day` period) always wins as `plan`.
 * Only today's tasks compete for automate > delegate > do.
 *
 * The value lives inside the goal item's `tags` array (no schema field), which
 * the server's `priorityGoals` resolver already buckets into the matrix. For
 * `delegate`, the mentioned person is also recorded as an `assignee:<name>` tag.
 */
import moment from 'moment';

export const PRIORITY_BUCKETS = ['do', 'plan', 'delegate', 'automate'];

const DATE_FORMAT = 'DD-MM-YYYY';

// A person mention: "@" preceded by start-of-string or whitespace, then a
// letter and word/dot/hyphen characters. Kept strict to @name so detection is
// deterministic — freeform "for John" parsing is intentionally out of scope.
const MENTION_RE = /(?:^|\s)@([A-Za-z][\w.-]*)/;

/**
 * First @mention in a task body, or null.
 * @param {string} body
 * @returns {string|null}
 */
export function extractAssignee(body = '') {
  const match = MENTION_RE.exec(String(body || ''));
  return match ? match[1] : null;
}

/**
 * Derive the priority bucket from the creation context.
 * @param {Object}  ctx
 * @param {string}  [ctx.period='day']       goal period (day|week|month|year|lifetime)
 * @param {string}  [ctx.date]               target date, DD-MM-YYYY
 * @param {boolean} [ctx.explicitAgent=false] created via "Start Agent"
 * @param {string}  [ctx.body='']            task body (scanned for @mention)
 * @param {string}  [ctx.today]              override for "today" (DD-MM-YYYY)
 * @returns {'do'|'plan'|'delegate'|'automate'}
 */
export function derivePriority({
  period = 'day',
  date,
  explicitAgent = false,
  body = '',
  today = moment().format(DATE_FORMAT),
} = {}) {
  // Non-day goals are a planning horizon by definition.
  if (period && period !== 'day') return 'plan';

  // A future day is always Plan, regardless of agent / assignee.
  const target = moment(date, DATE_FORMAT, true);
  const todayMoment = moment(today, DATE_FORMAT, true);
  if (target.isValid() && todayMoment.isValid() && target.isAfter(todayMoment, 'day')) {
    return 'plan';
  }

  // Today's work competes: Start Agent, then a person mention, then the default.
  if (explicitAgent) return 'automate';
  if (extractAssignee(body)) return 'delegate';
  return 'do';
}

/**
 * Return a NEW tags array with the derived `priority:*` tag applied.
 *
 * Any existing `priority:*` / `assignee:*` tags are stripped first so the
 * deterministic value always wins (e.g. over an AI-supplied priority tag).
 * For `delegate`, an `assignee:<name>` tag is appended.
 *
 * @param {string[]} tags     the item's current tags
 * @param {Object}   context  see {@link derivePriority}
 * @returns {string[]}
 */
export function applyPriorityTags(tags = [], context = {}) {
  const priority = derivePriority(context);
  const cleaned = (Array.isArray(tags) ? tags : []).filter((tag) => {
    const t = String(tag);
    return !t.startsWith('priority:') && !t.startsWith('assignee:');
  });

  cleaned.push(`priority:${priority}`);

  if (priority === 'delegate') {
    const name = extractAssignee(context.body);
    if (name) cleaned.push(`assignee:${name}`);
  }

  return cleaned;
}

export default {
  PRIORITY_BUCKETS,
  extractAssignee,
  derivePriority,
  applyPriorityTags,
};
