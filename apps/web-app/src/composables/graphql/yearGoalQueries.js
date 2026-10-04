/**
 * Year Goals reads.
 *
 * Two queries, both deliberately chosen because they do NOT call
 * `autoCheckTaskPeriod`. That helper mutates while it reads — it `$set`s
 * `goalItems.$.isComplete: true` and a `completionNote` on any period whose
 * threshold is met (`apps/server/src/resolvers/goal.js`) — so a page that
 * reached for `dailyGoals` / `optimizedDailyGoals` / `agendaGoals` /
 * `monthTaskGoals` / `getProgress` to render a label would complete the user's
 * goals as a side effect of being looked at. `currentYearGoal` and
 * `currentYearGoals` are the two goal reads that are side-effect free.
 *
 * The price is that `progress`, `milestonesTotal`, `milestonesComplete` and
 * `milestoneDays` are not computed by these resolvers (they are never persisted
 * either), so they are not selected here and `utils/yearGoalModel.js` derives
 * every count from the milestone tree instead.
 *
 * `milestones` recurses on `GoalItemType`, and the resolver returns EVERY child
 * of the parent (not a filtered projection), so nesting three levels is safe:
 * each level's list is complete, and `yearGoalModel` filters by period
 * client-side. A scoped projection that reused an entity's id is what collapsed
 * a 14-item Goal to 2 in `goalsByGoalRef` — hence a full read plus a
 * client-side subset, never a narrower query.
 *
 * Writes are NOT redeclared here. `composables/useGoalMutations.js` already owns
 * `addGoalItem` / `completeGoalItem` / `updateGoalItem` / `deleteGoalItem` with
 * their optimistic responses, entity-level cache patches and `guardFields`
 * claims; the containers call them through `this.$goals`.
 */
import gql from 'graphql-tag';

/**
 * Every field the page reads off a goal item at any level of the tree.
 *
 * The last three are not drawn by any row — they are here because a DAY goal
 * opens in the full editor (`GoalEditDialogContainer`), the same one the
 * dashboard and the Goals page open, and that editor saves through
 * `updateGoalItem`, whose `$deadline` / `$reward` are `String!` and `$set`
 * unconditionally. A field the editor cannot READ is a field the next save
 * ERASES, so `deadline` and `reward` have to be readable here for the form to
 * echo them back — the same reason `priorityQueries` selects `deadline`. And
 * `subTasks` is half of what makes a day goal more than a title.
 *
 * None of them costs a query: `currentYearGoal` and the `milestones` resolver
 * both return the stored goal item whole, so these are already in hand
 * server-side. They also match what `AGENDA_GOALS_QUERY` writes onto the same
 * normalized `GoalItem:<id>`, so the two reads agree field-for-field instead of
 * one of them leaving the editor a hole (ARCHITECTURE § 3.2).
 */
const GOAL_NODE_FIELDS = `
  id
  body
  date
  period
  status
  isComplete
  isMilestone
  taskRef
  goalRef
  tags
  contribution
  deadline
  reward
  subTasks {
    id
    body
    isComplete
  }
`;

/**
 * The focused year goal with its month → week → day milestones.
 *
 * Despite the name the resolver is not year-scoped: it finds whatever goal item
 * carries `id`. It is also the only read path that stamps `date` / `period` back
 * onto the item from its parent Goal document, which the whole model depends on.
 */
export const YEAR_GOAL_TREE_QUERY = gql`
  query currentYearGoal($id: ID!) {
    currentYearGoal(id: $id) {
      ${GOAL_NODE_FIELDS}
      routine {
        id
        name
      }
      milestones {
        ${GOAL_NODE_FIELDS}
        routine {
          id
          name
        }
        milestones {
          ${GOAL_NODE_FIELDS}
          milestones {
            ${GOAL_NODE_FIELDS}
          }
        }
      }
    }
  }
`;

/**
 * Every year goal for the current year, for the goal switcher (phone sheet,
 * tablet shelf, desktop sidebar). Returns the year `Goal` containers with their
 * COMPLETE `goalItems`, so nothing here is a narrowed projection either.
 *
 * ONE milestone level only, on purpose. `GoalItem.milestones` runs a Mongo
 * `find` per node, so going three deep for every year goal would cost hundreds
 * of queries to draw a list of rows. The consequence is stated honestly in the
 * rows: a switcher row counts the months the SERVER has recorded as complete,
 * which is one number behind a month that the focused page has just auto-ticked
 * and the server has not yet persisted through `autoCheckTaskPeriod`. The
 * focused goal's own ring always reads the full tree.
 */
export const YEAR_GOALS_LIST_QUERY = gql`
  query currentYearGoals {
    currentYearGoals {
      id
      date
      period
      goalItems {
        ${GOAL_NODE_FIELDS}
        routine {
          id
          name
        }
        milestones {
          ${GOAL_NODE_FIELDS}
        }
      }
    }
  }
`;

export default {
  YEAR_GOAL_TREE_QUERY,
  YEAR_GOALS_LIST_QUERY,
};
