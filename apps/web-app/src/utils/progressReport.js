/**
 * Pure reading of the `getProgress` report, plus the period window and the
 * labels around it. Kept out of the container so every decision the Progress
 * page makes about the server's payload is unit-testable without Apollo.
 *
 * The report is a list of CARD SLOTS (`efficiency`, `radar-chart`,
 * `task-activities`, `good`, `bad`) built by
 * `apps/server/src/utils/getProgressReport.js`. Two things about it drive
 * almost everything here:
 *
 *  1. Every scalar crosses GraphQL as a String (`ProgressItemTypeFields` types
 *     `value` and `total` as GraphQLString), so '58%' and '12' both arrive as
 *     text and have to be read back as numbers.
 *  2. A slot the server could not fill is ABSENT, not zero. Absent reads back
 *     as `null` here and the UI prints an em dash, because a figure we failed
 *     to load is not a figure of nought.
 *
 * Routine Efficiency itself is never computed here. The server owns the single
 * definition (D-13) and ships both the number and its wording on the
 * `efficiency` card; this module only parses the percentage out of the string.
 */
import moment from 'moment';
import { PROGRESS_CARDS, COMPLETED_ROWS } from '@routine-notes/ui/constants/progress';

export const DATE_FORMAT = 'DD-MM-YYYY';

/** The four periods `getProgress` accepts, in switch order. */
export const PERIODS = ['day', 'week', 'month', 'year'];

export function normalisePeriod(period) {
  return PERIODS.indexOf(period) === -1 ? 'week' : period;
}

/**
 * The window the report is asked for: the start of the period through today.
 * Matches what ProgressTime has always sent (`startOf(period)` .. today) and
 * what CheckHistory copies, so both screens read one number.
 */
export function periodWindow(period, today) {
  const end = today ? moment(today, DATE_FORMAT) : moment();
  return {
    startDate: end.clone().startOf(normalisePeriod(period)).format(DATE_FORMAT),
    endDate: end.format(DATE_FORMAT),
  };
}

/** "Saturday, 12 September" / "Week of 6 – 12 September" / ... */
export function rangeLabel(period, startDate, endDate) {
  const start = moment(startDate, DATE_FORMAT);
  const end = moment(endDate, DATE_FORMAT);
  if (!start.isValid() || !end.isValid()) return '';

  if (period === 'day') return end.format('dddd, D MMMM');

  if (period === 'week') {
    const from = start.month() === end.month() ? start.format('D') : start.format('D MMMM');
    return `Week of ${from} – ${end.format('D MMMM')}`;
  }

  if (period === 'month') {
    const days = end.date();
    return `${end.format('MMMM YYYY')} · ${days} ${days === 1 ? 'day' : 'days'} in`;
  }

  const months = start.month() === end.month()
    ? end.format('MMMM')
    : `${start.format('MMMM')} – ${end.format('MMMM')}`;
  return `${end.format('YYYY')} · ${months}`;
}

/** What the delta compares against: "yesterday" / "last week" / "August" / "2025". */
export function previousLabel(period, startDate) {
  if (period === 'day') return 'yesterday';
  if (period === 'week') return 'last week';
  const start = moment(startDate, DATE_FORMAT);
  if (!start.isValid()) return '';
  if (period === 'month') return start.clone().subtract(1, 'month').format('MMMM');
  return start.clone().subtract(1, 'year').format('YYYY');
}

export function findCard(progress, id) {
  const cards = (progress && progress.cards) || [];
  return cards.find((card) => card && card.id === id) || null;
}

/** `'58%'` -> 58. Anything unparseable -> null, never 0. */
export function toNumber(value) {
  if (value == null) return null;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function efficiencyOf(progress) {
  const card = findCard(progress, PROGRESS_CARDS.efficiency);
  const value = toNumber(card && card.value);
  return {
    value: value == null ? null : Math.round(value),
    /** The server's sentence, verbatim. Empty hides the info disclosure. */
    formula: (card && card.description) || '',
  };
}

/**
 * `{ D, K, G }` for DkgRingTrio, or null when the report has no stimulus card -
 * the trio has no unknown state, so the host hides the card rather than drawing
 * three empty rings that read as "you earned nothing".
 *
 * `getStimuli` names the rows 'D' / 'K' / 'G'; the pre-`getStimuli` mock named
 * them 'Discipline' / 'Kinetics' / 'Geniuses', so the first letter is the key.
 */
export function balanceOf(progress) {
  const card = findCard(progress, PROGRESS_CARDS.balance);
  const values = (card && card.values) || [];
  if (!values.length) return null;
  return values.reduce((acc, row) => {
    if (!row || !row.name) return acc;
    const key = String(row.name).charAt(0).toUpperCase();
    const value = toNumber(row.value);
    if (key === 'D' || key === 'K' || key === 'G') acc[key] = value == null ? 0 : value;
    return acc;
  }, { D: 0, K: 0, G: 0 });
}

/**
 * The three bars, always in the design's order and always labelled, with null
 * values where the report has no row for them.
 */
export function completedOf(progress) {
  const card = findCard(progress, PROGRESS_CARDS.completed);
  const values = (card && card.values) || [];
  return COMPLETED_ROWS.map((row) => {
    const found = values.find((v) => v && v.name === row.match);
    return {
      key: row.key,
      label: row.label,
      icon: row.icon,
      value: toNumber(found && found.value),
      total: toNumber(found && found.total),
    };
  });
}

function rowsOf(card) {
  const values = (card && card.values) || [];
  const seen = {};
  return values.reduce((acc, row) => {
    if (!row || !row.name) return acc;
    // One routine id can repeat across the card's rows; a duplicate :key renders
    // the same routine twice (ARCHITECTURE.md § 3.6).
    const id = row.id || '';
    if (id && seen[id]) return acc;
    if (id) seen[id] = true;
    acc.push({ id, name: row.name, score: toNumber(row.value) });
    return acc;
  }, []);
}

/**
 * Top three and bottom three routines by score.
 *
 * `getBestRoutineSorted` slices one descending list twice - `slice(0, 3)` and
 * `slice(length - 3)` - so with three or fewer routines the SAME routine is in
 * both cards, and with four it is in both twice over. A routine cannot be both
 * the thing going well and the thing that slipped, so the top list wins and
 * attention keeps only what is left; the attention list is then reversed so the
 * weakest routine is the first thing read.
 */
export function rankingsOf(progress) {
  const good = rowsOf(findCard(progress, PROGRESS_CARDS.good));
  const praised = good.reduce((acc, row) => {
    if (row.id) acc[row.id] = true;
    return acc;
  }, {});
  const bad = rowsOf(findCard(progress, PROGRESS_CARDS.bad))
    .filter((row) => !(row.id && praised[row.id]))
    .reverse();
  return { good, bad };
}

export default {
  DATE_FORMAT,
  PERIODS,
  normalisePeriod,
  periodWindow,
  rangeLabel,
  previousLabel,
  findCard,
  toNumber,
  efficiencyOf,
  balanceOf,
  completedOf,
  rankingsOf,
};
