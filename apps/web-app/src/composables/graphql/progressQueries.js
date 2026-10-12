/**
 * Progress screen GraphQL.
 *
 * One read, one operation: `getProgress` returns the whole report for a window
 * (statement + every card slot), so `ProgressReportContainer` owns exactly this
 * and nothing else - see containers/ARCHITECTURE.md § 2.
 *
 * `queries.js` is deliberately untouched: the redesign lands page by page and a
 * shared file is a shared merge conflict.
 *
 * `values { id }` is new against the operation the old page ran. The id is the
 * routine item's `_id` (`getScore` carries it through
 * `getBestRoutineSorted`), and it is what makes a "Needs attention" row open
 * THAT routine instead of the generic Routines list.
 *
 * Cache note: `ProgressItem` / `ProgressItemValues` are excluded from
 * normalization in `apollo/dataIdFromObject.js`. A card's id is a slot name
 * every period reuses, so normalizing them would put one period's number in
 * another period's card (the D-13 symptom by a second route). The report is
 * therefore cached per-operation-variables, which is exactly right: one entry
 * per window asked for.
 */
import gql from 'graphql-tag';

export const PROGRESS_REPORT_QUERY = gql`
  query getProgress($period: String!, $startDate: String!, $endDate: String!) {
    getProgress(period: $period, startDate: $startDate, endDate: $endDate) {
      progressStatement
      period
      startDate
      endDate
      cards {
        id
        name
        value
        description
        values {
          id
          name
          value
          total
        }
      }
    }
  }
`;

/**
 * On time / late / missed check-ins for a date range (resolvers/progress.js
 * `routineTiming`). The drawer's day ribbon reads two weeks; the Progress page's
 * Timing card reads the period on screen. Its slot and routine rows are kept out
 * of normalization (apollo/dataIdFromObject.js): their counts belong to the range.
 */
export const ROUTINE_TIMING_QUERY = gql`
  query routineTiming($startDate: String!, $endDate: String!, $today: String) {
    routineTiming(startDate: $startDate, endDate: $endDate, today: $today) {
      startDate
      endDate
      onTime
      late
      missed
      pending
      days {
        date
        skip
        onTime
        late
        missed
        pending
        slots { id name time state }
      }
      routines { id name time onTime late missed pending }
    }
  }
`;

export default { PROGRESS_REPORT_QUERY, ROUTINE_TIMING_QUERY };
