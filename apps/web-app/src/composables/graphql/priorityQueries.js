/**
 * Priority page GraphQL operations.
 *
 * One read and two writes, kept out of `queries.js` so the page owns its own
 * contract (same split as `chatQueries.js`).
 *
 * WHY ONE COMBINED READ
 * ---------------------
 * The board needs the day's goal items AND the day's routine tasklist: the
 * quadrant comes from an item's `priority:*` tag, the routine grouping and the
 * NOW badge come from the tasklist, and the parent-goal name on a row comes from
 * the week/month/year goals `optimizedDailyGoals` already returns. That is one
 * container, one organism, one operation (ARCHITECTURE § 2).
 *
 * `priorityGoals` is deliberately NOT used. It is a *filtered projection* — four
 * pre-bucketed lists off one Goal — and it cannot carry the unsorted items the
 * triage card exists to show. Reading the whole day and bucketing on the client
 * keeps every row in the same normalized `GoalItem:<id>` the dashboard writes,
 * so a tick on Home and a tick here are the same entity.
 */
import gql from 'graphql-tag';

/**
 * Field set matched to `DAILY_GOALS_QUERY`'s so both queries write the same
 * fields onto the same normalized GoalItem — a narrower selection would be fine
 * (Apollo 2.x normalizes field-by-field) but an *inconsistent* one invites
 * "where did `reward` go?" bugs. `deadline` is extra: the update mutation
 * `$set`s it, so the board has to be able to echo the current value back.
 */
const PRIORITY_GOAL_ITEM_FIELDS = `
  id
  body
  progress
  isComplete
  taskRef
  goalRef
  isMilestone
  contribution
  reward
  deadline
  tags
  status
  completedAt
  originalDate
  subTasks {
    id
    body
    isComplete
  }
`;

export const PRIORITY_BOARD_QUERY = gql`
  query priorityBoard($date: String!) {
    optimizedDailyGoals(date: $date) {
      id
      date
      period
      goalItems {
        ${PRIORITY_GOAL_ITEM_FIELDS}
      }
    }
    routineDate(date: $date) {
      id
      date
      tasklist {
        id
        name
        time
        ticked
        stimuli {
          name
          earned
        }
      }
    }
  }
`;

/**
 * Move an item between quadrants.
 *
 * There is no tags-only mutation on the server, so this is `updateGoalItem` with
 * every other field echoed back unchanged — the resolver `$set`s all of them, so
 * omitting one would blank it. The caller builds the variables with
 * {@link buildQuadrantVariables} rather than by hand, for exactly that reason.
 *
 * The selection is the COMPLETE entity (ARCHITECTURE principle #2): Apollo
 * normalizes it into `GoalItem:<id>` and every query holding that id updates for
 * free, with no list rewriting anywhere.
 */
export const SET_GOAL_ITEM_QUADRANT_MUTATION = gql`
  mutation setGoalItemQuadrant(
    $id: ID!
    $date: String!
    $period: String!
    $body: String
    $deadline: String
    $contribution: String
    $reward: String
    $isMilestone: Boolean
    $taskRef: String
    $goalRef: String
    $tags: [String]
  ) {
    updateGoalItem(
      id: $id
      date: $date
      period: $period
      body: $body
      deadline: $deadline
      contribution: $contribution
      reward: $reward
      isMilestone: $isMilestone
      taskRef: $taskRef
      goalRef: $goalRef
      tags: $tags
    ) {
      id
      body
      contribution
      deadline
      reward
      tags
      isComplete
      isMilestone
      status
      taskRef
      goalRef
      originalDate
    }
  }
`;

/**
 * "Make it a routine" — the AUTOMATE chip.
 *
 * `routineDate` re-syncs the day's tasklist from `routineItems` on every read
 * (resolvers/routine.js), so a routine item created now shows up in TODAY's
 * tasklist as soon as the board query refetches. That is what flips the chip to
 * "Routine task" — no client-side flag, no extra tag.
 */
export const ADD_PRIORITY_ROUTINE_ITEM_MUTATION = gql`
  mutation addPriorityRoutineItem(
    $name: String!
    $description: String!
    $time: String!
    $points: Int!
    $tags: [String]
  ) {
    addRoutineItem(
      name: $name
      description: $description
      time: $time
      points: $points
      tags: $tags
    ) {
      id
      name
      description
      time
      points
      tags
    }
  }
`;

/**
 * Variables for {@link SET_GOAL_ITEM_QUADRANT_MUTATION}. Every `$set` field is
 * read off the row so the write changes the tags and nothing else.
 *
 * @param {Object} item   a board row (see utils/priorityBoard `toRow`)
 * @param {String[]} tags the new tag list
 */
export function buildQuadrantVariables(item, tags) {
  return {
    id: item.id,
    date: item.date,
    period: item.period,
    body: item.body || '',
    deadline: item.deadline || '',
    contribution: item.contribution || '',
    reward: item.reward || '',
    isMilestone: !!item.isMilestone,
    taskRef: item.taskRef || '',
    goalRef: item.goalRef || '',
    tags,
  };
}

export default {
  PRIORITY_BOARD_QUERY,
  SET_GOAL_ITEM_QUADRANT_MUTATION,
  ADD_PRIORITY_ROUTINE_ITEM_MUTATION,
  buildQuadrantVariables,
};
