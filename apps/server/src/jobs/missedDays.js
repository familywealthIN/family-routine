/**
 * The missed-days email: someone who has been using the app goes three days
 * without ticking a routine → one email (Amazon SES) inviting them back with
 * the smallest routine they have. Pure: missedDaysEmail.js loads and sends.
 *
 *   active   ticked something on at least ACTIVE_TICK_DAYS of the
 *            ACTIVE_WINDOW days up to their last tick
 *   missed   days after the last tick, before today, that are not rest days
 *            (a day doc with skip) — today is still open, so it never counts
 *
 * Once per absence: the key is the last ticked day, so coming back and
 * missing again later earns a new email, and a re-run never repeats one.
 * Only while MISSED_DAYS..MAX_MISSED days are missed, so people who left long
 * ago are not emailed the day this job ships.
 */
const moment = require('moment');

const MISSED_DAYS = 3;
const MAX_MISSED = 5; // a job outage of a day or two still sends
const ACTIVE_WINDOW = 14;
const ACTIVE_TICK_DAYS = 3;
const HISTORY_DAYS = MAX_MISSED + ACTIVE_WINDOW + 2; // day docs to load
const SEND_AFTER_MORNING = 180; // ~10:00 with the default 07:00 morning
const SEND_WINDOW = 180; // hourly runs; a couple may fail and it still goes
const APP_URL = 'https://routine.familywealth.in';

const FORMAT = 'DD-MM-YYYY';
const parse = (date) => moment(date, FORMAT, true);
const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** DD-MM-YYYY dates from today back `days` days, today first. */
const historyDates = (today, days = HISTORY_DAYS) => Array.from(
  { length: days + 1 },
  (_, i) => parse(today).subtract(i, 'days').format(FORMAT),
);

const ticked = (routine) => (routine.tasklist || []).some((t) => t && t.ticked);

/**
 * Where this person stands: their last ticked day, how many days they have
 * missed since, and whether they were active before that.
 */
function absence(routines, today) {
  const tickDays = routines.filter(ticked).map((r) => r.date).filter((d) => parse(d).isValid());
  if (!tickDays.length) return null;
  const last = tickDays.reduce((a, b) => (parse(a).isAfter(parse(b)) ? a : b));
  const restDays = new Set(routines.filter((r) => r.skip).map((r) => r.date));
  const gap = parse(today).diff(parse(last), 'days') - 1;
  const missed = Array.from({ length: Math.max(0, gap) }, (_, i) => parse(last).add(i + 1, 'days').format(FORMAT))
    .filter((d) => !restDays.has(d)).length;
  const windowStart = parse(last).subtract(ACTIVE_WINDOW - 1, 'days');
  const activeDays = new Set(tickDays.filter((d) => !parse(d).isBefore(windowStart))).size;
  return { lastTick: last, missed, activeDays };
}

const escapeHtml = (text) => String(text)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Subject, text and HTML for one person. */
function emailCopy({
  name, missed, lastTick, item, step, appUrl = APP_URL,
}) {
  const first = String(name || '').trim().split(/\s+/)[0];
  const since = parse(lastTick).format('dddd D MMMM');
  const homeUrl = `${appUrl}/home`;
  const settingsUrl = `${appUrl}/settings/notifications`;
  const start = step ? `First step: ${step} — that's the whole start.` : 'Two minutes counts.';
  const subject = `${missed} days off — pick up with ${item.name}`;
  const lines = [
    `Hi${first ? ` ${first}` : ''},`,
    `Your last ticked routine was on ${since}. Missing a few days doesn't undo the habit — coming back today keeps it.`,
    `Start small: ${item.name}${item.time ? ` at ${item.time}` : ''}. ${start}`,
  ];
  const text = [
    ...lines,
    `Open Routine Notes: ${homeUrl}`,
    `You get this email once when you miss ${MISSED_DAYS} days in a row. Turn it off: ${settingsUrl}`,
  ].join('\n\n');
  // Colours and radii are packages/design tokens (--bg-app, --surface, --primary,
  // --text, --text-secondary, --radius-card, --radius-control); mail clients
  // need them inline.
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f4f4;font-family:Roboto,Helvetica,Arial,sans-serif;color:rgba(0,0,0,.87)">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:24px">
${lines.map((l) => `<p style="margin:0 0 16px;font-size:16px;line-height:24px">${escapeHtml(l)}</p>`).join('\n')}
<p style="margin:24px 0"><a href="${escapeHtml(homeUrl)}" style="display:inline-block;background:#288bd5;color:#ffffff;text-decoration:none;font-weight:500;padding:12px 20px;border-radius:12px">Open Routine Notes</a></p>
</div>
<p style="max-width:480px;margin:16px auto 0;font-size:12px;line-height:18px;color:rgba(0,0,0,.54)">You get this email once when you miss ${MISSED_DAYS} days in a row. <a href="${escapeHtml(settingsUrl)}" style="color:rgba(0,0,0,.54)">Turn it off</a></p>
</body></html>`;
  return { subject, text, html };
}

/**
 * The email due for one person now, or null.
 *
 * @param {Object} input
 * @param {string} input.today DD-MM-YYYY in their timezone
 * @param {number} input.nowMinute local minute of the day
 * @param {Object} input.prefs notification prefs with defaults applied
 * @param {string} [input.name] decrypted user name
 * @param {Array} input.items decrypted routine templates ({ name, time, points, steps })
 * @param {Array} input.routines day docs for historyDates(today)
 * @param {Set<string>} input.sentKeys notificationlogs keys already sent
 * @param {string} [input.appUrl]
 * @returns {null|{ key, kind, lastTick, missed, subject, text, html }}
 */
function planMissedEmail(input) {
  const {
    today, nowMinute, prefs, items, routines, sentKeys,
  } = input;
  if (!prefs.missedEmail) return null;
  const start = toMinutes(prefs.morningTime) + SEND_AFTER_MORNING;
  if (!(nowMinute >= start && nowMinute < start + SEND_WINDOW)) return null;
  const timed = items.filter((i) => i && i.name);
  if (!timed.length) return null;

  const a = absence(routines, today);
  if (!a || a.activeDays < ACTIVE_TICK_DAYS || a.missed < MISSED_DAYS || a.missed > MAX_MISSED) return null;
  const key = `email:missed:${a.lastTick}`;
  if (sentKeys.has(key)) return null;

  const item = [...timed].sort((x, y) => (Number(x.points) || 0) - (Number(y.points) || 0))[0];
  const step = ((item.steps || []).map((s) => s && String(s.name || '').trim()).find(Boolean)) || null;
  return {
    key,
    kind: 'email-missed',
    lastTick: a.lastTick,
    missed: a.missed,
    ...emailCopy({
      name: input.name, missed: a.missed, lastTick: a.lastTick, item, step, appUrl: input.appUrl,
    }),
  };
}

module.exports = {
  MISSED_DAYS,
  MAX_MISSED,
  HISTORY_DAYS,
  APP_URL,
  historyDates,
  absence,
  emailCopy,
  planMissedEmail,
};
