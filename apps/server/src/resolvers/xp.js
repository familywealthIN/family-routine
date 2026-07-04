/* eslint-disable no-underscore-dangle */
const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLNonNull,
  GraphQLObjectType,
} = require('graphql');

const { RoutineModel, RoutineType } = require('../schema/RoutineSchema');
const { UserModel } = require('../schema/UserSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
const ApiError = require('../utils/ApiError');
const sortTimes = require('../utils/sortTimes');
const { updateStimulusEarnedPoint } = require('../utils/stimulusPoints');
const { isSubscriptionActive } = require('../utils/entitlement');
const {
  validateRedeem,
  getXpBalance,
  recordTransaction,
} = require('../utils/xpLedger');

const XpBalanceType = new GraphQLObjectType({
  name: 'XpBalance',
  fields: {
    earned: { type: GraphQLFloat },
    used: { type: GraphQLFloat },
    available: { type: GraphQLFloat },
    pendingToday: { type: GraphQLFloat },
    entitled: { type: GraphQLBoolean },
  },
});

const RedeemResultType = new GraphQLObjectType({
  name: 'RedeemResult',
  fields: {
    routine: { type: RoutineType },
    balance: { type: XpBalanceType },
  },
});

const query = {
  xpBalance: {
    type: XpBalanceType,
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      return getXpBalance(email);
    },
  },
};

const mutation = {
  redeemRoutineItem: {
    type: RedeemResultType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      taskId: { type: GraphQLNonNull(GraphQLString) },
      date: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const user = await UserModel.findOne({ email }).exec();
      const routine = await RoutineModel.findOne({ _id: args.id, email }).exec();

      // getXpBalance settles lazily first, so "available" covers every day up
      // to yesterday; today's earnings stay pending and cannot fund today's
      // redemptions.
      const balance = await getXpBalance(email);
      const entitled = isSubscriptionActive(user);

      const verdict = validateRedeem({
        user,
        routine,
        taskId: args.taskId,
        clientDate: args.date,
        available: balance.available,
        entitled,
      });
      if (!verdict.ok) {
        throw new ApiError(verdict.code, verdict.message);
      }

      // Flip the task first, atomically — the $elemMatch guard makes a
      // concurrent double-redeem impossible. The redeemed flag marks the tick
      // as bought (replay protection + analytics); the tick itself earns
      // stimulus points like a normal tick, settling overnight.
      const task = verdict.task;
      const stimuli = updateStimulusEarnedPoint('D', task);
      const updatedRoutine = await RoutineModel.findOneAndUpdate(
        {
          _id: args.id,
          email,
          tasklist: {
            $elemMatch: {
              _id: args.taskId,
              ticked: { $ne: true },
              redeemed: { $ne: true },
            },
          },
        },
        {
          $set: {
            'tasklist.$.ticked': true,
            'tasklist.$.redeemed': true,
            'tasklist.$.stimuli': stimuli,
          },
        },
        { new: true },
      ).exec();
      if (!updatedRoutine) {
        throw new ApiError(409, '409:Task is already checked');
      }

      // Debit after the flip. Idempotent refKey — a crash between flip and
      // debit errs in the user's favor and a retry cannot double-charge.
      await recordTransaction({
        email,
        type: 'redeem',
        date: args.date,
        amount: entitled ? 0 : verdict.cost,
        refKey: `${args.date}:${args.taskId}`,
        taskId: args.taskId,
        meta: entitled ? { subscription: true } : undefined,
      });

      sortTimes(updatedRoutine.tasklist);
      return {
        routine: updatedRoutine,
        balance: await getXpBalance(email),
      };
    },
  },
};

module.exports = { query, mutation, XpBalanceType };
