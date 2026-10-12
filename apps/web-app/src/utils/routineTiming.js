/**
 * What the drawer's day ribbon and the Progress page's Timing card show, from
 * one `routineTiming` read (resolvers/progress.js). Pure, so both screens and
 * their tests derive the same numbers.
 *
 * On-time rate = on time / (on time + late + missed). Pending check-ins (their
 * window is still ahead) and rest days are left out: neither has landed yet.
 */
import moment from 'moment';

export const DATE_FORMAT = 'DD-MM-YYYY';
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const emptyCounts = () => ({
  onTime: 0, late: 0, missed: 0, pending: 0,
});

function add(into, from) {
  ['onTime', 'late', 'missed', 'pending'].forEach((k) => {
    // eslint-disable-next-line no-param-reassign
    into[k] += Number(from && from[k]) || 0;
  });
  return into;
}

/** Percent on time, or null when nothing has landed (unknown is not 0%). */
export function onTimeRate(counts) {
  const c = counts || {};
  const landed = (c.onTime || 0) + (c.late || 0) + (c.missed || 0);
  return landed ? Math.round(((c.onTime || 0) * 100) / landed) : null;
}

/** The drawer reads this week and the one before it, ending today. */
export function drawerWindow(today) {
  const end = moment(today, DATE_FORMAT);
  return {
    startDate: end.clone().subtract(13, 'days').format(DATE_FORMAT),
    endDate: end.format(DATE_FORMAT),
  };
}

/**
 * Today's ribbon plus the rolling week's rate and its change on the week before.
 * `next` is the first check-in still to come: the ribbon marks it.
 */
export function drawerTiming(timing, today) {
  if (!timing || !Array.isArray(timing.days)) return null;
  const end = moment(today, DATE_FORMAT);
  const day = timing.days.find((d) => d.date === today) || null;
  const thisWeek = emptyCounts();
  const lastWeek = emptyCounts();
  timing.days.forEach((d) => {
    const ago = end.diff(moment(d.date, DATE_FORMAT), 'days');
    if (ago >= 0 && ago < 7) add(thisWeek, d);
    else if (ago >= 7 && ago < 14) add(lastWeek, d);
  });
  const rate = onTimeRate(thisWeek);
  const before = onTimeRate(lastWeek);
  const slots = (day && day.slots) || [];
  const nextIndex = slots.findIndex((s) => s.state === 'pending');
  return {
    slots,
    skip: !!(day && day.skip),
    counts: add(emptyCounts(), day),
    nextIndex,
    rate,
    delta: rate != null && before != null ? rate - before : null,
  };
}

/** Monday-first rows of the range by weekday, with their rate. */
export function weekdayPattern(days) {
  const rows = WEEKDAY_ORDER.map((index) => ({
    index, label: moment().day(index).format('ddd'), ...emptyCounts(),
  }));
  (days || []).forEach((d) => {
    if (d.skip) return;
    const row = rows.find((r) => r.index === moment(d.date, DATE_FORMAT).day());
    add(row, d);
  });
  return rows.map((r) => ({ ...r, rate: onTimeRate(r) }));
}

/**
 * The bars: one per routine on the Day view (its own slots), one per month on
 * the Year view, one per day otherwise.
 */
export function timingBuckets(period, days) {
  const list = days || [];
  if (period === 'day') {
    const last = list[list.length - 1];
    return ((last && last.slots) || []).map((s) => ({
      key: s.id,
      label: s.time,
      title: `${s.name} · ${s.time}`,
      ...emptyCounts(),
      [s.state]: 1,
    }));
  }
  if (period === 'year') {
    const months = new Map();
    list.forEach((d) => {
      const m = moment(d.date, DATE_FORMAT);
      const key = m.format('MM-YYYY');
      if (!months.has(key)) {
        months.set(key, {
          key, label: m.format('MMM').charAt(0), title: m.format('MMMM'), ...emptyCounts(),
        });
      }
      add(months.get(key), d);
    });
    return [...months.values()];
  }
  return list.map((d) => {
    const m = moment(d.date, DATE_FORMAT);
    return {
      key: d.date,
      label: period === 'week' ? m.format('dd').charAt(0) : m.format('D'),
      title: m.format('ddd D MMM'),
      skip: !!d.skip,
      ...add(emptyCounts(), d),
    };
  });
}

/**
 * Routines by how often they land on time, the ones slipping first. A routine
 * with nothing landed yet has no rate and goes last.
 */
export function routineRows(routines) {
  return (routines || [])
    .map((r) => ({ ...r, rate: onTimeRate(r) }))
    .sort((a, b) => {
      if (a.rate == null) return 1;
      if (b.rate == null) return -1;
      return a.rate - b.rate || String(a.time).localeCompare(String(b.time));
    });
}
