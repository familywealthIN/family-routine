/**
 * Priority board model — the pure derivation behind the Priority page.
 *
 * The page/container feed it the day's goals plus the day's routine tasklist and
 * get back exactly what the organism renders: four quadrants with counts, a done
 * ring percentage and routine-grouped rows, plus the triage queue.
 *
 * Kept out of the container (and out of `packages/ui`) for the same reason
 * `utils/routineFocusModel` is: it is the only place the rules live, so the
 * container, the page's toasts and the tests all read one definition.
 *
 * THE QUADRANT IS A TAG. `utils/taskPriority` stamps exactly one
 * `priority:do|plan|delegate|automate` onto every goal item it creates, and the
 * server's `ensurePriorityTag` covers the paths that bypass the UI. An item with
 * no such tag has never been sorted — that is the triage queue, and it is the
 * only definition of "unsorted" this page uses.
 */
import moment from 'moment';
import { PRIORITY_BUCKETS } from './taskPriority';
import { findCurrentRoutine, toMinutes } from './routineFocusModel';

export const PRIORITY_PREFIX = 'priority:';
export const NO_ROUTINE_KEY = 'none';
export const NO_ROUTINE_LABEL = 'No routine';
/** The "No routine" bucket always sorts last, whatever the real times are. */
export const NO_ROUTINE_TIME = '—';

const DAY = 'day';

/** The one `priority:*` tag on an item, or null when it has never been sorted. */
export function quadrantFromTags(tags) {
  const list = Array.isArray(tags) ? tags : [];
  const found = list
    .map((tag) => String(tag))
    .find((tag) => tag.indexOf(PRIORITY_PREFIX) === 0);
  if (!found) return null;
  const key = found.slice(PRIORITY_PREFIX.length);
  return PRIORITY_BUCKETS.indexOf(key) === -1 ? null : key;
}

/** Tags with every `priority:*` replaced by this one. Order is otherwise kept. */
export function tagsWithQuadrant(tags, quadrant) {
  const kept = (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag))
    .filter((tag) => tag.indexOf(PRIORITY_PREFIX) !== 0);
  return [...kept, `${PRIORITY_PREFIX}${quadrant}`];
}

/** Every goal item in every period, by id — a day item's `goalRef` parent name. */
export function bodyByGoalItemId(goals) {
  const map = {};
  (goals || []).forEach((goal) => {
    ((goal && goal.goalItems) || []).forEach((item) => {
      if (item && item.id) map[item.id] = item.body;
    });
  });
  return map;
}

/**
 * The day's goal items, de-duped by id (ARCHITECTURE principle #6 — a repeated
 * id gives duplicate `:key`s and Vue patches the wrong row), each stamped with
 * the `date`/`period` of the Goal document that owns it so a write knows where
 * the subdocument lives.
 */
export function dayGoalItems(goals) {
  const seen = {};
  const out = [];
  (goals || [])
    .filter((goal) => goal && goal.period === DAY)
    .forEach((goal) => {
      ((goal.goalItems) || []).forEach((item) => {
        if (!item || !item.id || seen[item.id]) return;
        seen[item.id] = true;
        out.push({ ...item, date: goal.date, period: goal.period });
      });
    });
  return out;
}

/** Routine tasks in time order, de-duped by id, plus the trailing bucket. */
export function routineOrder(tasklist) {
  const seen = {};
  const list = (tasklist || [])
    .filter((task) => {
      if (!task || !task.id || seen[task.id]) return false;
      seen[task.id] = true;
      return true;
    })
    .slice()
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
    .map((task) => ({ id: task.id, time: task.time, name: task.name }));

  return [...list, { id: NO_ROUTINE_KEY, time: NO_ROUTINE_TIME, name: NO_ROUTINE_LABEL }];
}

/**
 * The DELEGATE chip's state for one row, from the day-scoped agent badges.
 *
 * Agents are attached to a ROUTINE TASK (`agent.taskRef`), not to a goal item, so
 * a row with no `taskRef` has nothing to hand over and shows no chip at all.
 *
 * A saved transcript (`reward`) wins over any badge — exactly the
 * reward-authoritative override `RoutineFocus.effectiveAgentStatus` applies —
 * because a late START dispatch resolving after the end event would otherwise
 * drag a finished run back to "running". `failed` falls through to `ready` so a
 * failed hand-off can be retried rather than looking permanently busy.
 *
 * @param {Object} item                  a day goal item
 * @param {Object} statusByTaskRef       $agent.statusByRoutineId
 * @returns {''|'ready'|'running'|'done'}
 */
export function delegateAgentState(item, statusByTaskRef = {}) {
  if (!item || !item.taskRef) return '';
  if (item.reward) return 'done';
  const status = statusByTaskRef[item.taskRef] || '';
  if (status === 'running' || status === 'listening') return 'running';
  if (status === 'finished') return 'done';
  return 'ready';
}

function subtaskLabel(item) {
  const subs = (item && item.subTasks) || [];
  if (!subs.length) return '';
  const done = subs.filter((sub) => sub && sub.isComplete).length;
  return `${done}/${subs.length} subtasks`;
}

/**
 * The row contract the organism renders. `meta` follows the design: the linked
 * parent goal with an up-arrow, then the subtask counter, joined by " · ".
 */
export function toRow(item, {
  parentBodies = {}, agentStateFor, automatedFor, rule,
}) {
  const parentBody = item.goalRef ? parentBodies[item.goalRef] || '' : '';
  const quadrant = quadrantFromTags(item.tags);
  const meta = [parentBody ? `↑ ${parentBody}` : '', subtaskLabel(item)]
    .filter(Boolean)
    .join(' · ');

  return {
    id: item.id,
    body: item.body,
    progress: item.progress,
    isComplete: !!item.isComplete,
    taskRef: item.taskRef || '',
    goalRef: item.goalRef || '',
    tags: item.tags || [],
    reward: item.reward || '',
    date: item.date,
    period: item.period,
    isMilestone: !!item.isMilestone,
    subTasks: item.subTasks || [],
    // Echoed back verbatim by the quadrant write's optimistic response.
    contribution: item.contribution || '',
    deadline: item.deadline || '',
    status: item.status || null,
    originalDate: item.originalDate || null,
    parentBody,
    meta,
    quadrant,
    agentState: agentStateFor ? agentStateFor(item) : '',
    automated: automatedFor ? !!automatedFor(item) : false,
    rule,
  };
}

function groupRows(rows, order, nowId) {
  // A row linked to a routine that isn't on this day's list (e.g. one since
  // removed from the routine) would match no group and silently vanish while
  // still counting toward the quadrant total, so it falls under NO ROUTINE.
  const known = new Set(order.map((routine) => routine.id));
  const keyOf = (row) => (row.taskRef && known.has(row.taskRef) ? row.taskRef : NO_ROUTINE_KEY);
  return order
    .map((routine) => {
      const inRoutine = rows.filter((row) => keyOf(row) === routine.id);
      if (!inRoutine.length) return null;
      return {
        key: routine.id,
        time: routine.time,
        name: routine.name,
        isNow: routine.id === nowId,
        rows: inRoutine,
      };
    })
    .filter(Boolean);
}

/**
 * @param {Object}   params
 * @param {Array}    params.goals      optimizedDailyGoals (all periods)
 * @param {Array}    params.tasklist   the day's routine tasks
 * @param {Array}    params.quadrants  the four QUADRANTS tokens, in grid order
 * @param {Object}   [params.now]      moment, for the NOW badge
 * @param {Function} [params.agentStateFor]  item -> '' | 'ready' | 'running' | 'done'
 * @param {Function} [params.automatedFor]   item -> Boolean
 * @param {String}   [params.rule]     the automate chip's cadence
 * @param {Array}    [params.skipped]  ids deferred to the back of the triage queue
 */
export function buildPriorityBoard({
  goals = [],
  tasklist = [],
  quadrants = [],
  now = null,
  agentStateFor = null,
  automatedFor = null,
  rule = '',
  skipped = [],
} = {}) {
  const parentBodies = bodyByGoalItemId(goals);
  const rows = dayGoalItems(goals)
    .map((item) => toRow(item, {
      parentBodies, agentStateFor, automatedFor, rule,
    }));

  const order = routineOrder(tasklist);
  const currentRoutine = findCurrentRoutine(
    order.filter((routine) => routine.id !== NO_ROUTINE_KEY),
    now || moment(),
  );
  const nowId = (currentRoutine && currentRoutine.id) || '';

  const deferred = {};
  (skipped || []).forEach((id, index) => { deferred[id] = index + 1; });
  const triage = rows
    .filter((row) => !row.quadrant)
    // A skipped item goes to the BACK of the queue; it keeps no quadrant.
    .sort((a, b) => (deferred[a.id] || 0) - (deferred[b.id] || 0));

  const enriched = quadrants.map((quadrant) => {
    const mine = rows.filter((row) => row.quadrant === quadrant.key);
    const done = mine.filter((row) => row.isComplete).length;
    return {
      ...quadrant,
      total: mine.length,
      done,
      open: mine.length - done,
      pct: mine.length ? Math.round((done / mine.length) * 100) : 0,
      groups: groupRows(mine, order, nowId),
    };
  });

  return {
    rows,
    triage,
    quadrants: enriched,
    openTotal: enriched.reduce((sum, quadrant) => sum + quadrant.open, 0),
    nowRoutineId: nowId,
  };
}

export default {
  PRIORITY_PREFIX,
  NO_ROUTINE_KEY,
  NO_ROUTINE_LABEL,
  quadrantFromTags,
  tagsWithQuadrant,
  delegateAgentState,
  bodyByGoalItemId,
  dayGoalItems,
  routineOrder,
  toRow,
  buildPriorityBoard,
};
