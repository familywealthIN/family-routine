/**
 * GraphQL for the rebuilt Goals screen (packages/design/Goals.dc.html).
 *
 * The page has TWO reads because it asks two different questions, and no single
 * server field answers both:
 *
 *   1. `agendaGoals(date)` — the selected date's day goals PLUS the week, month,
 *      year and lifetime goals that contain it, each carrying `progress`, the
 *      count the cascade ladder and the streak bars render. `progress` exists
 *      only because `agendaGoals` runs `autoCheckTaskPeriod`, which also WRITES
 *      (it auto-ticks goals that crossed a threshold). So it is called once per
 *      date, never twice to compare two windows — docs/redesign/chassis.md and
 *      the warning in ARCHITECTURE § "Beware resolvers that write".
 *      That query already exists as `queries.AGENDA_GOALS_QUERY`; re-exported
 *      here so both reads are importable from one place, and NOT redeclared —
 *      a second document for the same field would be a second cache owner.
 *
 *   2. `goalsOptimized(currentMonth)` — every day of the visible month, which is
 *      what the calendar's one-ring-per-day grid needs. Declared below rather
 *      than reusing `queries.GOALS_OPTIMIZED_QUERY` for ONE reason: that query
 *      selects `progress`, and `goalsOptimized` never computes it. Apollo
 *      normalizes both reads into the same `GoalItem:<id>` records, so selecting
 *      a field the resolver cannot fill writes `null` over the real count that
 *      `agendaGoals` just put there — the streak bars would blink to an em dash
 *      on every month read. Omitting the field leaves that record untouched
 *      (ARCHITECTURE § 3.2).
 *
 * Both are display reads, so both run `cache-and-network` in their containers.
 *
 * WHY THERE IS NO THIRD READ (`goalsPast`)
 * ----------------------------------------
 * The old page ran `goalsPast` as well, behind a range toggle that was
 * `display: none` in its own template. It is not needed for the month chevrons:
 * `goalsOptimized`'s day branch is `{ period: 'day', date: { $in: datesInMonth } }`
 * — every day of the asked-for month, past days included (apps/server
 * resolvers/goal.js) — so stepping back to August returns August's day goals
 * from this one query. `goalsPast` returns the same `GoalItem` records for the
 * last 365 days, which would make it a SECOND cache owner of entities query #2
 * already holds, for no field query #2 lacks: exactly the drift ARCHITECTURE § 3
 * is about. The selected day's five periods come from `agendaGoals(date)`, which
 * takes any date, so a past day needs nothing extra either.
 */
import gql from 'graphql-tag';

export { AGENDA_GOALS_QUERY } from './queries';

/**
 * Routine identity — name + scheduled time per `taskRef`, which is what groups
 * every period's goals by routine in time order and places the NOW badge.
 *
 * Re-exported, not redeclared: `routineItems` takes no variables, so every
 * container that mounts this ONE document observes a single normalized cache
 * entry instead of racing copies (the `MissedDayRecovery` / `WeekdaySelector`
 * precedent). The agent containers already own that document.
 */
export { AGENT_ROUTINE_ITEMS_QUERY as ROUTINE_INDEX_QUERY } from './agentQueries';

/**
 * A month of day goals for the calendar.
 *
 * `goalsOptimized` also returns the month's week / month / year / lifetime
 * documents; those are harmless here (the same complete `goalItems` lists the
 * cascade read returns) and the calendar simply ignores them. What matters is
 * what is NOT selected: `progress`, `milestonesTotal`, `milestonesComplete` —
 * every field this resolver leaves undefined.
 */
export const GOALS_CALENDAR_QUERY = gql`
  query goalsCalendarMonth($currentMonth: String) {
    goalsOptimized(currentMonth: $currentMonth) {
      id
      date
      period
      goalItems {
        id
        body
        isComplete
        isMilestone
        taskRef
        goalRef
        status
        completedAt
      }
    }
  }
`;

export default { GOALS_CALENDAR_QUERY };
