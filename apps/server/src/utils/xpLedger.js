/* eslint-disable no-underscore-dangle */
const moment = require('moment');

const { XpTransactionModel } = require('../schema/XpTransactionSchema');
const { UserModel } = require('../schema/UserSchema');
const { RoutineModel } = require('../schema/RoutineSchema');
const { ReferralModel } = require('../schema/ReferralSchema');
const { getLocalDate } = require('./timezone');
const { isSubscriptionActive } = require('./entitlement');

// Per-stimulus daily earn cap: settled amount = min(D,100)+min(K,100)+min(G,100).
// The cap is applied AFTER the G period-scaling multiplier (x4/x2/x1.334) —
// that is deliberate, do not "fix" it.
const DAILY_STIMULUS_CAP = 100;

const WELCOME_GRANT_AMOUNT = 300;
const REFERRAL_REWARD_AMOUNT = 300;
const REFERRAL_MIN_SETTLED_DAYS = 3;
const REFERRAL_MAX_REWARDED_INVITES = 10;

// How many unsettled days a single lazy call will process. Older remainders
// are picked up by subsequent calls and the daily cron sweeper.
const DEFAULT_MAX_LOOKBACK_DAYS = 60;

const DAY_KEY_FORMAT = 'DD-MM-YYYY'; // app-wide routine day key
const CURSOR_FORMAT = 'YYYY-MM-DD'; // xpLastSettled — sorts lexicographically

const CREDIT_TYPES = ['settle', 'referral', 'grant'];

// Lazy require: resolvers/routine.js is a resolver module — pull the shared
// aggregate out at call time so importing this util never loads the GraphQL
// resolver tree (and unit tests can inject a fake instead).
function defaultAggregateFn() {
  // eslint-disable-next-line global-require
  const { aggregateStimuliForRoutine } = require('../resolvers/routine');
  return aggregateStimuliForRoutine;
}

function dayKeyToCursor(dayKey) {
  return moment(dayKey, DAY_KEY_FORMAT).format(CURSOR_FORMAT);
}

function cursorToDayKey(cursor) {
  return moment(cursor, CURSOR_FORMAT).format(DAY_KEY_FORMAT);
}

/**
 * Cursors for every day in (afterCursor, endCursor], oldest first, capped at
 * maxDays. Iterates with moment — the app's DD-MM-YYYY day keys must never be
 * compared or sorted as strings.
 */
function enumerateDayCursors(afterCursor, endCursor, maxDays) {
  const cursors = [];
  const iter = moment(afterCursor, CURSOR_FORMAT).add(1, 'day');
  const end = moment(endCursor, CURSOR_FORMAT);
  while (!iter.isAfter(end) && cursors.length < maxDays) {
    cursors.push(iter.format(CURSOR_FORMAT));
    iter.add(1, 'day');
  }
  return cursors;
}

/**
 * Pure referral reward decision.
 * Returns 'reward' | 'cap' | 'wait'.
 */
function referralDecision({ settledDays, rewardedCount }) {
  if (settledDays < REFERRAL_MIN_SETTLED_DAYS) return 'wait';
  if (rewardedCount >= REFERRAL_MAX_REWARDED_INVITES) return 'cap';
  return 'reward';
}

/**
 * Capped settle amount for one day's routine doc (or null → 0).
 * aggregateFn is aggregateStimuliForRoutine (injected to keep this pure and
 * to avoid a hard dependency for unit tests). Redeemed ticks earn like normal
 * ticks — the overnight settlement rule is what prevents same-day loops.
 */
function computeDaySettleAmount(routine, aggregateFn) {
  if (!routine) return 0;
  const { D, K, G } = aggregateFn(routine);
  return Math.min(D, DAILY_STIMULUS_CAP)
    + Math.min(K, DAILY_STIMULUS_CAP)
    + Math.min(G, DAILY_STIMULUS_CAP);
}

/**
 * Duplicate routine docs can exist for one date (addRoutine race — see
 * weekStimuli). Keep the doc with the highest total earned so stale
 * zero-valued duplicates don't shadow real data.
 */
function pickBestRoutineForDate(routines, aggregateFn) {
  if (!routines || !routines.length) return null;
  return routines.reduce((best, candidate) => {
    if (!best) return candidate;
    const bestTotals = aggregateFn(best);
    const candTotals = aggregateFn(candidate);
    const bestSum = bestTotals.D + bestTotals.K + bestTotals.G;
    const candSum = candTotals.D + candTotals.K + candTotals.G;
    return candSum > bestSum ? candidate : best;
  }, null);
}

/**
 * Pure redeem validation — the full guard matrix, unit-testable without a DB.
 * Returns { ok: true, cost } or { ok: false, code, message }.
 */
function validateRedeem({
  user, routine, taskId, clientDate, now = new Date(), available = 0, entitled = false,
}) {
  const fail = (code, message) => ({ ok: false, code, message });

  if (!routine) return fail(404, '404:Routine not found');
  if (routine.date !== clientDate) return fail(400, '400:Date does not match routine');

  // Day integrity: client date must be within ±1 day of server-now in the
  // user's stored timezone (accepted residual: ~24h clock-skew window).
  const todayTz = getLocalDate(user && user.timezone, now);
  const allowedDates = [-1, 0, 1].map((offset) => moment(todayTz, DAY_KEY_FORMAT)
    .add(offset, 'day').format(DAY_KEY_FORMAT));
  if (!allowedDates.includes(clientDate)) {
    return fail(400, '400:Redemption is only available for today');
  }

  const task = routine.tasklist
    && routine.tasklist.find((t) => t._id.toString() === taskId.toString());
  if (!task) return fail(404, '404:Task not found');
  if (task.ticked || task.redeemed) return fail(409, '409:Task is already checked');
  if (!task.passed) return fail(400, '400:Task has not passed yet');

  // Price frozen when the task passed; fallback covers tasks that passed
  // before the snapshot deploy.
  const cost = typeof task.passedPoints === 'number' ? task.passedPoints : (task.points || 0);

  if (!entitled && available < cost) {
    return fail(402, '402:Insufficient points');
  }

  return { ok: true, cost, task };
}

/**
 * Append a ledger transaction. Idempotent: a duplicate {email, type, refKey}
 * is swallowed as a no-op so every write path (lazy settle, cron, backfill,
 * redeem retry) is safe to repeat.
 */
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

/**
 * Referral reward gate, run after settlement. The invitee's settle-transaction
 * count equals their settled nonzero-earning days (zero-earn days write no
 * transaction), which makes the 3-day gate a cheap count.
 */
async function maybeRewardReferral(inviteeEmail) {
  const referral = await ReferralModel.findOne({ inviteeEmail, status: 'pending' }).exec();
  if (!referral) return false;

  const settledDays = await XpTransactionModel
    .countDocuments({ email: inviteeEmail, type: 'settle' }).exec();
  const rewardedCount = await ReferralModel
    .countDocuments({ inviterEmail: referral.inviterEmail, status: 'rewarded' }).exec();

  const decision = referralDecision({ settledDays, rewardedCount });
  if (decision === 'wait') return false;
  if (decision === 'cap') {
    await ReferralModel.updateOne(
      { _id: referral._id, status: 'pending' },
      { $set: { status: 'capped' } },
    ).exec();
    return false;
  }

  const today = moment().format(DAY_KEY_FORMAT);
  // Credits first, status flip last — the txn unique keys make a partial
  // failure safe to retry on the next settlement pass.
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
 * Settle every unsettled day in (xpLastSettled, yesterday-in-user-tz], oldest
 * first, at most maxLookbackDays per call (the cron sweeper drains any
 * remainder). Idempotent and race-safe: settle txns dedupe on the unique
 * index and the cursor only ever moves forward ($lt guard).
 */
async function settleUserDays(email, {
  maxLookbackDays = DEFAULT_MAX_LOOKBACK_DAYS,
  aggregateFn = defaultAggregateFn(),
} = {}) {
  const user = await UserModel.findOne({ email }).exec();
  if (!user) return { settled: 0 };

  const todayKey = getLocalDate(user.timezone);
  const yesterdayCursor = moment(todayKey, DAY_KEY_FORMAT)
    .subtract(1, 'day').format(CURSOR_FORMAT);

  if (!user.xpLastSettled) {
    // Brand-new user: nothing historical to settle lazily (pre-existing users
    // are handled by the one-time backfill). Anchor the cursor at yesterday.
    await UserModel.updateOne(
      { email, xpLastSettled: null },
      { $set: { xpLastSettled: yesterdayCursor } },
    ).exec();
    await maybeRewardReferral(email);
    return { settled: 0 };
  }

  if (user.xpLastSettled >= yesterdayCursor) {
    await maybeRewardReferral(email);
    return { settled: 0 };
  }

  // Build the oldest-first list of day cursors to process this call.
  const dayCursors = enumerateDayCursors(user.xpLastSettled, yesterdayCursor, maxLookbackDays);
  if (!dayCursors.length) return { settled: 0 };

  const dayKeys = dayCursors.map(cursorToDayKey);
  const routines = await RoutineModel.find({ email, date: { $in: dayKeys } }).exec();
  const byDate = {};
  routines.forEach((routine) => {
    if (!byDate[routine.date]) byDate[routine.date] = [];
    byDate[routine.date].push(routine);
  });

  let settled = 0;
  // Sequential to keep write pressure predictable; the unique index makes any
  // concurrent settlement (cron vs lazy) converge to a single credit per day.
  // eslint-disable-next-line no-restricted-syntax
  for (const dayKey of dayKeys) {
    const routine = pickBestRoutineForDate(byDate[dayKey], aggregateFn);
    const amount = computeDaySettleAmount(routine, aggregateFn);
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
 * Full balance snapshot. Settles lazily first so "available" always reflects
 * every day up to yesterday in the user's timezone.
 */
async function getXpBalance(email, { aggregateFn = defaultAggregateFn() } = {}) {
  await settleUserDays(email, { aggregateFn });

  const [totals, user] = await Promise.all([
    XpTransactionModel.aggregate([
      { $match: { email } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]).exec(),
    UserModel.findOne({ email }).exec(),
  ]);

  let earned = 0;
  let used = 0;
  totals.forEach(({ _id, total }) => {
    if (CREDIT_TYPES.includes(_id)) earned += total;
    if (_id === 'redeem') used += total;
  });

  const todayKey = getLocalDate(user && user.timezone);
  const todayRoutines = await RoutineModel.find({ email, date: todayKey }).exec();
  const todayRoutine = pickBestRoutineForDate(todayRoutines, aggregateFn);
  // Includes earnings from redeemed ticks — they settle tomorrow like any tick.
  const pendingToday = computeDaySettleAmount(todayRoutine, aggregateFn);

  return {
    earned,
    used,
    available: earned - used,
    pendingToday,
    entitled: isSubscriptionActive(user),
  };
}

async function grantWelcomePoints(email, timezone) {
  return recordTransaction({
    email,
    type: 'grant',
    date: getLocalDate(timezone),
    amount: WELCOME_GRANT_AMOUNT,
    refKey: 'welcome',
  });
}

module.exports = {
  DAILY_STIMULUS_CAP,
  WELCOME_GRANT_AMOUNT,
  REFERRAL_REWARD_AMOUNT,
  REFERRAL_MIN_SETTLED_DAYS,
  REFERRAL_MAX_REWARDED_INVITES,
  dayKeyToCursor,
  cursorToDayKey,
  enumerateDayCursors,
  referralDecision,
  computeDaySettleAmount,
  pickBestRoutineForDate,
  validateRedeem,
  recordTransaction,
  maybeRewardReferral,
  settleUserDays,
  getXpBalance,
  grantWelcomePoints,
};
