/**
 * The alarms an iPhone rings itself (AlarmKit, iOS 26+) for routines set to
 * "Alarm". The phone schedules them ahead, so it asks for the next few days at
 * once (deviceAlarms) and reports up to when it has them (registerAlarmDevice);
 * until then the cron sends that phone no alarm push for them.
 *
 * Same rules as the cron's alarm cue (apps/cron/src/cue/cueEngine.js dueCues):
 * at the set time exactly, once more ALARM_REPEAT minutes later, not on a rest
 * day, not when today's list lacks the routine or it is already ticked. The
 * one button follows the notification plan (Asana 1213751007474214) by how
 * much AI the routine has; iOS allows only one besides Stop, so a routine
 * without an agent gets Do now, not Complete.
 */
const { resolveTimezone } = require('./timezone');

const ALARM_REPEAT = 5; // minutes, as apps/cron/src/cue/cueEngine.js
const DEFAULT_DAYS = 7;
const MAX_ALARMS = 40; // the phone also has a limit; the nearest ones win

// The same levels as apps/cron/src/cue/routineActions.js.
const BUTTONS = {
  none: { button: 'DO_NOW', buttonTitle: 'Do now' },
  context: { button: 'BUILD_AGENT', buttonTitle: 'Build agent' },
  agent: { button: 'START_AGENT', buttonTitle: 'Start agent' },
};

function aiLevel({ hasAgent, hasAiContext }) {
  if (hasAgent) return 'agent';
  if (hasAiContext) return 'context';
  return 'none';
}

const TIME = /^(\d{1,2}):(\d{2})$/;
const DATE = /^(\d{2})-(\d{2})-(\d{4})$/;
const pad = (n) => String(n).padStart(2, '0');

/** DD-MM-YYYY `n` days after `date`. */
function addDays(date, n) {
  const [, d, m, y] = DATE.exec(date);
  const next = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + n));
  return `${pad(next.getUTCDate())}-${pad(next.getUTCMonth() + 1)}-${next.getUTCFullYear()}`;
}

/** How far the zone's wall clock is ahead of UTC at `instant`, in ms. */
function zoneOffset(timezone, instant) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant).map((p) => [p.type, p.value]));
  const wall = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  );
  return wall - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant a DD-MM-YYYY date and HH:mm time happen in `timezone`. */
function localToUtc(date, time, timezone) {
  const [, d, m, y] = DATE.exec(date);
  const [, h, min] = TIME.exec(time);
  const wall = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
  const zone = resolveTimezone(timezone);
  // Twice, so a time just after a daylight-saving change lands right.
  const first = wall - zoneOffset(zone, new Date(wall));
  return new Date(wall - zoneOffset(zone, new Date(first)));
}

const findTask = (routine, id) => routine && (routine.tasklist || [])
  .find((t) => String(t._id || t.id) === String(id));

/**
 * @param {Object} input
 * @param {Array} input.items routine items (name decrypted), any notifyMode
 * @param {Array} input.routines the user's day documents for the window
 * @param {Object} input.levels routineId → 'none' | 'context' | 'agent'
 * @param {string} input.today DD-MM-YYYY in the user's timezone
 * @param {string} input.timezone
 * @param {Date} input.now
 * @param {number} [input.days]
 * @returns {{through: Date, alarms: Array}} `through`: every alarm before it
 *   is in `alarms`
 */
function planDeviceAlarms({
  items, routines, levels = {}, today, timezone, now, days = DEFAULT_DAYS,
}) {
  const alarmItems = items.filter((i) => i.notifyMode === 'alarm' && TIME.test(String(i.time || '')));
  const byDate = new Map(routines.map((r) => [r.date, r]));
  const all = [];

  for (let n = 0; n < days; n += 1) {
    const date = addDays(today, n);
    const day = byDate.get(date);
    if (day && day.skip) continue; // eslint-disable-line no-continue
    alarmItems.forEach((item) => {
      const task = findTask(day, item._id);
      // A day already planned without this routine, or with it done.
      if (day && (!task || task.ticked)) return;
      const routineId = String(item._id);
      const fireAt = localToUtc(date, item.time, timezone);
      const name = item.name || 'Your routine';
      const { time } = item;
      const button = BUTTONS[levels[routineId]] || BUTTONS.none;
      [
        { at: fireAt, title: name, repeat: false },
        { at: new Date(fireAt.getTime() + ALARM_REPEAT * 60000), title: `Still on: ${name}`, repeat: true },
      ].forEach(({ at, title, repeat }) => {
        if (at <= now) return;
        all.push({
          routineId, time, date, fireAt: at, title, repeat, ...button,
        });
      });
    });
  }

  all.sort((a, b) => a.fireAt - b.fireAt);
  const kept = all.slice(0, MAX_ALARMS);
  const dropped = all[MAX_ALARMS];
  return {
    through: dropped ? dropped.fireAt : localToUtc(addDays(today, days), '00:00', timezone),
    alarms: kept.map((a) => ({ ...a, fireAt: a.fireAt.toISOString() })),
  };
}

/** How a device names an alarm it rings itself; the cron matches on it. */
const alarmKey = ({ routineId, time }) => `${routineId}@${time}`;

module.exports = {
  alarmKey,
  ALARM_REPEAT, DEFAULT_DAYS, MAX_ALARMS, BUTTONS, aiLevel, addDays, localToUtc, planDeviceAlarms,
};
