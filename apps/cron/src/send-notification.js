/* eslint-disable quote-props */
require('dotenv').config();

const mongoose = require('mongoose');
const admin = require('firebase-admin');

const crypto = require('crypto');

const { getLocalTime, getLocalDate, groupUsersByTimezone } = require('./utils/timezone');
const {
  minuteOfDay, historyDates, candidateSetTimes, dueCues, batchCues, nextTarget,
} = require('./cue/cueEngine');
const {
  HAS_DEVICE, ALARM_CHANNEL, DEFAULT_CHANNEL, deviceTokens, sendToUser,
} = require('./utils/push');
const { routineActions, routineRoute } = require('./cue/routineActions');
const { buildCueContext, generateAiCue } = require('./cue/aiCue');

const DAY_MS = 24 * 60 * 60 * 1000;
const CONTEXT_DAYS = 30; // chat this recent counts as the routine having AI context

const serviceAccount = require('../serviceAccountKey.json');

const {
  MONGDO_DB,
  DOMAIN,
  ENCRYPTION_KEY,
} = process.env;

// Inline decryption — mirrors src/server/utils/encryption.js
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

const encryptionKey = ENCRYPTION_KEY
  ? crypto.scryptSync(ENCRYPTION_KEY, 'family-routine-salt', 32)
  : crypto.scryptSync('default-dev-key', 'salt', 32);

function isEncrypted(text) {
  if (!text || typeof text !== 'string' || text.length < 50) return false;
  if (!/^[A-Za-z0-9+/=]+$/.test(text)) return false;
  try {
    return Buffer.from(text, 'base64').length >= ENCRYPTED_POSITION + 1;
  } catch { return false; }
}

function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  if (!isEncrypted(encryptedText)) return encryptedText;

  try {
    const combined = Buffer.from(encryptedText, 'base64');
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, TAG_POSITION);
    const tag = combined.slice(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = combined.slice(ENCRYPTED_POSITION);

    if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH
      || tag.length !== TAG_LENGTH || encrypted.length === 0) {
      return encryptedText;
    }

    // Try new format (createDecipheriv) first
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
      decipher.setAAD(salt);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      // Fall back to legacy createDecipher for old encrypted data
      const legacyDecipher = crypto.createDecipher(ALGORITHM, encryptionKey);
      legacyDecipher.setAAD(salt);
      legacyDecipher.setAuthTag(tag);
      let decrypted = legacyDecipher.update(encrypted, null, 'utf8');
      decrypted += legacyDecipher.final('utf8');
      return decrypted;
    }
  } catch {
    return encryptedText;
  }
}

function decryptFields(obj, fields) {
  const result = { ...obj };
  fields.forEach((f) => { if (result[f]) result[f] = decrypt(result[f]); });
  return result;
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // databaseURL: 'https://groutine-21c1b.firebaseio.com',
});

function exitProcess() {
  console.log(`process ended at ${new Date()}`);
  process.exit();
}

console.log('Process Started: context-aware cue dispatch');
const notificationList = [];

const firstMotto = (user) => {
  const motto = (user.motto || []).map((m) => decrypt(m && m.mottoItem)).find(Boolean);
  return motto && motto.length <= 40 ? motto : null;
};

const MAX_AI_CUES_PER_RUN = 40; // cost and the 59 s run limit
const aiEnabled = () => process.env.CUE_AI !== 'off' && !!process.env.OPENROUTER_API_KEY;

/**
 * Replace template copy with Claude's 7-day-context cue where it validates.
 * Alarms (a fixed promise) and batches keep their template. Mutates `due`.
 */
async function writeAiCues(db, due, emails, dueIds, now) {
  if (!aiEnabled()) return;
  const eligible = due.filter((c) => !c.alarm && c.kind !== 'batch' && c.history).slice(0, MAX_AI_CUES_PER_RUN);
  if (!eligible.length) return;
  const insights = await db.collection('routinechatmessages')
    .find({
      email: { $in: emails },
      taskRef: { $in: dueIds },
      from: 'routine',
      icon: 'tips_and_updates',
      createdAt: { $gte: new Date(now.getTime() - 7 * DAY_MS) },
    }, {
      projection: {
        email: 1, taskRef: 1, text: 1, createdAt: 1,
      },
    })
    .sort({ createdAt: -1 })
    .toArray();
  const latestInsight = new Map();
  insights.forEach((m) => {
    const key = `${m.email}:${m.taskRef}`;
    if (!latestInsight.has(key)) latestInsight.set(key, decrypt(m.text));
  });

  await Promise.all(eligible.map(async (cue) => {
    const ctx = buildCueContext({
      item: cue.item,
      history: cue.history,
      kind: cue.kind,
      anchor: cue.anchor,
      identity: firstMotto(cue.user),
      insight: latestInsight.get(`${cue.user.email}:${cue.item._id}`),
      nextTarget: nextTarget(cue.history.streak),
    });
    const { cue: written, reason } = await generateAiCue(ctx);
    if (written) {
      Object.assign(cue, written, { source: 'ai' });
    } else {
      console.log(`AI cue fell back to template (${reason}) for ${cue.item._id}`);
    }
  }));
}

mongoose.connect(MONGDO_DB, { useNewUrlParser: true });
const db = mongoose.connection;
db.once('open', async () => {
  try {
    // Only users signed in on at least one device: sign-out releases that
    // device's token, so a signed-out device is never in this list.
    const users = (await db.collection('users')
      .find(HAS_DEVICE, {
        projection: {
          email: 1, notificationId: 1, notificationIds: 1, timezone: 1, motto: 1,
        },
      })
      .toArray())
      .filter((u) => deviceTokens(u).length);

    const groups = groupUsersByTimezone(users);
    const now = new Date();

    const perGroup = Array.from(groups.entries()).map(async ([timezone, groupUsers]) => {
      const today = getLocalDate(timezone, now);
      const nowMinute = minuteOfDay(now, timezone);
      const userByEmail = new Map(groupUsers.map((u) => [u.email, u]));

      // Narrow first: only users with an item whose cue could land this minute.
      const candidates = await db.collection('routineitems')
        .find(
          {
            email: { $in: Array.from(userByEmail.keys()) },
            time: { $in: candidateSetTimes(nowMinute) },
          },
          { projection: { email: 1 } },
        )
        .toArray();
      const emails = Array.from(new Set(candidates.map((c) => c.email)));
      if (!emails.length) return;

      console.log(`[${timezone}] ${getLocalTime(timezone, now)}: ${emails.length} user(s) with cues in range`);

      const [items, routines] = await Promise.all([
        db.collection('routineitems')
          .find(
            { email: { $in: emails } },
            {
              projection: {
                name: 1, description: 1, email: 1, time: 1, points: 1, steps: 1, notifyMode: 1,
              },
            },
          )
          .toArray(),
        db.collection('routines')
          .find(
            { email: { $in: emails }, date: { $in: historyDates(today) } },
            {
              projection: {
                date: 1, email: 1, skip: 1, 'tasklist._id': 1, 'tasklist.ticked': 1, 'tasklist.tickedAt': 1,
              },
            },
          )
          .toArray(),
      ]);

      const due = emails.flatMap((email) => {
        const user = userByEmail.get(email);
        const cues = dueCues({
          now,
          timezone,
          today,
          items: items
            .filter((i) => i.email === email)
            .map((i) => ({
              ...decryptFields(i, ['name', 'description']),
              steps: (i.steps || []).map((st) => ({ ...st, name: decrypt(st.name) })),
            })),
          routines: routines.filter((r) => r.email === email),
          identity: firstMotto(user),
        });
        return batchCues(cues).map((cue) => ({ ...cue, user }));
      });
      if (!due.length) return;

      const dueIds = due.map((c) => String(c.item._id));
      const [agents, chats, linkedGoals] = await Promise.all([
        db.collection('agents')
          .find(
            { email: { $in: emails }, taskRef: { $in: dueIds } },
            { projection: { taskRef: 1, email: 1 } },
          )
          .toArray(),
        // AI context the server can see: the person talked to the routine...
        db.collection('routinechatmessages')
          .find(
            {
              email: { $in: emails },
              taskRef: { $in: dueIds },
              from: 'me',
              createdAt: { $gte: new Date(now.getTime() - CONTEXT_DAYS * DAY_MS) },
            },
            { projection: { taskRef: 1, email: 1 } },
          )
          .toArray(),
        // ...or goal items are linked to it.
        db.collection('goals')
          .find(
            { email: { $in: emails }, 'goalItems.taskRef': { $in: dueIds } },
            { projection: { email: 1, 'goalItems.taskRef': 1 } },
          )
          .limit(500)
          .toArray(),
      ]);
      const agentByKey = new Map(agents.map((a) => [`${a.email}:${a.taskRef}`, a]));
      await writeAiCues(db, due, emails, dueIds, now);
      const contextKeys = new Set([
        ...chats.map((c) => `${c.email}:${c.taskRef}`),
        ...linkedGoals.flatMap((g) => (g.goalItems || [])
          .filter((gi) => gi.taskRef).map((gi) => `${g.email}:${gi.taskRef}`)),
      ]);

      due.forEach(({
        user, item, title, body, kind, mode, alarm, source = 'template',
      }) => {
        const routineId = String(item._id);
        const key = `${user.email}:${routineId}`;
        const agent = agentByKey.get(key);
        const actions = kind === 'batch'
          ? routineActions({})
          : routineActions({ hasAgent: !!agent, hasAiContext: contextKeys.has(key) });
        const data = {
          click_action: DOMAIN || '',
          routineId,
          action: actions.action,
          aiLevel: actions.level,
          // A plain tap only opens the routine; acting (tick, start, build) is
          // what the buttons are for.
          route: kind === 'batch' ? '/home' : routineRoute(routineId, 'focus'),
          cue: kind,
          copy: source,
          agentId: agent ? String(agent._id) : undefined,
        };
        console.log(`Cue ${kind}/${mode}/${actions.level}/${source} to ${user.email} (${routineId})`);
        notificationList.push(sendToUser({
          messaging: admin.messaging(),
          db,
          user,
          title,
          body,
          data,
          category: actions.category,
          channel: alarm ? ALARM_CHANNEL : DEFAULT_CHANNEL,
          timeSensitive: !!alarm,
        }));
      });
    });

    await Promise.all(perGroup);
    await Promise.all(notificationList);
  } catch (error) {
    console.error('send-notification error:', error);
  } finally {
    exitProcess();
  }
});

setTimeout(() => exitProcess(), 59 * 1000);
