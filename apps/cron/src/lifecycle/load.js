/**
 * Load what planNotifications needs for one timezone's users and plan each
 * one's lifecycle notifications. Shared by lifecycle-notifications.js (which
 * logs and sends) and preview-lifecycle.js (which only prints), so a preview
 * plans from exactly the data the job would.
 */
const { getLocalDate } = require('../utils/timezone');
const { encryption } = require('../utils/encryption');
const { minuteOfDay } = require('../cue/cueEngine');
const { planNotifications, lifecycleDates } = require('./planner');
const { withDefaults } = require('./prefs');

const DAY_MS = 24 * 60 * 60 * 1000;
const LOG_DAYS = 40;

const dec = (text) => encryption.decrypt(text);
const goalItemsOf = (docs, email, period, date) => docs
  .filter((g) => g.email === email && g.period === period && g.date === date)
  .flatMap((g) => g.goalItems || [])
  .map((g) => ({ ...g, body: dec(g.body) }));

/**
 * @param {Object} db mongoose connection
 * @param {string} timezone
 * @param {Array} group users in that timezone
 * @param {Date} now
 * @param {Object} [options]
 * @param {string} [options.today] plan as if it were this day (DD-MM-YYYY)
 * @param {number} [options.nowMinute] plan as if it were this local minute
 * @param {boolean} [options.ignoreSent] plan as if nothing had been sent yet
 * @returns {Promise<{ today: string, plans: Array<{ user, planned }> }>}
 */
async function planForTimezone(db, timezone, group, now, options = {}) {
  const today = options.today || getLocalDate(timezone, now);
  const nowMinute = options.nowMinute !== undefined ? options.nowMinute : minuteOfDay(now, timezone);
  const dates = lifecycleDates(today);
  const emails = group.map((u) => u.email);

  const [items, routines, goals, chats, sent] = await Promise.all([
    db.collection('routineitems')
      .find({ email: { $in: emails } }, {
        projection: {
          email: 1, name: 1, time: 1, points: 1,
        },
      })
      .toArray(),
    db.collection('routines')
      .find({ email: { $in: emails }, date: { $in: dates.history } }, {
        projection: {
          email: 1, date: 1, skip: 1, 'tasklist._id': 1, 'tasklist.ticked': 1,
        },
      })
      .toArray(),
    db.collection('goals')
      .find({
        email: { $in: emails },
        $or: [
          { period: 'day', date: { $in: [today, dates.yesterday] } },
          { period: 'week', date: dates.week },
        ],
      }, {
        projection: {
          email: 1,
          period: 1,
          date: 1,
          'goalItems.body': 1,
          'goalItems.isComplete': 1,
          'goalItems.status': 1,
        },
      })
      .toArray(),
    db.collection('routinechatmessages')
      .find({
        email: { $in: emails },
        createdAt: { $gte: new Date(now.getTime() - 14 * DAY_MS) },
      }, {
        projection: {
          email: 1, taskRef: 1, from: 1, icon: 1, text: 1, added: 1, createdAt: 1,
        },
      })
      .toArray(),
    options.ignoreSent ? [] : db.collection('notificationlogs')
      .find({ email: { $in: emails }, sentAt: { $gte: new Date(now.getTime() - LOG_DAYS * DAY_MS) } })
      .toArray(),
  ]);

  const plans = group.map((user) => {
    const { email } = user;
    const mine = sent.filter((l) => l.email === email);
    const planned = planNotifications({
      now,
      timezone,
      today,
      nowMinute,
      prefs: withDefaults(user.notificationPrefs),
      items: items.filter((i) => i.email === email).map((i) => ({ ...i, name: dec(i.name) })),
      routines: routines.filter((r) => r.email === email),
      dayGoals: goalItemsOf(goals, email, 'day', today),
      carryOver: goalItemsOf(goals, email, 'day', dates.yesterday),
      weekGoals: goalItemsOf(goals, email, 'week', dates.week),
      chats: chats.filter((m) => m.email === email).map((m) => ({ ...m, text: dec(m.text) })),
      sentKeys: new Set(mine.map((l) => l.key)),
      sentToday: mine.filter((l) => l.date === today).length,
    });
    return { user, planned };
  });

  return { today, plans };
}

module.exports = { planForTimezone };
