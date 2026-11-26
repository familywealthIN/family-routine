const {
  GraphQLID,
  GraphQLInt,
  GraphQLString,
  GraphQLList,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLInputObjectType,
} = require('graphql');

const {
  RoutineChatMessageModel,
  RoutineChatMessageType,
  RoutineChatReplyType,
  decryptSaved,
  encryptText,
  TEXT_MAX,
  TONES,
} = require('../schema/RoutineChatSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
const { chatWithRoutine, PROPOSAL_INTENTS } = require('../utils/chatApi');
const { chatWeekDates, weekDigest } = require('../utils/chatWeek');
const { RoutineModel } = require('../schema/RoutineSchema');
const { GoalModel } = require('../schema/GoalSchema');
const { periodChildDates } = require('./goal');
const {
  previousDates,
  periodDates,
  summariseRoutineHistory,
  generateRoutineInsight,
} = require('../utils/routineInsight');

// Marks the one "how do I improve this routine" paragraph a thread gets per day.
const INSIGHT_ICON = 'tips_and_updates';
const BRIEF_MAX = 1500;

// How many turns of a thread the model gets to see. Free models have small
// context budgets, and the routine snapshot is what actually steers the reply.
const HISTORY_WINDOW = 20;

const cap = (value, max) => {
  if (typeof value !== 'string') return value;
  return value.length > max ? value.slice(0, max) : value;
};

const ChatChecklistItemInput = new GraphQLInputObjectType({
  name: 'ChatChecklistItemInput',
  fields: {
    id: { type: GraphQLString },
    body: { type: GraphQLString },
    isComplete: { type: GraphQLBoolean },
  },
});

/**
 * The client's snapshot of what the user is looking at. Sent per message
 * rather than recomputed server-side: the focused routine, its window and its
 * D/K/G percentages are all client-derived (`countTotal`, `currentTask`), and
 * duplicating that arithmetic here would be a second source of truth.
 */
const ChatContextInput = new GraphQLInputObjectType({
  name: 'ChatContextInput',
  fields: {
    routineName: { type: GraphQLString },
    routineTime: { type: GraphQLString },
    routineEnd: { type: GraphQLString },
    routineStatus: { type: GraphQLString },
    stimulus: { type: GraphQLString },
    points: { type: GraphQLInt },
    ticked: { type: GraphQLBoolean },
    doneCount: { type: GraphQLInt },
    totalCount: { type: GraphQLInt },
    scoreD: { type: GraphQLInt },
    scoreK: { type: GraphQLInt },
    scoreG: { type: GraphQLInt },
    items: { type: new GraphQLList(ChatChecklistItemInput) },
    // The area/project description + next steps the client already caches for
    // the "Before you start" brief — the same text the post-tick card reads.
    brief: { type: GraphQLString },
    // The routine's agent and its Home badge stage today, so "run it again"
    // can be answered. No name means the routine has no agent.
    agentName: { type: GraphQLString },
    agentStage: { type: GraphQLString },
  },
});

/**
 * This routine's last seven days, as text for the chat. Optional context: a
 * failed read leaves the chat answering from today alone, never failing it.
 */
async function loadWeek({ email, date, taskRef }) {
  try {
    const dates = chatWeekDates(date);
    const { week, month } = periodDates(date);
    // The week goal's milestones sit on its own Sunday..Saturday, which can
    // run past today, so its tally reads those day docs too.
    const weekDates = periodChildDates('week', date);
    const goalDates = [...new Set([...dates, ...weekDates])];
    const [routines, goals, periodGoals] = await Promise.all([
      RoutineModel.find({ email, date: { $in: dates } }).lean().exec(),
      GoalModel.find({ email, period: 'day', date: { $in: goalDates } }).exec(),
      GoalModel.find({
        email,
        $or: [{ period: 'week', date: week }, { period: 'month', date: month }],
      }).exec(),
    ]);
    return weekDigest({
      routines, goals, periodGoals, weekDates, taskRef, today: date,
    });
  } catch (error) {
    console.warn('[routineChat] week context unavailable:', error.message);
    return '';
  }
}

const query = {
  routineChat: {
    type: new GraphQLList(RoutineChatMessageType),
    args: {
      date: { type: new GraphQLNonNull(GraphQLString) },
      taskRef: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: (root, { date, taskRef }, context) => {
      const email = getEmailfromSession(context);
      return RoutineChatMessageModel
        .find({ email, date, taskRef })
        .sort({ createdAt: 1 })
        .exec();
    },
  },
};

/** The one row a thread's coach card may occupy, for a day and a routine. */
const insightKey = (email, date, taskRef) => ({
  email, date, taskRef, from: 'routine', kind: 'text', icon: INSIGHT_ICON,
});

/**
 * Coach cards being composed right now, by `email|date|taskRef`.
 *
 * The client's tick fires the insight twice — once on the optimistic write and
 * again when the server's re-read of the day flips `ticked` back to true (D-05)
 * — and the model takes about a second to answer, so the second call arrived
 * while the first was still waiting and the read-then-create wrote a second
 * card. A call that finds its thread already being written joins that call
 * instead of starting a new one.
 */
const insightsInFlight = new Map();

/**
 * Compose today's coach card and write it, exactly once per thread.
 *
 * The write is an upsert on the card's own identity rather than a plain
 * `save()`: two processes can still reach it together, and whichever gets there
 * first owns the card — the other one gets that card back and persists nothing.
 * A duplicate-key error means the unique index caught the same race a moment
 * later, so the answer is the same: read what won. That index —
 * `{ email: 1, date: 1, taskRef: 1 }`, unique, partial on `icon: INSIGHT_ICON`
 * — is a migration against an existing collection, so it is not declared on the
 * schema; this path is correct with or without it.
 */
const writeRoutineInsight = async (email, args) => {
  const {
    date, taskRef, routineName, brief, tickedAt, windowEnd, minutesLeft,
  } = args;
  const criteria = insightKey(email, date, taskRef);

  // Today is included so the run of check-ins counts the tick that asked.
  const dates = [date, ...previousDates(date)];
  const { week, month } = periodDates(date);
  const [routines, goals, earlier, periodGoals] = await Promise.all([
    RoutineModel.find({ email, date: { $in: dates } }).lean().exec(),
    GoalModel.find({ email, period: 'day', date: { $in: dates } }).exec(),
    // Past insights, so tomorrow's idea is never yesterday's again.
    RoutineChatMessageModel.find({
      email, taskRef, from: 'routine', kind: 'text', icon: INSIGHT_ICON, date: { $in: dates },
    }).sort({ _id: -1 }).limit(5).exec(),
    GoalModel.find({
      email,
      $or: [{ period: 'week', date: week }, { period: 'month', date: month }],
    }).exec(),
  ]);
  const hhmm = (v) => (/^\d{1,2}:\d{2}$/.test(String(v || '')) ? String(v) : null);
  const summary = summariseRoutineHistory({
    routines,
    goals,
    taskRef,
    today: date,
    periodGoals,
    moment: {
      tickedAt: hhmm(tickedAt),
      windowEnd: hhmm(windowEnd),
      minutesLeft: Number.isInteger(minutesLeft) ? Math.max(0, Math.min(minutesLeft, 24 * 60)) : null,
    },
  });
  const { text, model } = await generateRoutineInsight({
    summary,
    routineName: cap(String(routineName || ''), 120),
    brief: cap(String(brief || ''), BRIEF_MAX),
    previous: earlier.map((m) => m.text),
  });

  // `findOneAndUpdate` skips `pre('save')`, so the body is encrypted here by the
  // schema's own cipher; the post-read hook decrypts what comes back.
  try {
    return await RoutineChatMessageModel
      .findOneAndUpdate(
        criteria,
        { $setOnInsert: { text: encryptText(cap(text, TEXT_MAX)), model: model || null } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  } catch (error) {
    if (error && error.code === 11000) {
      return RoutineChatMessageModel.findOne(criteria).exec();
    }
    throw error;
  }
};

const mutation = {
  sendRoutineChat: {
    type: RoutineChatReplyType,
    args: {
      date: { type: new GraphQLNonNull(GraphQLString) },
      taskRef: { type: new GraphQLNonNull(GraphQLString) },
      text: { type: new GraphQLNonNull(GraphQLString) },
      context: { type: ChatContextInput },
    },
    resolve: async (root, args, ctx) => {
      const email = getEmailfromSession(ctx);
      const {
        date, taskRef, text, context: snapshot,
      } = args;

      const body = cap(String(text || '').trim(), TEXT_MAX);
      if (!body) {
        throw new Error('A chat message cannot be empty');
      }

      // `save()` resolves with the ENCRYPTED document (pre-save encrypts in
      // place), so every saved doc is decrypted before it leaves the resolver.
      const userMessage = decryptSaved(await new RoutineChatMessageModel({
        email, date, taskRef, from: 'me', kind: 'text', text: body,
      }).save());

      const [history, week] = await Promise.all([
        RoutineChatMessageModel
          .find({ email, date, taskRef, kind: 'text' })
          .sort({ createdAt: -1 })
          .limit(HISTORY_WINDOW)
          .exec(),
        loadWeek({ email, date, taskRef }),
      ]);

      const turns = history
        .reverse()
        // The message just saved is the prompt, not history.
        .filter((m) => String(m._id) !== String(userMessage._id))
        .map((m) => ({ from: m.from, text: m.text, proposals: m.proposals }));

      const snap = snapshot || {};
      const result = await chatWithRoutine({
        text: body,
        history: turns,
        context: {
          date,
          routineName: snap.routineName,
          routineTime: snap.routineTime,
          routineEnd: snap.routineEnd,
          routineStatus: snap.routineStatus,
          stimulus: snap.stimulus,
          points: snap.points,
          ticked: snap.ticked,
          doneCount: snap.doneCount,
          totalCount: snap.totalCount,
          items: snap.items || [],
          scores: { D: snap.scoreD, K: snap.scoreK, G: snap.scoreG },
          week,
          brief: cap(String(snap.brief || ''), BRIEF_MAX),
          agent: snap.agentName ? { name: snap.agentName, stage: snap.agentStage } : null,
        },
      });

      // A break-down or suggestion turn's tasks are PROPOSALS — they render
      // with an "Add all to checklist" button and only become goal items when
      // pressed. An explicit add's tasks are created by the client straight
      // away, so its bubble carries no proposals.
      const proposals = PROPOSAL_INTENTS.includes(result.intent) ? result.tasks : [];

      const replyMessage = decryptSaved(await new RoutineChatMessageModel({
        email,
        date,
        taskRef,
        from: 'routine',
        kind: 'text',
        text: cap(result.reply, TEXT_MAX),
        proposals,
        suggestions: result.suggestions || [],
        model: result.model || null,
      }).save());

      return {
        userMessage,
        replyMessage,
        intent: result.intent,
        tasks: result.tasks,
        completeItemId: result.completeItemId,
        targetItemId: result.targetItemId,
        model: result.model,
        error: result.error,
      };
    },
  },

  /**
   * The first message after a routine is ticked — once per routine per day, as
   * a coach card: a title, why this tick matters, and one concrete action
   * ("Right now:" / "Next time:"). The reasoning is deterministic
   * (utils/insightStrategy: diagnose the last month, pick one hook and one
   * lever); the model only writes it, and is validated against the facts. The
   * area/project description + next steps the client caches (`brief`) feed
   * both. Idempotent: a thread that already holds today's card gets it back,
   * and two calls that race for the same thread share one card (D-05).
   */
  routineInsight: {
    type: RoutineChatMessageType,
    args: {
      date: { type: new GraphQLNonNull(GraphQLString) },
      taskRef: { type: new GraphQLNonNull(GraphQLString) },
      routineName: { type: GraphQLString },
      brief: { type: GraphQLString },
      // The tick as the client saw it, in the user's own clock: the server only
      // knows UTC, and the window's end is the next routine's start.
      tickedAt: { type: GraphQLString },
      windowEnd: { type: GraphQLString },
      minutesLeft: { type: GraphQLInt },
    },
    resolve: async (root, args, ctx) => {
      const email = getEmailfromSession(ctx);
      const { date, taskRef } = args;

      const existing = await RoutineChatMessageModel
        .findOne(insightKey(email, date, taskRef))
        .exec();
      if (existing) return existing;

      // The read above only settles it for a card that is already written. A
      // card still being composed is answered by joining its call.
      const key = `${email}|${date}|${taskRef}`;
      if (!insightsInFlight.has(key)) {
        insightsInFlight.set(
          key,
          writeRoutineInsight(email, args).finally(() => insightsInFlight.delete(key)),
        );
      }
      return insightsInFlight.get(key);
    },
  },

  /**
   * Post a system event pill into a thread — "Routine ticked · D +12",
   * "Ship dashboard PR · 1 left", "Agent started". Written by the client at
   * the moment the underlying mutation succeeds, so the thread is a real log
   * of the day rather than a reconstruction.
   */
  postRoutineChatEvent: {
    type: RoutineChatMessageType,
    args: {
      date: { type: new GraphQLNonNull(GraphQLString) },
      taskRef: { type: new GraphQLNonNull(GraphQLString) },
      text: { type: new GraphQLNonNull(GraphQLString) },
      tone: { type: GraphQLString },
      icon: { type: GraphQLString },
      items: { type: new GraphQLList(GraphQLString) },
    },
    resolve: async (root, args, ctx) => {
      const email = getEmailfromSession(ctx);
      const {
        date, taskRef, text, tone, icon, items,
      } = args;
      return decryptSaved(await new RoutineChatMessageModel({
        email,
        date,
        taskRef,
        from: 'routine',
        kind: 'event',
        text: cap(String(text || '').trim(), TEXT_MAX),
        tone: TONES.includes(tone) ? tone : 'green',
        icon: icon || null,
        items: Array.isArray(items) ? items : [],
      }).save());
    },
  },

  /**
   * Flip a break-down bubble's proposals to "added" once the user has accepted
   * them, so the button doesn't offer the same three subtasks twice.
   */
  markRoutineChatAdded: {
    type: RoutineChatMessageType,
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      items: { type: new GraphQLList(GraphQLString) },
    },
    resolve: async (root, { id, items }, ctx) => {
      const email = getEmailfromSession(ctx);
      const update = { added: true };
      if (Array.isArray(items) && items.length) update.items = items;
      return RoutineChatMessageModel
        .findOneAndUpdate({ _id: id, email }, update, { new: true })
        .exec();
    },
  },

  /**
   * Rewrite a reply bubble whose claim the client could not carry out.
   *
   * The model composes its reply BEFORE the client attempts the goal-item
   * writes the intent asks for, so an `add_tasks` turn whose create failed left
   * a persisted bubble reading "Added: …" for a task the checklist never got —
   * and it survived a reload, contradicted only by the event pill beneath it
   * (D-03). The pill is still the event log; this corrects the claim itself.
   *
   * `findOneAndUpdate` skips `pre('save')`, so the new body is encrypted here
   * by the schema's own cipher; the post-read hook decrypts what comes back.
   * Scoped to the routine's own text bubbles: a user message is the user's words
   * and an event pill is already a record of what happened.
   */
  reviseRoutineChatReply: {
    type: RoutineChatMessageType,
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
      text: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, { id, text }, ctx) => {
      const email = getEmailfromSession(ctx);
      const body = cap(String(text || '').trim(), TEXT_MAX);
      if (!body) {
        throw new Error('A chat message cannot be empty');
      }
      return RoutineChatMessageModel
        .findOneAndUpdate(
          {
            _id: id, email, from: 'routine', kind: 'text',
          },
          { text: encryptText(body) },
          { new: true },
        )
        .exec();
    },
  },

  clearRoutineChat: {
    type: GraphQLInt,
    args: {
      date: { type: new GraphQLNonNull(GraphQLString) },
      taskRef: { type: new GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, { date, taskRef }, ctx) => {
      const email = getEmailfromSession(ctx);
      const result = await RoutineChatMessageModel
        .deleteMany({ email, date, taskRef })
        .exec();
      return (result && result.deletedCount) || 0;
    },
  },
};

module.exports = { query, mutation };
