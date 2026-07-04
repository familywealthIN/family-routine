/* eslint-disable no-underscore-dangle */
// Cron-local copy of the XP settlement math + minimal models (per-app util
// duplication is the repo convention — see encryption.js/getProgressReport.js).
// Keep the math in sync with apps/server/src/utils/xpLedger.js and
// aggregateStimuliForRoutine in apps/server/src/resolvers/routine.js.
const mongoose = require('mongoose');
const moment = require('moment');
const { getLocalDate } = require('./timezone');

const DAILY_STIMULUS_CAP = 100; // per D/K/G; max 300/day
const REFERRAL_REWARD_AMOUNT = 300;
const REFERRAL_MIN_SETTLED_DAYS = 3;
const REFERRAL_MAX_REWARDED_INVITES = 10;

const DAY_KEY_FORMAT = 'DD-MM-YYYY';
const CURSOR_FORMAT = 'YYYY-MM-DD';

// ---------------------------------------------------------------------------
// Minimal cron-local models (no encrypted fields are read here)
// ---------------------------------------------------------------------------

const XpTransactionSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  type: {
    type: String,
    required: true,
    enum: ['settle', 'redeem', 'referral', 'grant'],
  },
  date: String,
  amount: { type: Number, required: true },
  taskId: String,
  refKey: { type: String, required: true },
  meta: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});
XpTransactionSchema.index({ email: 1, type: 1, refKey: 1 }, { unique: true });
const XpTransactionModel = mongoose.model('xpTransaction', XpTransactionSchema);

const ReferralSchema = new mongoose.Schema({
  inviterEmail: { type: String, required: true, index: true },
  inviteeEmail: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['pending', 'rewarded', 'capped'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  rewardedAt: Date,
});
const ReferralModel = mongoose.model('referral', ReferralSchema);

const UserModel = mongoose.model('User', new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  timezone: String,
  xpLastSettled: String,
}));

const RoutineModel = mongoose.model('routine', new mongoose.Schema({
  date: String,
  email: String,
  skip: Boolean,
  tasklist: [{
    time: String,
    points: Number,
    ticked: Boolean,
    passed: Boolean,
    wait: Boolean,
    redeemed: Boolean,
    passedPoints: Number,
    stimuli: [{ name: String, splitRate: Number, earned: Number }],
  }],
}));

// ---------------------------------------------------------------------------
// Math (mirrors server aggregateStimuliForRoutine + xpLedger)
// ---------------------------------------------------------------------------

const stimuliThreshold = { weekDays: 5, monthWeeks: 3, yearMonths: 6 };

function stimuliWeekOfMonth(d) {
  const addFirstWeek = moment(d, DAY_KEY_FORMAT).startOf('month').weekday() < 2 ? 1 : 0;
  return moment(d, DAY_KEY_FORMAT).week() - moment(d, DAY_KEY_FORMAT).startOf('month').week() + addFirstWeek;
}

// Redeemed ticks earn like normal ticks — the overnight settlement rule is
// what prevents same-day loops.
function aggregateStimuliForRoutine(routine) {
  const result = { D: 0, K: 0, G: 0 };
  if (!routine || !routine.tasklist || !Array.isArray(routine.tasklist)) {
    return result;
  }

  ['D', 'K', 'G'].forEach((stimName) => {
    const total = routine.tasklist.reduce((sum, task) => {
      const stim = task.stimuli && task.stimuli.find((s) => s.name === stimName);
      if (stim && stim.earned) {
        return sum + stim.earned;
      }
      return sum;
    }, 0);

    if (stimName === 'G') {
      const dateStr = routine.date;
      if (moment(dateStr, DAY_KEY_FORMAT).weekday() >= stimuliThreshold.weekDays - 1) {
        if (stimuliWeekOfMonth(dateStr) >= stimuliThreshold.monthWeeks - 1) {
          if (moment(dateStr, DAY_KEY_FORMAT).month() >= stimuliThreshold.yearMonths - 1) {
            result.G = total;
          } else {
            result.G = Number((total * 1.334).toFixed(1));
          }
        } else {
          result.G = total * 2;
        }
      } else {
        result.G = total * 4;
      }
    } else {
      result[stimName] = total;
    }
  });

  return result;
}

// Cap applied AFTER the G scaling multiplier — deliberate, do not "fix".
function computeDaySettleAmount(routine) {
  if (!routine) return 0;
  const { D, K, G } = aggregateStimuliForRoutine(routine);
  return Math.min(D, DAILY_STIMULUS_CAP)
    + Math.min(K, DAILY_STIMULUS_CAP)
    + Math.min(G, DAILY_STIMULUS_CAP);
}

// Duplicate routine docs can exist per date (addRoutine race) — keep the one
// with the highest total earned.
function pickBestRoutineForDate(routines) {
  if (!routines || !routines.length) return null;
  return routines.reduce((best, candidate) => {
    if (!best) return candidate;
    const b = aggregateStimuliForRoutine(best);
    const c = aggregateStimuliForRoutine(candidate);
    return (c.D + c.K + c.G) > (b.D + b.K + b.G) ? candidate : best;
  }, null);
}

async function recordTransaction({
  email, type, date, amount, refKey, taskId, meta,
}) {
  try {
    const txn = await XpTransactionModel.create({
      email, type, date, amount, refKey, taskId, meta,
    });
    return { applied: true, txn };
  } catch (err) {
    if (err && err.code === 11000) {
      return { applied: false, txn: null };
    }
    throw err;
  }
}

async function maybeRewardReferral(inviteeEmail) {
  const referral = await ReferralModel.findOne({ inviteeEmail, status: 'pending' }).exec();
  if (!referral) return false;

  const settledDays = await XpTransactionModel
    .countDocuments({ email: inviteeEmail, type: 'settle' }).exec();
  if (settledDays < REFERRAL_MIN_SETTLED_DAYS) return false;

  const rewardedCount = await ReferralModel
    .countDocuments({ inviterEmail: referral.inviterEmail, status: 'rewarded' }).exec();
  if (rewardedCount >= REFERRAL_MAX_REWARDED_INVITES) {
    await ReferralModel.updateOne(
      { _id: referral._id, status: 'pending' },
      { $set: { status: 'capped' } },
    ).exec();
    return false;
  }

  const today = moment().format(DAY_KEY_FORMAT);
  await recordTransaction({
    email: referral.inviterEmail,
    type: 'referral',
    date: today,
    amount: REFERRAL_REWARD_AMOUNT,
    refKey: `ref:${inviteeEmail}`,
  });
  await recordTransaction({
    email: inviteeEmail,
    type: 'referral',
    date: today,
    amount: REFERRAL_REWARD_AMOUNT,
    refKey: 'ref-bonus',
  });
  await ReferralModel.updateOne(
    { _id: referral._id, status: 'pending' },
    { $set: { status: 'rewarded', rewardedAt: new Date() } },
  ).exec();
  return true;
}

/**
 * Settle (xpLastSettled, yesterday-in-user-tz] for one user, oldest first.
 * Same semantics as the server's lazy settleUserDays; safe to run
 * concurrently with it thanks to the unique txn index + monotonic cursor.
 */
async function settleUser(user, { maxLookbackDays = 400 } = {}) {
  const { email } = user;
  const todayKey = getLocalDate(user.timezone);
  const yesterdayCursor = moment(todayKey, DAY_KEY_FORMAT)
    .subtract(1, 'day').format(CURSOR_FORMAT);

  if (!user.xpLastSettled) {
    // Un-backfilled user — leave for backfill-xp (which anchors the cursor).
    return { settled: 0, skipped: true };
  }
  if (user.xpLastSettled >= yesterdayCursor) {
    await maybeRewardReferral(email);
    return { settled: 0 };
  }

  const dayCursors = [];
  const iter = moment(user.xpLastSettled, CURSOR_FORMAT).add(1, 'day');
  const end = moment(yesterdayCursor, CURSOR_FORMAT);
  while (!iter.isAfter(end) && dayCursors.length < maxLookbackDays) {
    dayCursors.push(iter.format(CURSOR_FORMAT));
    iter.add(1, 'day');
  }

  const dayKeys = dayCursors.map((c) => moment(c, CURSOR_FORMAT).format(DAY_KEY_FORMAT));
  const routines = await RoutineModel.find({ email, date: { $in: dayKeys } }).exec();
  const byDate = {};
  routines.forEach((routine) => {
    if (!byDate[routine.date]) byDate[routine.date] = [];
    byDate[routine.date].push(routine);
  });

  let settled = 0;
  // eslint-disable-next-line no-restricted-syntax
  for (const dayKey of dayKeys) {
    const routine = pickBestRoutineForDate(byDate[dayKey]);
    const amount = computeDaySettleAmount(routine);
    if (amount > 0) {
      // eslint-disable-next-line no-await-in-loop
      const { applied } = await recordTransaction({
        email, type: 'settle', date: dayKey, amount, refKey: dayKey,
      });
      if (applied) settled += 1;
    }
  }

  const newCursor = dayCursors[dayCursors.length - 1];
  await UserModel.updateOne(
    { email, $or: [{ xpLastSettled: { $lt: newCursor } }, { xpLastSettled: null }] },
    { $set: { xpLastSettled: newCursor } },
  ).exec();

  await maybeRewardReferral(email);
  return { settled };
}

/**
 * One-time full-history backfill for one user: settle every historical
 * routine day up to yesterday-in-tz with the per-stimulus caps, then anchor
 * the cursor. Idempotent — re-runs dedupe on the unique index.
 */
async function backfillUser(user) {
  const { email } = user;
  const todayKey = getLocalDate(user.timezone);
  const yesterdayCursor = moment(todayKey, DAY_KEY_FORMAT)
    .subtract(1, 'day').format(CURSOR_FORMAT);

  const routines = await RoutineModel.find({ email }).exec();
  const byDate = {};
  routines.forEach((routine) => {
    if (!routine.date) return;
    // Only historical days: strictly before today in the user's timezone.
    const cursor = moment(routine.date, DAY_KEY_FORMAT).format(CURSOR_FORMAT);
    if (cursor > yesterdayCursor) return;
    if (!byDate[routine.date]) byDate[routine.date] = [];
    byDate[routine.date].push(routine);
  });

  let settled = 0;
  let totalPoints = 0;
  // eslint-disable-next-line no-restricted-syntax
  for (const dayKey of Object.keys(byDate)) {
    const routine = pickBestRoutineForDate(byDate[dayKey]);
    const amount = computeDaySettleAmount(routine);
    if (amount > 0) {
      // eslint-disable-next-line no-await-in-loop
      const { applied } = await recordTransaction({
        email,
        type: 'settle',
        date: dayKey,
        amount,
        refKey: dayKey,
        meta: { source: 'backfill' },
      });
      if (applied) {
        settled += 1;
        totalPoints += amount;
      }
    }
  }

  await UserModel.updateOne(
    { email, $or: [{ xpLastSettled: { $lt: yesterdayCursor } }, { xpLastSettled: null }] },
    { $set: { xpLastSettled: yesterdayCursor } },
  ).exec();

  return { settled, totalPoints };
}

module.exports = {
  DAILY_STIMULUS_CAP,
  aggregateStimuliForRoutine,
  computeDaySettleAmount,
  pickBestRoutineForDate,
  recordTransaction,
  maybeRewardReferral,
  settleUser,
  backfillUser,
  models: {
    XpTransactionModel, ReferralModel, UserModel, RoutineModel,
  },
};
