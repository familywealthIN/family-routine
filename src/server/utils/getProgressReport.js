/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
const moment = require('moment');

const threshold = {
  weekDays: 5,
  monthWeeks: 3,
  yearMonths: 9,
};

function weekOfMonth(d) {
  const addFirstWeek = moment(d, 'DD-MM-YYYY').startOf('month').weekday() < 2 ? 1 : 0;
  return moment(d, 'DD-MM-YYYY').week() - moment(d, 'DD-MM-YYYY').startOf('month').week() + addFirstWeek;
}

function countTotal(routine, stimulus = 'D') {
  const aggregatePoints = routine.tasklist.reduce((total, num) => {
    const currentStimulus = num.stimuli.find((st) => st.name === stimulus);
    if (currentStimulus && currentStimulus.earned) {
      return total + currentStimulus.earned;
    }
    return total;
  }, 0);

  if (stimulus === 'G') {
    if (moment(routine.date, 'DD-MM-YYYY').weekday() >= (threshold.weekDays - 1)) {
      if (weekOfMonth(routine.date) >= (threshold.monthWeeks - 1)) {
        if (moment(routine.date, 'DD-MM-YYYY').month() >= (threshold.yearMonths - 1)) {
          return aggregatePoints;
        }

        return Number((aggregatePoints * 1.334).toFixed(1));
      }

      return aggregatePoints * 2;
    }

    return aggregatePoints * 4;
  }

  return aggregatePoints;
}

function getScore(routine) {
  const dayScoreTasklist = [];

  function getGScore(realG) {
    if (moment(routine.date, 'DD-MM-YYYY').weekday() >= (threshold.weekDays - 1)) {
      if (weekOfMonth(routine.date) >= (threshold.monthWeeks - 1)) {
        if (moment(routine.date, 'DD-MM-YYYY').month() >= (threshold.yearMonths - 1)) {
          return realG;
        }

        return Number((realG * 1.334).toFixed(1));
      }

      return realG * 2;
    }

    return realG * 4;
  }

  routine.tasklist.forEach((task) => {
    let aggregateD = 0;
    let aggregateK = 0;
    let aggregateG = 0;
    let finalG = 0;
    const StimulusD = task.stimuli.find((st) => st.name === 'D');

    if (StimulusD && StimulusD.earned) {
      aggregateD = StimulusD.earned;
    }

    const StimulusK = task.stimuli.find((st) => st.name === 'K');
    if (StimulusK && StimulusK.earned) {
      aggregateK = StimulusK.earned;
    }

    const StimulusG = task.stimuli.find((st) => st.name === 'G');
    if (StimulusG && StimulusG.earned) {
      aggregateG = StimulusG.earned;
    }

    finalG = getGScore(aggregateG);
    dayScoreTasklist.push({
      id: task._id,
      name: task.name,
      D: aggregateD,
      K: aggregateK,
      G: finalG,
      value: Math.round((aggregateD + aggregateK + finalG) / 3),
    });
  });

  return dayScoreTasklist;
}

function getCompletedTotal({
  routine, goals, periodDailyTasks, stimulus = 'D', period,
}) {
  const getRoutinesTotal = () => routine.tasklist.reduce((total, num) => {
    total.value += num.ticked ? 1 : 0;
    total.total += 1;
    return total;
  }, {
    value: 0,
    total: 0,
  });

  const getTasksTotal = () => {
    const periodDailyTask = periodDailyTasks.find((goal) => goal.date === routine.date);

    console.log('periodDailyTasks', periodDailyTasks);

    const tasksTotal = {
      value: 0,
      total: 0,
    };

    tasksTotal.total = routine.tasklist
      .reduce((acc, task) => {
        const dStimulus = task.stimuli.find((st) => st.name === 'D');
        const kStimulus = task.stimuli.find((st) => st.name === 'K');
        const count = Number((dStimulus.splitRate / kStimulus.splitRate).toFixed(0) || 0);
        return acc + count;
      }, 0);

    if (periodDailyTask && periodDailyTask.goalItems) {
      tasksTotal.value = periodDailyTask.goalItems.reduce((acc, goalItem) => {
        const value = goalItem.isComplete ? 1 : 0;
        return acc + value;
      }, 0);
    }
    return tasksTotal;
  };

  const getMilestonesTotal = () => {
    const periodGoal = goals.find((goal) => goal.period === period);

    if (periodGoal && periodGoal.goalItems) {
      return periodGoal.goalItems.reduce((total, goalItem) => {
        if (goalItem.isMilestone) {
          total.value += goalItem.isComplete ? 1 : 0;
          total.total += 1;
        }
        return total;
      }, {
        value: 0,
        total: 0,
      });
    }

    return {
      value: 0,
      total: 0,
    };
  };

  switch (stimulus) {
    case 'K':
      return getTasksTotal();
    case 'G':
      return getMilestonesTotal();
    default:
      return getRoutinesTotal();
  }

  // if (stimulus === 'G') {
  //   if (moment(routine.date, 'DD-MM-YYYY').weekday() >= (threshold.weekDays - 1)) {
  //     if (weekOfMonth(routine.date) >= (threshold.monthWeeks - 1)) {
  //       if (moment(routine.date, 'DD-MM-YYYY').month() >= (threshold.yearMonths - 1)) {
  //         return aggregatePoints;
  //       }

  //       return Number((aggregatePoints * 1.334).toFixed(1));
  //     }

  //     return aggregatePoints * 2;
  //   }

  //   return aggregatePoints * 4;
  // }

  // return aggregatePoints;
}

function getEfficiency({ periodRoutines }) {
  // TODO: Get the dharma points to determine efficiency
  try {
    const sum = periodRoutines.reduce((acc, routine) => acc + countTotal(routine), 0);
    const { length } = periodRoutines;

    if (!sum && !length) return 0;

    return {
      id: 'efficiency',
      name: 'Routine Efficiency',
      value: `${Math.ceil(sum / length)}%`,
    };
  } catch (e) {
    console.log(e);
    return null;
  }
}

function getStimuli({ periodRoutines }) {
  const initialData = [
    {
      name: 'D',
      value: 0,
    },
    {
      name: 'K',
      value: 0,
    },
    {
      name: 'G',
      value: 0,
    },
  ];

  const { length } = periodRoutines;
  const stimuliTotal = periodRoutines.reduce((acc, routine) => {
    acc[0].value += countTotal(routine);
    acc[1].value += countTotal(routine, 'K');
    acc[2].value += countTotal(routine, 'G');
    return acc;
  }, initialData);

  if (!stimuliTotal && !length) return initialData;

  const stimuliPercentage = [...stimuliTotal];

  stimuliPercentage[0].value = Math.ceil(stimuliTotal[0].value / length);
  stimuliPercentage[1].value = Math.ceil(stimuliTotal[1].value / length);
  stimuliPercentage[2].value = Math.ceil(stimuliTotal[2].value / length);

  // get average of each stimuli value
  return {
    id: 'radar-chart',
    name: 'Radar Chart',
    values: stimuliPercentage,
  };
}

function getOnTrack({
  routines, goals, period, startDate, endDate, periodRoutines, periodGoals,
}) {
  // By date understand which tasks can be accomplished
  return {
    routines, goals, period, startDate, endDate, periodRoutines, periodGoals,
  };
}

function getTaskActivities({
  periodRoutines, goals, periodDailyTasks, period,
}) {
  // Get average total tasks, routineItem and goal streak accomplished
  const initialData = [
    {
      name: 'Routine Items',
      value: 0,
      total: 0,
    },
    {
      name: 'Tasks',
      value: 0,
      total: 0,
    },
    {
      name: 'Milestones',
      value: 0,
      total: 0,
    },
  ];

  function adder(acc, inp) {
    const { value, total } = inp;
    acc.value += value;
    acc.total += total;
  }

  const { length } = periodRoutines;
  const stimuliTotal = periodRoutines.reduce((acc, routine) => {
    const completedD = getCompletedTotal({
      routine, goals, periodDailyTasks, stimulus: 'D', period,
    });
    adder(acc[0], completedD);
    const completedK = getCompletedTotal({
      routine, goals, periodDailyTasks, stimulus: 'K', period,
    });
    adder(acc[1], completedK);
    const completedG = getCompletedTotal({
      routine, goals, periodDailyTasks, stimulus: 'G', period,
    });
    adder(acc[2], completedG);
    return acc;
  }, initialData);

  if (!stimuliTotal && !length) return initialData;

  const stimuliPercentage = [...stimuliTotal];

  stimuliPercentage[0].value = Math.ceil(stimuliTotal[0].value / length);
  stimuliPercentage[0].total = Math.ceil(stimuliTotal[0].total / length);
  stimuliPercentage[1].value = Math.ceil(stimuliTotal[1].value / length);
  stimuliPercentage[1].total = Math.ceil(stimuliTotal[1].total / length);
  stimuliPercentage[2].value = Math.ceil(stimuliTotal[2].value / length);
  stimuliPercentage[2].total = Math.ceil(stimuliTotal[2].total / length);

  // get average of each stimuli value
  return {
    id: 'task-activities',
    name: 'Task and Activities Completed',
    values: stimuliPercentage,
  };
}

function getProgressStatement({ periodRoutines }) {
  try {
    const sum = periodRoutines.reduce((acc, routine) => acc + countTotal(routine), 0);
    const { length } = periodRoutines;

    if (!sum && !length) return 'Stay Calm and focus on what\'s right?';

    const efficiency = Math.ceil(sum / length);

    if (efficiency >= 70) {
      return 'Great Going!';
    }

    if (efficiency >= 40 && efficiency < 70) {
      return 'Live your potential. You got this.';
    }

    return 'Stay Calm and focus on what\'s right?';
  } catch (e) {
    console.log(e);
    return 'Great Going!';
  }
}

function getBestRoutineSorted({
  periodRoutines, cardId, cardName,
}) {
  // Understand each routine points in D, K and G.figure out average,
  // the set percentage score, sort the routines and do best three and worst three

  const fullTasklistScore = [];

  periodRoutines.forEach((routine) => {
    const scoredTasklist = getScore(routine);

    scoredTasklist.forEach((scoredTask) => {
      const currentFullTask = fullTasklistScore
        .find((fullTask) => fullTask.id.toString() === scoredTask.id.toString());
      if (currentFullTask && currentFullTask.id) {
        currentFullTask.value += scoredTask.value;
      } else {
        fullTasklistScore.push(scoredTask);
      }
    });
    return fullTasklistScore;
  }, []);

  console.log('fullTasklistScore', fullTasklistScore);

  fullTasklistScore.sort((a, b) => b.value - a.value);

  const slicedList = cardId === 'good' ? fullTasklistScore.slice(0, 3) : fullTasklistScore.slice(Math.max(fullTasklistScore.length - 3, 0));

  // get average of each stimuli value
  return {
    id: cardId,
    name: cardName,
    values: slicedList,
  };
}

function getRoutinesForPeriod(routines, startDate, endDate) {
  const periodRoutines = routines.map((routine) => {
    const routineDate = moment(routine.date, 'DD-MM-YYYY');
    const startDateM = moment(startDate, 'DD-MM-YYYY');
    const endDateM = moment(endDate, 'DD-MM-YYYY');
    if ((moment(routineDate).isSameOrAfter(startDateM, 'day'))
      && !(moment(routineDate).isAfter(endDateM, 'day'))) {
      return routine;
    }
    return null;
  });

  return (periodRoutines || []).filter((periodRoutine) => periodRoutine);
}

function getDailyTasksForPeriod(dailyTasks, startDate, endDate) {
  const periodDailyTasks = dailyTasks.map((dailyTask) => {
    const dailyTaskDate = moment(dailyTask.date, 'DD-MM-YYYY');
    const startDateM = moment(startDate, 'DD-MM-YYYY');
    const endDateM = moment(endDate, 'DD-MM-YYYY');
    if ((moment(dailyTaskDate).isSameOrAfter(startDateM, 'day'))
      && !(moment(dailyTaskDate).isAfter(endDateM, 'day'))) {
      return dailyTask;
    }
    return null;
  });

  return (periodDailyTasks || [])
    .filter((periodDailyTask) => periodDailyTask && !periodDailyTask.skip);
}

function getPeriodData({
  routines, dailyTasks, startDate, endDate, periodRoutines, periodDailyTasks,
}) {
  if (periodRoutines && periodDailyTasks) {
    return {
      currentPeriodRoutines: periodRoutines,
      currentPeriodDailyTasks: periodDailyTasks,
    };
  }

  const currentPeriodRoutines = getRoutinesForPeriod(routines, startDate, endDate);
  const currentPeriodDailyTasks = getDailyTasksForPeriod(dailyTasks, startDate, endDate);

  return { currentPeriodRoutines, currentPeriodDailyTasks };
}

function getProgressReport({
  routines,
  goals,
  dailyTasks,
  period,
  startDate,
  endDate,
  periodRoutines,
  periodGoals,
  periodDailyTasks,
}) {
  const {
    currentPeriodRoutines,
    currentPeriodDailyTasks,
    // currentPeriodGoals,
  } = getPeriodData({
    routines, goals, dailyTasks, startDate, endDate, periodRoutines, periodDailyTasks,
  });

  const mock = {
    period,
    progressStatement: 'Great Going',
    cards: [
      {
        id: 'radar-chart',
        name: 'Radar Chart',
        values: [
          {
            name: 'Discipline',
            value: 12,
          },
          {
            name: 'Kinetics',
            value: 77,
          },
          {
            name: 'Geniuses',
            value: 44,
          },
        ],
      },
      {
        id: 'efficiency',
        name: 'Routine Efficieny',
        value: '78%',
      },
      {
        id: 'on-track',
        name: 'Goals on Track (Coming Soon)',
        value: '?',
      },
      {
        id: 'task-activities',
        name: 'Task and Activities Completed',
        values: [
          {
            name: 'Routine Items',
            value: 5,
            total: 10,
          },
          {
            name: 'Tasks',
            value: 10,
            total: 12,
          },
          {
            name: 'Milestones',
            value: 8,
            total: 16,
          },
        ],
      },
      {
        id: 'good',
        name: 'Great Going',
        value: 'You have on streak for 5 task',
        values: [
          {
            id: 'taskid1',
            name: 'Discipline',
            value: 5,
          },
          {
            id: 'taskid2',
            name: 'Kinetics',
            value: 10,
          },
          {
            id: 'taskid3',
            name: 'Geniuses',
            value: 8,
          },
          {
            id: 'taskid4',
            name: 'Geniuses',
            value: 8,
          },
        ],
      },
      {
        id: 'bad',
        name: 'Need Attention',
        value: 'No or less activity of 4 items',
        values: [
          {
            id: 'taskid1',
            name: 'Discipline',
            value: 5,
            total: 10,
          },
          {
            id: 'taskid2',
            name: 'Kinetics',
            value: 10,
            total: 12,
          },
          {
            id: 'taskid3',
            name: 'Geniuses',
            value: 8,
            total: 16,
          },
          {
            id: 'taskid4',
            name: 'Geniuses',
            value: 8,
            total: 16,
          },
        ],
      },
    ],
  };

  const progressReport = {
    ...mock,
    progressStatement: getProgressStatement({ periodRoutines: currentPeriodRoutines }),
    cards: mock.cards.map((card) => {
      if (card.id === 'efficiency') {
        return getEfficiency({ periodRoutines: currentPeriodRoutines });
      }

      if (card.id === 'radar-chart') {
        return getStimuli({ periodRoutines: currentPeriodRoutines });
      }

      // if (card.id === 'on-track') {
      //   return getOnTrack({
      //     periodRoutines: currentPeriodRoutines,
      //     periodGoals: currentPeriodGoals,
      //   });
      // }

      if (card.id === 'task-activities') {
        return getTaskActivities({
          periodRoutines: currentPeriodRoutines,
          goals,
          periodDailyTasks: currentPeriodDailyTasks,
          period,
        });
      }

      if (card.id === 'good') {
        return getBestRoutineSorted({
          periodRoutines: currentPeriodRoutines,
          cardId: 'good',
          cardName: 'Great Going!',
        });
      }
      if (card.id === 'bad') {
        return getBestRoutineSorted({
          periodRoutines: currentPeriodRoutines,
          cardId: 'bad',
          cardName: 'Needs Attention!',
        });
      }

      return card;
    }),
  };

  if (mock) {
    return progressReport;
  }

  return {
    routines, goals, period, startDate, endDate, periodGoals, periodRoutines,
  };
}

module.exports = {
  getEfficiency,
  getStimuli,
  getOnTrack,
  getTaskActivities,
  getProgressStatement,
  getPeriodData,
  getProgressReport,
  getBestRoutineSorted,
};
