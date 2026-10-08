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
  TEXT_MAX,
  TONES,
} = require('../schema/RoutineChatSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
const { chatWithRoutine } = require('../utils/chatApi');
const { RoutineModel } = require('../schema/RoutineSchema');
const { GoalModel } = require('../schema/GoalSchema');
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
  },
});

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

      const history = await RoutineChatMessageModel
        .find({ email, date, taskRef, kind: 'text' })
        .sort({ createdAt: -1 })
        .limit(HISTORY_WINDOW)
        .exec();

      const turns = history
        .reverse()
        // The message just saved is the prompt, not history.
        .filter((m) => String(m._id) !== String(userMessage._id))
        .map((m) => ({ from: m.from, text: m.text }));

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
        },
      });

      // A break-down turn's tasks are PROPOSALS — they render with an "Add all
      // to checklist" button and only become goal items when pressed. Every
      // other intent's tasks are created by the client straight away, so the
      // reply bubble carries no proposals.
      const proposals = result.intent === 'break_down' ? result.tasks : [];

      const replyMessage = decryptSaved(await new RoutineChatMessageModel({
        email,
        date,
        taskRef,
        from: 'routine',
        kind: 'text',
        text: cap(result.reply, TEXT_MAX),
        proposals,
        model: result.model || null,
      }).save());

      return {
        userMessage,
        replyMessage,
        intent: result.intent,
        tasks: result.tasks,
        completeItemId: result.completeItemId,
        model: result.model,
        error: result.error,
      };
    },
  },

  /**
   * The first message after a routine is ticked — once per routine per day, in
   * three sentences that celebrate a real win, offer one fresh idea for the next
   * session and end on a target within reach. Grounded in the last month: the
   * run of check-ins, this week against last, K/D/G earned, the activities done
   * most, and the area/project description + next steps the client already
   * caches (`brief`). Idempotent: a thread that already holds today's paragraph
   * gets it back.
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
      const {
        date, taskRef, routineName, brief, tickedAt, windowEnd, minutesLeft,
      } = args;

      const existing = await RoutineChatMessageModel
        .findOne({
          email, date, taskRef, from: 'routine', kind: 'text', icon: INSIGHT_ICON,
        })
        .exec();
      if (existing) return existing;

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

      return decryptSaved(await new RoutineChatMessageModel({
        email,
        date,
        taskRef,
        from: 'routine',
        kind: 'text',
        text: cap(text, TEXT_MAX),
        icon: INSIGHT_ICON,
        model: model || null,
      }).save());
    },
  },

  /**
   * Post a system event pill into a thread — "Routine ticked · G +12",
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
