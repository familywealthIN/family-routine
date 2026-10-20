/**
 * Send one routine cue to one person, now — the same cue the per-minute job
 * would send (7-day context, AI copy with template fallback, action buttons by
 * AI level, every signed-in device).
 *
 *   node send-cue-now.js <email> [routine name] [--dry-run]
 *
 * Without a routine name it picks the person's next routine today. With
 * --dry-run it prints the cue and sends nothing.
 */
require('./utils/suppressMongooseWarnings')();
require('dotenv').config();

const mongoose = require('mongoose');
const admin = require('firebase-admin');

const { getLocalDate, resolveTimezone } = require('./utils/timezone');
const { encryption } = require('./utils/encryption');
const { deviceTokens, sendToUser, DEFAULT_CHANNEL } = require('./utils/push');
const {
  itemHistory, historyDates, minuteOfDay, toMinutes, nextTarget, cueCopy, cueTiming,
} = require('./cue/cueEngine');
const { buildCueContext, generateAiCue } = require('./cue/aiCue');
const { routineActions, routineRoute } = require('./cue/routineActions');

const serviceAccount = require('../serviceAccountKey.json');

const { MONGDO_DB, DOMAIN } = process.env;
const DAY_MS = 24 * 60 * 60 * 1000;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [email, ...nameParts] = args.filter((a) => a !== '--dry-run');
const wanted = nameParts.join(' ').trim().toLowerCase();

if (!email) {
  console.error('usage: node send-cue-now.js <email> [routine name] [--dry-run]');
  process.exit(2);
}

const dec = (text) => encryption.decrypt(text);
const findTask = (routine, id) => routine && (routine.tasklist || [])
  .find((t) => String(t._id || t.id) === String(id));

/** The named routine, else the next one today that is not done yet. */
function pickRoutine(items, todayRoutine, nowMinute) {
  if (wanted) {
    return items.find((i) => i.name.toLowerCase() === wanted)
      || items.find((i) => i.name.toLowerCase().includes(wanted));
  }
  const open = items
    .filter((i) => toMinutes(i.time) !== null && !(findTask(todayRoutine, i._id) || {}).ticked)
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  return open.find((i) => toMinutes(i.time) >= nowMinute) || open[0];
}

async function main(db) {
  const user = await db.collection('users').findOne(
    { email },
    {
      projection: {
        email: 1, notificationId: 1, notificationIds: 1, timezone: 1, motto: 1,
      },
    },
  );
  if (!user) throw new Error(`no user ${email}`);

  const timezone = resolveTimezone(user.timezone);
  const now = new Date();
  const today = getLocalDate(timezone, now);
  const nowMinute = minuteOfDay(now, timezone);

  const [rawItems, routines] = await Promise.all([
    db.collection('routineitems').find({ email }).toArray(),
    db.collection('routines').find({ email, date: { $in: historyDates(today) } }, {
      projection: {
        date: 1, skip: 1, 'tasklist._id': 1, 'tasklist.ticked': 1, 'tasklist.tickedAt': 1,
      },
    }).toArray(),
  ]);
  const items = rawItems.map((i) => ({
    ...i,
    name: dec(i.name),
    steps: (i.steps || []).map((s) => ({ ...s, name: dec(s.name) })),
  }));
  const todayRoutine = routines.find((r) => r.date === today);
  const item = pickRoutine(items, todayRoutine, nowMinute);
  if (!item) {
    throw new Error(`no routine ${wanted ? `matching "${wanted}"` : 'left today'}. Routines: ${items.map((i) => i.name).join(', ')}`);
  }
  const routineId = String(item._id);

  const ordered = [...items].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const prev = ordered[ordered.findIndex((i) => String(i._id) === routineId) - 1];
  const anchor = prev && (findTask(todayRoutine, prev._id) || {}).ticked ? prev.name : null;

  const history = itemHistory({
    itemId: item._id, routines, today, timezone,
  });
  const timing = cueTiming(toMinutes(item.time), history);
  const motto = (user.motto || []).map((m) => dec(m && m.mottoItem)).find(Boolean);
  const identity = motto && motto.length <= 40 ? motto : null;
  const template = cueCopy({
    item, history, timing, anchor, identity, today,
  });

  const [agent, chats, linked, insight] = await Promise.all([
    db.collection('agents').findOne({ email, taskRef: routineId }, { projection: { _id: 1 } }),
    db.collection('routinechatmessages').countDocuments({
      email, taskRef: routineId, from: 'me', createdAt: { $gte: new Date(now.getTime() - 30 * DAY_MS) },
    }),
    db.collection('goals').countDocuments({ email, 'goalItems.taskRef': routineId }),
    db.collection('routinechatmessages').findOne(
      {
        email, taskRef: routineId, from: 'routine', icon: 'tips_and_updates', createdAt: { $gte: new Date(now.getTime() - 7 * DAY_MS) },
      },
      { sort: { createdAt: -1 }, projection: { text: 1 } },
    ),
  ]);

  const ctx = buildCueContext({
    item,
    history,
    kind: template.kind,
    anchor,
    identity,
    insight: insight ? dec(insight.text) : null,
    nextTarget: nextTarget(history.streak),
  });
  const ai = await generateAiCue(ctx);
  const copy = ai.cue || { title: template.title, body: template.body };
  const actions = routineActions({ hasAgent: !!agent, hasAiContext: chats > 0 || linked > 0 });

  console.log(JSON.stringify({
    routine: item.name,
    time: item.time,
    devices: deviceTokens(user).length,
    copy: ai.cue ? 'ai' : `template (${ai.reason})`,
    title: copy.title,
    body: copy.body,
    buttons: actions.category,
    context: ctx,
  }, null, 2));

  if (dryRun) return;
  const result = await sendToUser({
    messaging: admin.messaging(),
    db,
    user,
    title: copy.title,
    body: copy.body,
    data: {
      click_action: DOMAIN || '',
      routineId,
      action: actions.action,
      aiLevel: actions.level,
      route: routineRoute(routineId, 'focus'),
      cue: template.kind,
      copy: ai.cue ? 'ai' : 'template',
      agentId: agent ? String(agent._id) : undefined,
    },
    category: actions.category,
    channel: DEFAULT_CHANNEL,
  });
  console.log(`sent to ${result.sent} device(s)${result.pruned ? `, pruned ${result.pruned} dead` : ''}`);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
mongoose.connect(MONGDO_DB, { useNewUrlParser: true });
const db = mongoose.connection;
db.once('open', () => main(db)
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect().then(() => process.exit())));
