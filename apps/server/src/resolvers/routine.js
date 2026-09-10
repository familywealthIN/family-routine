/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
} = require('graphql');
const moment = require('moment');

const { RoutineModel, RoutineType } = require('../schema/RoutineSchema');
const { RoutineItemModel } = require('../schema/RoutineItemSchema');
const { UserModel } = require('../schema/UserSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
const validateGroupUser = require('../utils/validateGroupUser');
const sortTimes = require('../utils/sortTimes');
const { updateStimulusEarnedPoint } = require('../utils/stimulusPoints');

async function findTodayandSort(args, email) {
  const todaysRoutine = await RoutineModel.findOne({ date: args.date, email }).exec();
  if (todaysRoutine && todaysRoutine.tasklist) {
    sortTimes(todaysRoutine.tasklist);
    return todaysRoutine;
  }
  return null;
}

async function findIdandSort(args, email) {
  const todaysRoutine = await RoutineModel.findOne({ _id: args.id, email }).exec();
  if (todaysRoutine && todaysRoutine.tasklist) {
    sortTimes(todaysRoutine.tasklist);
    return todaysRoutine;
  }
  return null;
}

async function getSkipDayCount(email) {
  const weekNo = moment().weeks();
  const currentDayIndex = moment().weeks(weekNo).weekday();
  let i = 0;
  const promises = [];
  while (i <= currentDayIndex) {
    const currentDate = moment().weeks(weekNo).weekday(i).format('DD-MM-YYYY');
    promises.push(RoutineModel.findOne({ date: currentDate, email }).exec());
    i += 1;
  }
  const selectedRoutines = await Promise.all(promises);

  const skipDayCount = selectedRoutines.reduce((acc, selectedItem) => {
    if ((selectedItem && selectedItem.skip) || selectedItem === null) {
      return acc + 1;
    }
    return acc;
  }, 0);

  return skipDayCount;
}

/**
 * Hours between a routine item and the next one, as a real number.
 *
 * This feeds D.splitRate, and `D.splitRate / K.splitRate` (K is always 2, i.e.
 * "one task per two hours") is the number of day goal-items the task needs
 * before its counter reads full. So an error here silently changes how many
 * goals a task demands.
 *
 * It used to subtract only the hour field — `'06:40'` and `'09:00'` became
 * 9 - 6 = 3 — which rounded a 2h20m gap up to 3h. That gave `round(3/2) = 2`
 * slots for a task the user had given one goal, so the card sat on "1/2"
 * forever and the agent end event (which waits for completed >= total) could
 * never fire. Minutes are counted now: 2.33h -> `round(1.17) = 1`.
 */
function timeDiff(time, nextTime) {
  const toMinutes = (value) => {
    const [hour, minute] = String(value).split(':');
    return (Number(hour) * 60) + (Number(minute) || 0);
  };

  // Rounded to 2dp so the stored value stays readable rather than 2.3333333333333335.
  const taskTime = Number(((toMinutes(nextTime) - toMinutes(time)) / 60).toFixed(2));

  return taskTime > 2 ? taskTime : 2;
}

function buildStimuliForRoutineItem(taskId, tasklist) {
  const taskIndex = tasklist.findIndex((task) => task._id.toString() === taskId.toString());

  const { time } = tasklist[taskIndex];
  const nextTime = tasklist[taskIndex + 1] ? tasklist[taskIndex + 1].time : '24:00';

  return [
    {
      name: 'D',
      splitRate: timeDiff(time, nextTime), // maximum time is rotation of the planet i.e. 24 hours
      earned: 0,
    },
    {
      name: 'K',
      splitRate: 2, // 1 task in 2 hours
      earned: 0,
    },
    {
      name: 'G',
      splitRate: 4, // 4 divided in day, week, month and year. the value not used
      earned: 0,
    },
  ];
}

// Threshold constants for G stimulus scaling
const stimuliThreshold = {
  weekDays: 5,
  monthWeeks: 3,
  yearMonths: 6,
};

function stimuliWeekOfMonth(d) {
  const addFirstWeek = moment(d, 'DD-MM-YYYY').startOf('month').weekday() < 2 ? 1 : 0;
  return moment(d, 'DD-MM-YYYY').week() - moment(d, 'DD-MM-YYYY').startOf('month').week() + addFirstWeek;
}

/**
 * Aggregate stimulus totals for a routine's tasklist
 * Uses the same formula as the frontend countTotal / server getProgressReport countTotal
 *
 * Redeemed ticks count like normal ticks: redeeming spends settled points and
 * the tick then earns stimulus points that stay pending until the next day's
 * settlement — the overnight rule is what prevents same-day loops.
 */
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
      if (moment(dateStr, 'DD-MM-YYYY').weekday() >= stimuliThreshold.weekDays - 1) {
        if (stimuliWeekOfMonth(dateStr) >= stimuliThreshold.monthWeeks - 1) {
          if (moment(dateStr, 'DD-MM-YYYY').month() >= stimuliThreshold.yearMonths - 1) {
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

const DayStimuliType = new GraphQLObjectType({
  name: 'DayStimuli',
  fields: {
    date: { type: GraphQLString },
    D: { type: GraphQLFloat },
    K: { type: GraphQLFloat },
    G: { type: GraphQLFloat },
  },
});

const query = {
  routines: {
    type: GraphQLList(RoutineType),
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const routines = await RoutineModel.find({
        email,
        skip: { $ne: true },
      }).exec();

      routines.forEach((routine) => sortTimes(routine.tasklist));

      return routines;
    },
  },
  routinesByGroupEmail: {
    type: GraphQLList(RoutineType),
    args: {
      email: { type: GraphQLNonNull(GraphQLString) },
      groupId: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      await validateGroupUser(UserModel, email, args.groupId);
      await validateGroupUser(UserModel, args.email, args.groupId);

      const routines = await RoutineModel
        .find({ email: args.email, skip: { $ne: true } })
        .sort({ $natural: -1 })
        .limit(7)
        .exec();

      routines.forEach((routine) => sortTimes(routine.tasklist));

      return routines;
    },
  },
  routineSevenDays: {
    type: GraphQLList(RoutineType),
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const routines = await RoutineModel
        .find({ email, skip: { $ne: true } })
        .sort({ $natural: -1 })
        .limit(7)
        .exec();

      routines.forEach((routine) => sortTimes(routine.tasklist));

      return routines;
    },
  },
  routine: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineModel.findOne({ id: args.id, email }).exec();
    },
  },
  routineDate: {
    type: RoutineType,
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const todayTasks = await RoutineModel
        .findOne({ date: args.date, email }).exec();

      const tasklist = await RoutineItemModel.find({ email }).exec();

      if (todayTasks && todayTasks.tasklist && Array.isArray(todayTasks.tasklist)) {
        const todayTasklist = todayTasks.tasklist;

        sortTimes(tasklist);

        tasklist.forEach((task) => {
          const foundTask = todayTasklist
            // eslint-disable-next-line no-underscore-dangle
            .find((oldTask) => oldTask._id.toString() === task._id.toString());

          if (foundTask) {
            task.passed = foundTask.passed;
            task.wait = foundTask.wait;
            task.ticked = foundTask.ticked;
            task.redeemed = foundTask.redeemed;
            task.passedPoints = foundTask.passedPoints;
            // splitRate is a property of the schedule, not of the day: it is
            // recomputed from the current times on every read, while `earned`
            // (the only part the day owns) is carried over. Without this, every
            // routine document written before the timeDiff fix would keep its
            // stale hour-only splitRate forever and still demand the wrong
            // number of goals — so this heals old days instead of needing a
            // migration.
            const fresh = buildStimuliForRoutineItem(task._id, tasklist);
            task.stimuli = foundTask.stimuli && foundTask.stimuli.length
              ? fresh.map((stimulus) => {
                const previous = foundTask.stimuli.find((st) => st.name === stimulus.name);
                return previous
                  ? { ...stimulus, earned: previous.earned }
                  : stimulus;
              })
              : fresh;
          } else {
            task.stimuli = buildStimuliForRoutineItem(task._id, tasklist);
          }
        });

        await RoutineModel.findOneAndUpdate(
          { email, date: args.date },
          { $set: { tasklist } },
          { new: true },
        ).exec();
      }

      return findTodayandSort(args, email);
    },
  },
  weekStimuli: {
    type: GraphQLList(DayStimuliType),
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      // Calculate all 7 dates in the week containing the given date
      const weekStart = moment(args.date, 'DD-MM-YYYY').startOf('week');
      const weekDates = [];
      for (let i = 0; i < 7; i += 1) {
        weekDates.push(weekStart.clone().add(i, 'days').format('DD-MM-YYYY'));
      }

      // Fetch all routines for the week in a single query
      const routines = await RoutineModel.find({
        email,
        date: { $in: weekDates },
      }).exec();

      // Build a map of date -> routine for quick lookup.
      // When duplicate documents exist for the same date (can happen due to race
      // conditions in addRoutine), keep the one with the highest total earned
      // points so stale zero-valued duplicates don't shadow real data.
      const routineMap = {};
      routines.forEach((routine) => {
        const dateStr = routine.date;
        if (!routineMap[dateStr]) {
          routineMap[dateStr] = routine;
        } else {
          const existing = aggregateStimuliForRoutine(routineMap[dateStr]);
          const current = aggregateStimuliForRoutine(routine);
          if (current.D + current.K + current.G > existing.D + existing.K + existing.G) {
            routineMap[dateStr] = routine;
          }
        }
      });

      // Return stimulus totals for each day of the week
      return weekDates.map((dateStr) => {
        const routine = routineMap[dateStr];
        const stimuli = aggregateStimuliForRoutine(routine);
        return {
          date: dateStr,
          D: stimuli.D,
          K: stimuli.K,
          G: stimuli.G,
        };
      });
    },
  },
};

const mutation = {
  addRoutine: {
    type: RoutineType,
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const hasEntry = await RoutineModel
        .findOne({ date: args.date, email }).exec();

      if (hasEntry && hasEntry.tasklist && Array.isArray(hasEntry.tasklist)) {
        return findTodayandSort(args, email);
      }

      const tasklist = await RoutineItemModel.find({ email });
      sortTimes(tasklist);
      tasklist.forEach((task) => {
        task.stimuli = buildStimuliForRoutineItem(task._id, tasklist);
      });

      // Use atomic upsert to prevent race-condition duplicate documents
      // when addRoutine is called concurrently (e.g. from handleDayChange
      // and the routineDate Apollo update callback simultaneously).
      await RoutineModel.findOneAndUpdate(
        { date: args.date, email },
        { $setOnInsert: { date: args.date, email, tasklist } },
        { upsert: true },
      ).exec();

      return findTodayandSort(args, email);
    },
  },
  deleteRoutine: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineModel.findOneAndRemove({ _id: args.id, email }).exec();
    },
  },
  tickRoutineItem: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      taskId: { type: GraphQLNonNull(GraphQLString) },
      ticked: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const routine = await findIdandSort(args, email);
      const task = routine.tasklist.find((t) => t._id.toString() === args.taskId.toString());
      if (!task || task.ticked || task.redeemed) {
        return routine;
      }
      task.stimuli = updateStimulusEarnedPoint('D', task);

      return RoutineModel.findOneAndUpdate(
        { _id: args.id, email, 'tasklist._id': args.taskId },
        { $set: { 'tasklist.$.ticked': args.ticked, 'tasklist.$.stimuli': task.stimuli } },
        { new: true },
      ).exec();
    },
  },
  skipRoutine: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      skip: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const skipDays = await getSkipDayCount(email);
      if (skipDays >= 2 && args.skip) {
        throw new Error('You have already skip 2 days this week.');
      }

      return RoutineModel.findOneAndUpdate(
        { _id: args.id, email },
        { skip: args.skip },
        { new: true },
      ).exec();
    },
  },
  passRoutineItem: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      taskId: { type: GraphQLNonNull(GraphQLString) },
      ticked: { type: GraphQLNonNull(GraphQLBoolean) },
      passed: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const routine = await RoutineModel
        .findOne({ _id: args.id, email }).exec();
      const taskToUpdate = routine.tasklist.find((task) => task.id === args.taskId);
      if (args.ticked || (taskToUpdate && taskToUpdate.ticked)) {
        return routine;
      }

      // Freeze the redemption price at the moment the task passes so later
      // edits to the task cannot change what a redeem costs.
      const set = { 'tasklist.$.passed': args.passed };
      if (args.passed && taskToUpdate && typeof taskToUpdate.points === 'number') {
        set['tasklist.$.passedPoints'] = taskToUpdate.points;
      }

      return RoutineModel.findOneAndUpdate(
        { _id: args.id, email, 'tasklist._id': args.taskId },
        { $set: set },
        { new: true },
      ).exec();
    },
  },
  waitRoutineItem: {
    type: RoutineType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      taskId: { type: GraphQLNonNull(GraphQLString) },
      wait: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return RoutineModel.findOneAndUpdate(
        { _id: args.id, email, 'tasklist._id': args.taskId },
        { $set: { 'tasklist.$.wait': args.wait } },
        { new: true },
      ).exec();
    },
  },
};

module.exports = {
  query, mutation, buildStimuliForRoutineItem, aggregateStimuliForRoutine,
};
