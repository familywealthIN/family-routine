/**
 * Goal-item operations for the Routine Focus goal-item page, the Inbox and
 * skip day.
 *
 * Separate from `composables/graphql/queries.js` on purpose: that file is the
 * shared dashboard surface and every page reads from it, so adding to it widens
 * the blast radius of a bad selection set. These documents are owned by three
 * containers and nothing else.
 *
 * Every mutation here selects the **complete** entity it changes, with the right
 * `__typename`, so Apollo normalizes it and every query holding that id updates
 * without any manual cache surgery (containers/ARCHITECTURE.md §3 principle #2).
 */
import gql from 'graphql-tag';

/**
 * The whole GoalItem as the focus screen reads it. Kept identical to
 * `DAILY_GOALS_QUERY`'s selection so a mutation result cannot leave a field of
 * the normalized entity behind.
 */
export const GOAL_ITEM_SHEET_FIELDS = `
  id
  body
  progress
  isComplete
  isMilestone
  contribution
  reward
  taskRef
  goalRef
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

/**
 * Edit a goal item in place — title, contribution, tags, routine, parent goal.
 *
 * `updateGoalItem` is a **full replace**: its resolver `$set`s every field it
 * was given, and `tags` defaults to `[]`, so an omitted `tags` wipes them.
 * Callers must always send the item's current values for everything they are
 * not changing — see `GoalItemSheetContainer.writeItem`.
 *
 * Passing a `date` other than the item's own is how the item MOVES: the resolver
 * detects it and relocates the subdocument to that day's Goal document, keeping
 * the same `_id` (so the normalized entity survives). `rescheduleGoalItem` does
 * the same thing but mints a new id, which would orphan every cached reference —
 * do not use it here.
 */
export const UPDATE_GOAL_ITEM_FIELDS_MUTATION = gql`
  mutation updateGoalItemFields(
    $id: ID!
    $date: String!
    $period: String!
    $body: String
    $contribution: String
    $reward: String
    $deadline: String
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
      contribution: $contribution
      reward: $reward
      deadline: $deadline
      isMilestone: $isMilestone
      taskRef: $taskRef
      goalRef: $goalRef
      tags: $tags
    ) {
      ${GOAL_ITEM_SHEET_FIELDS}
    }
  }
`;

/**
 * Rename one sub-task.
 *
 * Returns the `SubTaskItem`, which Apollo normalizes under `SubTaskItem:<id>` —
 * a rename changes nothing about the parent's list, so no parent write is needed.
 */
export const RENAME_SUB_TASK_ITEM_MUTATION = gql`
  mutation renameSubTaskItem(
    $id: ID!
    $taskId: ID!
    $date: String!
    $period: String!
    $body: String!
  ) {
    updateSubTaskItem(
      id: $id
      taskId: $taskId
      date: $date
      period: $period
      body: $body
    ) {
      id
      body
      isComplete
    }
  }
`;

/**
 * Move a sub-task. Order has no field of its own — it is the array order — so
 * this is the one sub-task write that must return the parent goal item.
 */
export const REORDER_SUB_TASK_ITEMS_MUTATION = gql`
  mutation reorderSubTaskItems(
    $taskId: ID!
    $date: String!
    $period: String!
    $ids: [ID!]!
  ) {
    reorderSubTaskItems(taskId: $taskId, date: $date, period: $period, ids: $ids) {
      ${GOAL_ITEM_SHEET_FIELDS}
    }
  }
`;

/**
 * Pause a day's routines.
 *
 * The same mutation the classic dashboard's Skip Day switch calls (it declares
 * it inline); this is the shared document so the two screens cannot drift. `id`
 * is the **Routine document** id for the day, not a routine item.
 *
 * The server refuses a third skip in one week ("You have already skip 2 days
 * this week.") — surface that message rather than a generic failure.
 *
 * There is no `reason` argument and no `Routine.skipReason` field, so the sheet's
 * optional reason is recorded in the day's routine chat, not on the Routine.
 */
export const SKIP_ROUTINE_MUTATION = gql`
  mutation skipRoutine($id: ID!, $skip: Boolean!) {
    skipRoutine(id: $id, skip: $skip) {
      id
      skip
    }
  }
`;

export default {
  GOAL_ITEM_SHEET_FIELDS,
  UPDATE_GOAL_ITEM_FIELDS_MUTATION,
  RENAME_SUB_TASK_ITEM_MUTATION,
  REORDER_SUB_TASK_ITEMS_MUTATION,
  SKIP_ROUTINE_MUTATION,
};
