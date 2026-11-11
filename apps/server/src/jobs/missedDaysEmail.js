/**
 * Load, log and send the missed-days email (planner: ./missedDays.js). Runs
 * hourly as the `missedDaysEmail` Lambda (serverless.yml); its role may send
 * only as the verified SES sender, so no AWS keys live anywhere.
 *
 * Each email is logged in notificationlogs before it goes out — the unique
 * (email, key) index makes a doubled run a no-op — and the log is removed
 * again if SES refuses it, so the next hourly run retries.
 */
const { encryption } = require('../utils/encryption');
const { resolveTimezone, getLocalDate, getLocalTime } = require('../utils/timezone');
const { withDefaults } = require('../schema/NotificationPrefsSchema');
const { HISTORY_DAYS, historyDates, planMissedEmail } = require('./missedDays');

const DEFAULT_FROM = 'Routine Notes <noreply@familywealth.in>';
const LOG_DAYS = 40;
const DAY_MS = 24 * 60 * 60 * 1000;

const dec = (text) => encryption.decrypt(text);
const minuteOf = (timezone, now) => {
  const [h, m] = getLocalTime(timezone, now).split(':').map(Number);
  return (h % 24) * 60 + m;
};
const byEmail = (docs) => docs.reduce((map, d) => map.set(d.email, [...(map.get(d.email) || []), d]), new Map());

/**
 * @param {Object} options
 * @param {Object} options.db a connected MongoDB database (mongoose.connection.db)
 * @param {Function} [options.send] ({ to, subject, text, html }) => Promise; required unless dryRun
 * @param {Date} [options.now]
 * @param {boolean} [options.dryRun] plan only: nothing logged, nothing sent
 * @param {string} [options.email] only this user
 * @param {string} [options.today] plan as if it were this day (DD-MM-YYYY)
 * @param {number} [options.nowMinute] plan as if it were this local minute
 * @param {boolean} [options.ignoreSent] plan as if nothing had been sent
 * @returns {Promise<{ checked: number, planned: Array, sent: number, failed: number }>}
 */
async function runMissedDaysEmail({
  db, send, now = new Date(), dryRun = false, email, today: todayOverride, nowMinute: minuteOverride, ignoreSent = false,
}) {
  if (!dryRun && typeof send !== 'function') throw new Error('runMissedDaysEmail needs send() unless dryRun');
  const users = await db.collection('users')
    .find(email ? { email } : { email: { $exists: true } }, {
      projection: {
        email: 1, name: 1, timezone: 1, notificationPrefs: 1,
      },
    })
    .toArray();

  const groups = users.reduce((map, u) => {
    const tz = resolveTimezone(u.timezone);
    return map.set(tz, [...(map.get(tz) || []), u]);
  }, new Map());

  const planned = [];
  await Promise.all([...groups.entries()].map(async ([timezone, group]) => {
    const today = todayOverride || getLocalDate(timezone, now);
    const nowMinute = minuteOverride !== undefined ? minuteOverride : minuteOf(timezone, now);
    const prefsOf = new Map(group.map((u) => [u.email, withDefaults(u.notificationPrefs)]));
    // Only people with the email on; the planner checks the time window.
    const due = group.filter((u) => prefsOf.get(u.email).missedEmail);
    if (!due.length) return;
    const emails = due.map((u) => u.email);

    const routines = byEmail(await db.collection('routines')
      .find({ email: { $in: emails }, date: { $in: historyDates(today, HISTORY_DAYS) } }, {
        projection: {
          email: 1, date: 1, skip: 1, 'tasklist.ticked': 1,
        },
      })
      .toArray());
    const withTicks = emails.filter((e) => (routines.get(e) || []).some((r) => (r.tasklist || []).some((t) => t && t.ticked)));
    if (!withTicks.length) return;

    const [items, logs] = await Promise.all([
      db.collection('routineitems')
        .find({ email: { $in: withTicks } }, {
          projection: {
            email: 1, name: 1, time: 1, points: 1, 'steps.name': 1,
          },
        })
        .toArray()
        .then(byEmail),
      ignoreSent ? new Map() : db.collection('notificationlogs')
        .find({ email: { $in: withTicks }, sentAt: { $gte: new Date(now.getTime() - LOG_DAYS * DAY_MS) } }, {
          projection: { email: 1, key: 1 },
        })
        .toArray()
        .then(byEmail),
    ]);

    due.filter((u) => withTicks.includes(u.email)).forEach((user) => {
      const plan = planMissedEmail({
        today,
        nowMinute,
        prefs: prefsOf.get(user.email),
        name: dec(user.name),
        items: (items.get(user.email) || []).map((i) => ({
          ...i,
          name: dec(i.name),
          steps: (i.steps || []).map((s) => ({ ...s, name: dec(s.name) })),
        })),
        routines: routines.get(user.email) || [],
        sentKeys: new Set((logs.get(user.email) || []).map((l) => l.key)),
      });
      if (plan) planned.push({ email: user.email, timezone, today, ...plan });
    });
  }));

  let sent = 0;
  let failed = 0;
  if (!dryRun) {
    const logs = db.collection('notificationlogs');
    await logs.createIndex({ email: 1, key: 1 }, { unique: true });
    // One at a time: SES allows 14/s here and this list is a handful a day.
    for (const p of planned) {
      try {
        await logs.insertOne({
          email: p.email, key: p.key, kind: p.kind, date: p.today, channel: 'email', sentAt: new Date(),
        });
      } catch (error) {
        if (error.code === 11000) continue; // another run sent it
        throw error;
      }
      try {
        await send({
          to: p.email, subject: p.subject, text: p.text, html: p.html,
        });
        sent += 1;
        console.log(`[${p.timezone}] ${p.kind} → ${p.email} (missed ${p.missed})`);
      } catch (error) {
        failed += 1;
        await logs.deleteOne({ email: p.email, key: p.key });
        console.error(`missed-days email to ${p.email} failed: ${error.name}: ${error.message}`);
      }
    }
  }

  return {
    checked: users.length, planned, sent, failed,
  };
}

/** send() for runMissedDaysEmail over Amazon SES (v2 API). */
function sesSender({ client, from = process.env.EMAIL_FROM || DEFAULT_FROM }) {
  // The Lambda runtime ships the v3 SDK, so it is never bundled (serverless.yml `external`).
  // eslint-disable-next-line global-require
  const { SendEmailCommand } = require('@aws-sdk/client-sesv2');
  return ({
    to, subject, text, html,
  }) => client.send(new SendEmailCommand({
    FromEmailAddress: from,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Text: { Data: text, Charset: 'UTF-8' },
          Html: { Data: html, Charset: 'UTF-8' },
        },
      },
    },
  }));
}

module.exports = { runMissedDaysEmail, sesSender, DEFAULT_FROM };
