/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
const {
  GraphQLID,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
} = require('graphql');
const moment = require('moment');

const {
  GoalModel,
  GoalType,
  GoalItemType,
  GoalMilestoneType,
} = require('../schema/GoalSchema');
const { GoalItemInput } = require('../schema/AiSchema');
const { UserModel } = require('../schema/UserSchema');
const getEmailfromSession = require('../utils/getEmailfromSession');
const validateGroupUser = require('../utils/validateGroupUser');
const getGoalMilestone = require('../utils/getGoalMilestone');
const { updateStimulusEarnedPoint, removeStimulusEarnedPoint } = require('../utils/stimulusPoints');
const sortTimes = require('../utils/sortTimes');
const { RoutineItemModel } = require('../schema/RoutineItemSchema');
const { RoutineModel } = require('../schema/RoutineSchema');
const { buildStimuliForRoutineItem } = require('./routine');
const { threshold } = require('../utils/getProgressReport');

const getDaysArray = (year, month) => {
  let firstMonday = '';
  const threeFridays = [];
  const monthIndex = month; // 0..11 instead of 1..12
  const names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const date = new Date(year, monthIndex, 1);
  const result = [];
  while (threeFridays.length <= 2) {
    if (!firstMonday && names[date.getDay()] === 'mon') {
      firstMonday = `${date.getDate()}-${month}-${year}`;
    }

    if (firstMonday && !['sun', 'sat'].includes(names[date.getDay()])) {
      result.push(`${date.getDate()}-${month + 1}-${year}`);
    }

    if (firstMonday && names[date.getDay()] === 'fri' && threeFridays.length <= 2) {
      threeFridays.push(`${date.getDate()}-${month + 1}-${year}`);
    }
    date.setDate(date.getDate() + 1);
  }
  return { result, threeFridays };
};

async function findTodayandSort(args, email) {
  const todaysRoutine = await RoutineModel.findOne({ date: args.date, email }).exec();
  if (todaysRoutine && todaysRoutine.tasklist) {
    sortTimes(todaysRoutine.tasklist);
    return todaysRoutine;
  }
  const tasklist = await RoutineItemModel.find({ email });
  sortTimes(tasklist);
  tasklist.forEach((task) => {
    task.stimuli = buildStimuliForRoutineItem(task._id, tasklist);
  });
  const routine = new RoutineModel({
    ...args,
    email,
    tasklist,
  });

  await routine.save();

  return findTodayandSort(args, email);
}

function periodGoalDates(period, date) {
  if (period === 'week') {
    const weekNo = moment(date, 'DD-MM-YYYY').weeks();
    return moment(date, 'DD-MM-YYYY').weeks(weekNo).weekday(5).format('DD-MM-YYYY');
  }
  if (period === 'month') {
    return moment(date, 'DD-MM-YYYY').endOf('month').format('DD-MM-YYYY');
  }
  if (period === 'year') {
    return moment(date, 'DD-MM-YYYY').endOf('year').format('DD-MM-YYYY');
  }
  return date;
}

function enlistGDays(gRoutineTasks, cleanGoals) {
  const gRoutineTasksMonth = Array.from(gRoutineTasks.values()).filter((gtask) => gtask.period === 'month');

  if (gRoutineTasksMonth.length) {
    const cleanMonthGoals = cleanGoals.filter((goal) => goal.period === 'week');

    gRoutineTasksMonth.forEach((monthTask) => {
      cleanMonthGoals.forEach((goal) => {
        goal.goalItems.forEach((goalItem) => {
          if (monthTask.id === goalItem.goalRef && goalItem.isComplete && goalItem.taskRef) {
            gRoutineTasks.set(`${goal.period}_${monthTask.updatePeriod}_${goal.date}_${goalItem.taskRef}`, {
              id: String(goalItem.id),
              updatePeriod: monthTask.updatePeriod,
              period: goal.period,
              date: goal.date,
              taskRef: goalItem.taskRef,
            });
          }
        });
      });
    });
  }

  const gRoutineTasksWeek = Array.from(gRoutineTasks.values()).filter((gtask) => gtask.period === 'week');

  if (gRoutineTasksMonth.length) {
    const cleanMonthGoals = cleanGoals.filter((goal) => goal.period === 'day');

    gRoutineTasksWeek.forEach((weekTask) => {
      cleanMonthGoals.forEach((goal) => {
        goal.goalItems.forEach((goalItem) => {
          if (weekTask.id === goalItem.goalRef && goalItem.isComplete) {
            gRoutineTasks.set(`${goal.period}_${weekTask.updatePeriod}_${goal.date}_${goalItem.taskRef}`, {
              id: String(goalItem.id),
              updatePeriod: weekTask.updatePeriod,
              period: goal.period,
              date: goal.date,
              taskRef: goalItem.taskRef,
            });
          }
        });
      });
    });
  }

  const toSanitizeGTasks = Array.from(gRoutineTasks.keys());

  toSanitizeGTasks.forEach((gTaskId) => {
    if (!gTaskId.startsWith('day_')) {
      gRoutineTasks.delete(gTaskId);
    }
  });
}

function updateGTasksMap(gRoutineTasks, tempGRoutineTasks) {
  if (gRoutineTasks) {
    tempGRoutineTasks.forEach((tempGRoutineTask) => {
      gRoutineTasks.set(`${tempGRoutineTask.period}_${tempGRoutineTask.updatePeriod}_${tempGRoutineTask.date}_${tempGRoutineTask.taskRef}`, {
        id: tempGRoutineTask.id,
        updatePeriod: tempGRoutineTask.updatePeriod,
        period: tempGRoutineTask.period,
        date: tempGRoutineTask.date,
        taskRef: tempGRoutineTask.taskRef,
      });
    });
  }
}

async function autoCheckTaskPeriod({
  currentPeriod, stepDownPeriod, cleanGoals, completionThreshold, date, email, gRoutineTasks = null,
}) {
  const periodGoals = await GoalModel.find({ period: currentPeriod, date: periodGoalDates(currentPeriod, date), email }).exec();
  // console.log('periodGoals', currentPeriod, periodGoalDates(currentPeriod, date), periodGoals);
  const updatePromises = [];
  periodGoals.forEach((periodGoal) => {
    periodGoal.goalItems.forEach((periodGoalItem) => {
      periodGoalItem.progress = 0;

      const dayCleanGoals = cleanGoals.filter((cleanGoal) => cleanGoal.period === stepDownPeriod);

      if (dayCleanGoals && dayCleanGoals.length) {
        const tempGRoutineTasks = [];
        dayCleanGoals.forEach((dayCleanGoal) => {
          const matchedDayGoal = dayCleanGoal
            .goalItems
            .find((dayGoalItem) => String(periodGoalItem.id) === String(dayGoalItem.goalRef) && dayGoalItem.isComplete);

          if (matchedDayGoal && matchedDayGoal.goalRef) {
            // Addition Logic to threshold
            periodGoalItem.progress += 1;

            tempGRoutineTasks.push({
              id: String(matchedDayGoal.id),
              updatePeriod: currentPeriod,
              period: stepDownPeriod,
              date: dayCleanGoal.date,
              taskRef: matchedDayGoal.taskRef,
            });

            if (periodGoalItem.progress === completionThreshold && !periodGoalItem.isComplete) {
              const cleanGoalsGoalItem = cleanGoals
                .find((cleanGoal) => String(cleanGoal.id) === String(periodGoal.id))
                .goalItems
                .find((cleanGoalItem) => String(cleanGoalItem.id) === String(periodGoalItem.id));

              periodGoalItem.isComplete = true;
              cleanGoalsGoalItem.isComplete = true;

              updatePromises.push(GoalModel.findOneAndUpdate(
                {
                  date: periodGoal.date,
                  period: periodGoal.period,
                  email,
                  'goalItems._id': periodGoalItem.id,
                },
                { $set: { 'goalItems.$.isComplete': true } },
                { new: true },
              ).exec());

              // backtrack all associated task
              updateGTasksMap(gRoutineTasks, tempGRoutineTasks);
            }
          }
        });
      }
    });
  });

  await Promise.all(updatePromises);

  // console.log('periodGoals', periodGoals);
  return periodGoals;
}

function weekOfMonth(d) {
  const addFirstWeek = moment(d, 'DD-MM-YYYY').startOf('month').weekday() < 2 ? 1 : 0;
  return moment(d, 'DD-MM-YYYY').week() - moment(d, 'DD-MM-YYYY').startOf('month').week() + addFirstWeek;
}

async function setUserTag(email, tags) {
  // Filter out empty or null tags
  const validTags = tags.filter((tag) => tag && tag.trim());

  if (validTags.length > 0) {
    try {
      // Use $addToSet to add all tags at once, preventing duplicates
      await UserModel.updateOne(
        { email },
        { $addToSet: { tags: { $each: validTags } } },
      );
    } catch (error) {
      // Handle duplicate key error gracefully
      if (error.code === 11000) {
        console.warn(`Duplicate key error for user ${email} with tags:`, validTags);
        console.warn('This might be due to a unique index on the tags field. Attempting individual tag insertion...');

        // Fallback: try adding tags one by one using Promise.all to avoid for-of loop
        const tagPromises = validTags.map(async (tag) => {
          try {
            await UserModel.updateOne(
              { email },
              { $addToSet: { tags: tag } },
            );
          } catch (individualError) {
            if (individualError.code === 11000) {
              console.warn(`Tag "${tag}" already exists for user ${email}, skipping...`);
            } else {
              console.error(`Error adding tag "${tag}" for user ${email}:`, individualError);
            }
          }
        });

        await Promise.all(tagPromises);
      } else {
        console.error('Error setting user tags:', error);
        throw error;
      }
    }
  }
}

const query = {
  goals: {
    type: GraphQLList(GoalType),
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const goals = await GoalModel.find({ email }).exec();

      return goals.filter((goal) => goal.goalItems.length);
    },
  },
  dailyGoals: {
    type: GraphQLList(GoalType),
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const goals = await GoalModel.find({ email }).exec();

      const cleanGoals = goals.filter((goal) => goal.goalItems && goal.goalItems.length);

      const dayGoals = await GoalModel.find({ period: 'day', date: args.date, email }).exec();

      const weekGoals = await autoCheckTaskPeriod({
        currentPeriod: 'week', stepDownPeriod: 'day', cleanGoals, completionThreshold: threshold.weekDays, date: args.date, email,
      });

      const monthGoals = await autoCheckTaskPeriod({
        currentPeriod: 'month', stepDownPeriod: 'week', cleanGoals, completionThreshold: threshold.monthWeeks, date: args.date, email,
      });

      const yearGoals = await autoCheckTaskPeriod({
        currentPeriod: 'year', stepDownPeriod: 'month', cleanGoals, completionThreshold: threshold.yearMonths, date: args.date, email,
      });

      return [
        ...dayGoals,
        ...weekGoals,
        ...monthGoals,
        ...yearGoals,
      ];
    },
  },
  monthTaskGoals: {
    type: GraphQLList(GoalType),
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
      taskRef: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const month = moment(args.date, 'DD-MM-YYYY').month();
      const year = moment(args.date, 'DD-MM-YYYY').year();
      const { threeFridays } = getDaysArray(year, month);
      const goals = await GoalModel
        .find(
          { email, 'goalItems.taskRef': args.taskRef },
        )
        .exec();
      const getMappedGoals = (gls) => gls && gls.map((goal) => {
        if (goal.goalItems && goal.goalItems.length) {
          goal.goalItems = goal.goalItems.filter((goalItem) => goalItem.taskRef === args.taskRef);
          return goal;
        }
        return null;
      });
      const mappedGoals = getMappedGoals(goals);
      const cleanGoals = mappedGoals.filter((goal) => goal.goalItems && goal.goalItems.length);

      const dayGoals = cleanGoals.filter((gl) => gl.period === 'day' && month === moment(gl.date, 'DD-MM-YYYY').month());

      const weekGoals01 = getMappedGoals(await autoCheckTaskPeriod({
        currentPeriod: 'week', stepDownPeriod: 'day', cleanGoals, completionThreshold: threshold.weekDays, date: threeFridays[0], email,
      }));
      const weekGoals02 = getMappedGoals(await autoCheckTaskPeriod({
        currentPeriod: 'week', stepDownPeriod: 'day', cleanGoals, completionThreshold: threshold.weekDays, date: threeFridays[1], email,
      }));
      const weekGoals03 = getMappedGoals(await autoCheckTaskPeriod({
        currentPeriod: 'week', stepDownPeriod: 'day', cleanGoals, completionThreshold: threshold.weekDays, date: threeFridays[2], email,
      }));

      const monthGoals = getMappedGoals(await autoCheckTaskPeriod({
        currentPeriod: 'month', stepDownPeriod: 'week', cleanGoals, completionThreshold: threshold.monthWeeks, date: args.date, email,
      }));

      // console.log('result', result);
      // console.log('week goals', cleanGoals.filter((gl) => gl.period === 'week'));
      // console.log('threeFridays', threeFridays);

      return [
        // ...cleanGoals,
        ...dayGoals,
        ...weekGoals01,
        ...weekGoals02,
        ...weekGoals03,
        ...monthGoals,
      ];
    },
  },
  agendaGoals: {
    type: GraphQLList(GoalType),
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const goals = await GoalModel.find({ email }).exec();

      const cleanGoals = goals.filter((goal) => goal.goalItems && goal.goalItems.length);

      const dayGoals = await GoalModel.find({ period: 'day', date: args.date, email }).exec();

      const weekGoals = await autoCheckTaskPeriod({
        currentPeriod: 'week', stepDownPeriod: 'day', cleanGoals, completionThreshold: threshold.weekDays, date: args.date, email,
      });

      const monthGoals = await autoCheckTaskPeriod({
        currentPeriod: 'month', stepDownPeriod: 'week', cleanGoals, completionThreshold: threshold.monthWeeks, date: args.date, email,
      });

      const yearGoals = await autoCheckTaskPeriod({
        currentPeriod: 'year', stepDownPeriod: 'month', cleanGoals, completionThreshold: threshold.yearMonths, date: args.date, email,
      });

      const lifetimeGoals = await GoalModel.find({ period: 'lifetime', email }).exec();

      return [
        ...dayGoals,
        ...weekGoals,
        ...monthGoals,
        ...yearGoals,
        ...lifetimeGoals,
      ];
    },
  },
  goalMilestones: {
    type: GoalMilestoneType,
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const goals = await GoalModel.find({ email }).exec();
      const jsonGoals = JSON.stringify(goals, null, 2);

      return getGoalMilestone(JSON.parse(jsonGoals));
    },
  },
  goalsByGroupEmail: {
    type: GraphQLList(GoalType),
    args: {
      email: { type: GraphQLNonNull(GraphQLString) },
      groupId: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      await validateGroupUser(UserModel, email, args.groupId);
      await validateGroupUser(UserModel, args.email, args.groupId);

      return GoalModel
        .find({ email: args.email })
        .sort({ date: -1 })
        .limit(7)
        .exec();
    },
  },
  goalsByTag: {
    type: new GraphQLList(GoalType),
    args: {
      tag: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const goals = await GoalModel.find({
        email,
        'goalItems.tags': args.tag,
      }).exec();

      // Filter the goals to only include goalItems that match the tag
      const filteredGoals = goals.map((goal) => ({
        ...goal.toObject(),
        goalItems: goal.goalItems.filter((item) => item.tags && item.tags.includes(args.tag)),
      })).filter((goal) => goal.goalItems.length > 0); // Only return goals that have matching items

      return filteredGoals;
    },
  },
  goalsByGoalRef: {
    type: new GraphQLList(GoalType),
    args: {
      goalRef: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const goals = await GoalModel.find({
        email,
        'goalItems.goalRef': args.goalRef,
      }).exec();

      // Filter the goals to only include goalItems that match the goalRef
      const filteredGoals = goals.map((goal) => ({
        ...goal.toObject(),
        goalItems: goal.goalItems.filter((item) => item.goalRef === args.goalRef),
      })).filter((goal) => goal.goalItems.length > 0);

      return filteredGoals;
    },
  },
  goal: {
    type: GoalType,
    args: {
      id: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: (root, args, context) => {
      const email = getEmailfromSession(context);

      return GoalModel.findOne({ id: args.id, email }).exec();
    },
  },
  goalItem: {
    type: GoalItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const goal = await GoalModel.findOne(
        {
          date: args.date,
          period: args.period,
          email,
          'goalItems._id': args.id,
        },
        { 'goalItems.$': 1 },
      ).exec();

      return goal.goalItems[0];
    },
  },
  goalItemById: {
    type: GoalItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const goal = await GoalModel.findOne(
        {
          email,
          'goalItems._id': args.id,
        },
        { 'goalItems.$': 1 },
      ).exec();

      if (!goal || !goal.goalItems || goal.goalItems.length === 0) {
        throw new Error('Goal item not found');
      }

      return goal.goalItems[0];
    },
  },
  goalDatePeriod: {
    type: GoalType,
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      return GoalModel.findOne({ date: args.date, period: args.period || 'day', email }).exec();
    },
  },
  currentYearGoals: {
    type: new GraphQLList(GoalType),
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const currentYear = moment().year();

      const goals = await GoalModel.find({
        email,
        period: 'year',
        date: {
          $regex: new RegExp(`-${currentYear}$`),
        },
      }).exec();

      return goals.filter((goal) => goal.goalItems && goal.goalItems.length);
    },
  },
};

const mutation = {
  addBulkGoalItems: {
    type: GraphQLList(GoalItemType),
    args: {
      goals: { type: GraphQLNonNull(GraphQLList(GoalItemInput)) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const { goals } = args;

      try {
        // Set user tags for all goals
        const allTags = goals.reduce((acc, goal) => [...acc, ...(goal.tags || [])], []);
        await setUserTag(email, allTags);

        // Process each goal item
        const goalPromises = goals.map(async (goalInput) => {
          const {
            date,
            period,
            body,
            deadline,
            contribution,
            reward,
            isComplete,
            isMilestone,
            taskRef,
            goalRef,
            tags = [],
            status,
            originalDate,
          } = goalInput;

          // Determine initial status if not provided
          let finalStatus = status || 'todo';
          if (period === 'day') {
            if (originalDate && originalDate !== date) {
              finalStatus = 'rescheduled';
            } else if (!status) {
              finalStatus = 'todo';
            }
          }

          const goalItemToAdd = {
            body,
            deadline,
            contribution,
            reward,
            isComplete,
            isMilestone,
            taskRef,
            goalRef,
            tags,
            status: finalStatus,
            createdAt: new Date(),
            originalDate,
          };

          // Add completedAt if the task is being created as complete
          if (isComplete) {
            goalItemToAdd.completedAt = new Date();
            goalItemToAdd.status = 'done';
          }

          const goalToAdd = {
            date,
            email,
            period,
            goalItems: [goalItemToAdd],
          };

          const goalEntry = await GoalModel.findOne({ date, period: period || 'day', email }).exec();

          if (goalEntry && goalEntry.date) {
            await GoalModel.findOneAndUpdate(
              { email, date, period },
              { $set: { goalItems: [...goalEntry.goalItems, goalToAdd.goalItems[0]] } },
              { new: true },
            ).exec();
          } else {
            const goal = new GoalModel(goalToAdd);
            await goal.save();
          }

          const updatedGoal = await GoalModel.findOne({
            date,
            period,
            email,
          }).exec();

          return updatedGoal.goalItems[updatedGoal.goalItems.length - 1];
        });

        const createdGoals = await Promise.all(goalPromises);
        return createdGoals;
      } catch (error) {
        console.error('Bulk goal creation error:', error);
        throw new Error('Failed to create bulk goals');
      }
    },
  },
  addGoalItem: {
    type: GoalItemType,
    args: {
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
      body: { type: GraphQLString },
      deadline: { type: GraphQLString },
      contribution: { type: GraphQLString },
      reward: { type: GraphQLString },
      isComplete: { type: GraphQLBoolean },
      isMilestone: { type: GraphQLBoolean },
      taskRef: { type: GraphQLString },
      goalRef: { type: GraphQLString },
      tags: { type: GraphQLList(GraphQLString) },
      originalDate: { type: GraphQLString },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        date,
        period,
        body,
        deadline,
        contribution,
        reward,
        isComplete,
        isMilestone,
        taskRef,
        goalRef,
        tags = [],
        originalDate,
      } = args;

      // Validation: if goalRef is passed, isMilestone must be true
      if (goalRef && !isMilestone) {
        throw new Error('When goalRef is provided, isMilestone must be true');
      }

      await setUserTag(email, tags);

      // Determine initial status based on task context
      let status = 'todo'; // default status

      if (period === 'day') {
        // For day tasks, calculate status based on context
        if (originalDate && originalDate !== date) {
          status = 'rescheduled';
        } else {
          // For now, we'll set a basic status. The frontend will handle more complex logic
          // with current task context. We can enhance this later with task timing logic.
          status = 'todo';
        }
      }

      const goalItemToAdd = {
        body,
        deadline,
        contribution,
        reward,
        isComplete,
        isMilestone,
        taskRef,
        goalRef,
        tags,
        status,
        createdAt: new Date(),
        originalDate,
      };

      // Add completedAt if the task is being created as complete
      if (isComplete) {
        goalItemToAdd.completedAt = new Date();
        goalItemToAdd.status = 'done';
      }

      const goalToAdd = {
        date,
        email,
        period,
        goalItems: [goalItemToAdd],
      };

      const goalEntry = await GoalModel.findOne({ date: args.date, period: args.period || 'day', email }).exec();

      if (goalEntry && goalEntry.date) {
        await GoalModel.findOneAndUpdate(
          { email, date: args.date, period: args.period },
          { $set: { goalItems: [...goalEntry.goalItems, goalToAdd.goalItems[0]] } },
          { new: true },
        ).exec();
      } else {
        const goal = new GoalModel(goalToAdd);
        await goal.save();
      }

      const goal = await GoalModel.findOne(
        {
          date: args.date,
          period: args.period,
          email,
        },
      ).exec();

      return goal.goalItems[goal.goalItems.length - 1];
    },
  },
  bulkAddGoalItems: {
    type: new GraphQLList(GoalItemType),
    args: {
      goalItems: {
        type: new GraphQLNonNull(new GraphQLList(GoalItemInput)),
      },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const { goalItems } = args;

      // Process goal items in parallel using Promise.all
      const addedGoalItems = await Promise.all(
        goalItems.map(async (goalItemData) => {
          const {
            date,
            period,
            body,
            deadline,
            contribution,
            reward,
            isComplete,
            isMilestone,
            taskRef,
            goalRef,
            tags = [],
          } = goalItemData;

          // Validation: if goalRef is passed, isMilestone must be true
          if (goalRef && !isMilestone) {
            throw new Error(`When goalRef is provided, isMilestone must be true for item: ${body || 'Unknown'}`);
          }

          await setUserTag(email, tags);

          const goalToAdd = {
            date,
            email,
            period,
            goalItems: [
              {
                body,
                deadline,
                contribution,
                reward,
                isComplete,
                isMilestone,
                taskRef,
                goalRef,
                tags,
              },
            ],
          };

          const goalEntry = await GoalModel.findOne({
            date,
            period: period || 'day',
            email,
          }).exec();

          if (goalEntry && goalEntry.date) {
            await GoalModel.findOneAndUpdate(
              { email, date, period },
              { $set: { goalItems: [...goalEntry.goalItems, goalToAdd.goalItems[0]] } },
              { new: true },
            ).exec();
          } else {
            const goal = new GoalModel(goalToAdd);
            await goal.save();
          }

          const updatedGoal = await GoalModel.findOne({
            date,
            period,
            email,
          }).exec();

          return updatedGoal.goalItems[updatedGoal.goalItems.length - 1];
        }),
      );

      return addedGoalItems;
    },
  },
  updateGoalItem: {
    type: GoalItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
      body: { type: GraphQLString },
      deadline: { type: GraphQLString },
      contribution: { type: GraphQLString },
      reward: { type: GraphQLString },
      isMilestone: { type: GraphQLBoolean },
      taskRef: { type: GraphQLString },
      goalRef: { type: GraphQLString },
      tags: { type: GraphQLList(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        id,
        date,
        period,
        body,
        deadline,
        contribution,
        reward,
        isMilestone,
        taskRef,
        goalRef,
        tags = [],
      } = args;

      await setUserTag(email, tags);

      await GoalModel.findOneAndUpdate(
        {
          date,
          period,
          email,
          'goalItems._id': id,
        },
        {
          $set: {
            'goalItems.$.body': body,
            'goalItems.$.deadline': deadline,
            'goalItems.$.contribution': contribution,
            'goalItems.$.reward': reward,
            'goalItems.$.isMilestone': isMilestone,
            'goalItems.$.taskRef': taskRef,
            'goalItems.$.goalRef': goalRef,
            'goalItems.$.tags': tags,
          },
        },
        { new: true },
      ).exec();

      const goal = await GoalModel.findOne(
        {
          date: args.date,
          period: args.period,
          email,
        },
      ).exec();

      return goal.goalItems.find((aGoalItem) => aGoalItem.id === id);
    },
  },
  updateGoalItemContribution: {
    type: GoalItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      contribution: { type: GraphQLString },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);
      const { id, contribution } = args;

      await GoalModel.findOneAndUpdate(
        {
          email,
          'goalItems._id': id,
        },
        {
          $set: {
            'goalItems.$.contribution': contribution,
          },
        },
        { new: true },
      ).exec();

      const goal = await GoalModel.findOne({
        email,
        'goalItems._id': id,
      }).exec();

      return goal.goalItems.find((aGoalItem) => aGoalItem.id === id);
    },
  },
  deleteGoal: {
    type: GoalType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      return GoalModel.findOneAndRemove({ _id: args.id, email }).exec();
    },
  },
  deleteGoalItem: {
    type: GoalItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      await GoalModel.findOneAndUpdate(
        {
          date: args.date,
          period: args.period,
          email,
        },
        { $pull: { goalItems: { _id: args.id } } },
      ).exec();
      return args;
    },
  },
  completeGoalItem: {
    type: GoalItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      taskRef: { type: GraphQLNonNull(GraphQLString) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
      isComplete: { type: GraphQLNonNull(GraphQLBoolean) },
      isMilestone: { type: GraphQLNonNull(GraphQLBoolean) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      if (args.period === 'day') {
        const routine = await findTodayandSort(args, email);
        // eslint-disable-next-line no-underscore-dangle
        const task = routine.tasklist.find((t) => t._id.toString() === args.taskRef.toString());
        if (args.isComplete && args.period === 'day') {
          task.stimuli = updateStimulusEarnedPoint('K', task);
          if (args.isMilestone) {
            task.stimuli = updateStimulusEarnedPoint('G', task, args.period);
          }
        } else {
          task.stimuli = removeStimulusEarnedPoint('K', task);
        }

        await RoutineModel.findOneAndUpdate(
          { date: args.date, email, 'tasklist._id': args.taskRef },
          { $set: { 'tasklist.$.stimuli': task.stimuli } },
          { new: true },
        ).exec();
      }

      // Prepare the update object
      const updateFields = {
        'goalItems.$.isComplete': args.isComplete,
      };

      // Add status and timestamp updates for day period tasks
      if (args.period === 'day') {
        if (args.isComplete) {
          updateFields['goalItems.$.completedAt'] = new Date();
          updateFields['goalItems.$.status'] = 'done'; // Will be refined by frontend with task timing logic
        } else {
          updateFields['goalItems.$.completedAt'] = null;
          updateFields['goalItems.$.status'] = 'todo'; // Reset to default when unchecked
        }
      }

      await GoalModel.findOneAndUpdate(
        {
          date: args.date,
          period: args.period,
          email,
          'goalItems._id': args.id,
        },
        { $set: updateFields },
        { new: true },
      ).exec();

      if (args.isComplete && moment(args.date, 'DD-MM-YYYY').weekday() >= (threshold.weekDays - 1)) {
        const goals = await GoalModel.find({ email }).exec();

        const cleanGoals = goals.filter((goal) => goal.goalItems && goal.goalItems.length);
        const gRoutineTasks = new Map();
        gRoutineTasks.set(`day_week_${args.date}_${args.taskRef}`, {
          id: args.id,
          updatePeriod: 'week',
          period: args.period,
          date: args.date,
          taskRef: args.taskRef,
        });
        // console.log('Work on my week', email);

        await autoCheckTaskPeriod({
          currentPeriod: 'week',
          stepDownPeriod: 'day',
          cleanGoals,
          completionThreshold: threshold.weekDays,
          date: args.date,
          email,
          gRoutineTasks,
        });

        if (weekOfMonth(args.date) >= (threshold.monthWeeks - 1)) {
          // console.log('Work on my month', email);
          await autoCheckTaskPeriod({
            currentPeriod: 'month',
            stepDownPeriod: 'week',
            cleanGoals,
            completionThreshold: threshold.monthWeeks,
            date: args.date,
            email,
            gRoutineTasks,
          });
          if (moment(args.date, 'DD-MM-YYYY').month() >= (threshold.yearMonths - 1)) {
            // console.log('Work on my year', email);
            await autoCheckTaskPeriod({
              currentPeriod: 'year',
              stepDownPeriod: 'month',
              cleanGoals,
              completionThreshold: threshold.yearMonths,
              date: args.date,
              email,
              gRoutineTasks,
            });
          }
        }

        enlistGDays(gRoutineTasks, cleanGoals);

        if (args.period === 'day') {
          Array.from(gRoutineTasks.values()).forEach(async (gTask) => {
            const currentDate = await RoutineModel.findOne({ date: gTask.date, email }).exec();
            const task = currentDate.tasklist.find((t) => t._id.toString() === gTask.taskRef.toString());
            task.stimuli = updateStimulusEarnedPoint('G', task, gTask.updatePeriod);
            await RoutineModel.findOneAndUpdate(
              { date: gTask.date, email, 'tasklist._id': gTask.taskRef },
              { $set: { 'tasklist.$.stimuli': task.stimuli } },
              { new: true },
            ).exec();
          });
        }
      }
      return args;
    },
  },
  autosaveGoalContribution: {
    type: GoalItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      date: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
      contribution: { type: GraphQLString },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        id,
        date,
        period,
        contribution,
      } = args;

      // Update only the contribution field for performance
      await GoalModel.findOneAndUpdate(
        {
          date,
          period,
          email,
          'goalItems._id': id,
        },
        {
          $set: {
            'goalItems.$.contribution': contribution,
          },
        },
        { new: true },
      ).exec();

      const goal = await GoalModel.findOne(
        {
          date: args.date,
          period: args.period,
          email,
        },
      ).exec();

      return goal.goalItems.find((aGoalItem) => aGoalItem.id === id);
    },
  },
  rescheduleGoalItem: {
    type: GoalItemType,
    args: {
      id: { type: GraphQLNonNull(GraphQLID) },
      oldDate: { type: GraphQLNonNull(GraphQLString) },
      newDate: { type: GraphQLNonNull(GraphQLString) },
      period: { type: GraphQLNonNull(GraphQLString) },
    },
    resolve: async (root, args, context) => {
      const email = getEmailfromSession(context);

      const {
        id,
        oldDate,
        newDate,
        period,
      } = args;

      // First, get the goal item from the old date
      const oldGoal = await GoalModel.findOne({
        date: oldDate,
        period,
        email,
        'goalItems._id': id,
      }).exec();

      if (!oldGoal) {
        throw new Error('Goal item not found');
      }

      const goalItem = oldGoal.goalItems.find((item) => item._id.toString() === id.toString());

      if (!goalItem) {
        throw new Error('Goal item not found in old goal');
      }

      // Set the original date if not already set (for tracking first reschedule)
      const originalDate = goalItem.originalDate || oldDate;

      // Create a new goal item for the new date with rescheduled status
      const rescheduledGoalItem = {
        ...goalItem.toObject(),
        status: 'rescheduled',
        originalDate,
      };

      // Remove _id so MongoDB can generate a new one
      delete rescheduledGoalItem._id;

      // Check if goal exists for new date
      const newGoal = await GoalModel.findOne({
        date: newDate,
        period,
        email,
      }).exec();

      if (newGoal) {
        // Add to existing goal
        await GoalModel.findOneAndUpdate(
          { date: newDate, period, email },
          { $push: { goalItems: rescheduledGoalItem } },
          { new: true },
        ).exec();
      } else {
        // Create new goal
        const newGoalDocument = new GoalModel({
          date: newDate,
          email,
          period,
          goalItems: [rescheduledGoalItem],
        });
        await newGoalDocument.save();
      }

      // Remove from old goal
      await GoalModel.findOneAndUpdate(
        { date: oldDate, period, email },
        { $pull: { goalItems: { _id: id } } },
        { new: true },
      ).exec();

      // Return the newly created goal item
      const updatedNewGoal = await GoalModel.findOne({
        date: newDate,
        period,
        email,
      }).exec();

      return updatedNewGoal.goalItems[updatedNewGoal.goalItems.length - 1];
    },
  },
};

module.exports = { query, mutation, autoCheckTaskPeriod };
