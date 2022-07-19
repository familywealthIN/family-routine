function updatePeriodDate(goalItem, period, date) {
  return {
    // eslint-disable-next-line no-underscore-dangle
    ...goalItem, period, date, id: goalItem._id,
  };
}

function updateMilestonesEntry(period, milestoneGoals, periodGoalItemList) {
  if (period === 'day') { return; }

  // const spliceList = [];

  milestoneGoals.forEach((milestoneGoal) => {
    const foundGoalItem = periodGoalItemList
      // eslint-disable-next-line no-underscore-dangle
      .find((periodGoalItem) => periodGoalItem._id === milestoneGoal.goalRef);

    if (foundGoalItem) {
      if (!foundGoalItem.milestones) {
        foundGoalItem.milestones = [];
      }
      // eslint-disable-next-line no-underscore-dangle
      if (!foundGoalItem.milestones.find((milestone) => milestone._id === milestoneGoal._id)) {
        foundGoalItem.milestones.push(milestoneGoal);
      }
      // spliceList.push(i);
    }
  });

  // spliceList.forEach((i) => milestoneGoals.splice(i, 1));
}

function getGoalPeriodMilestone(period, goals, milestoneGoals) {
  const periodGoals = goals.filter((goal) => goal.period === period);
  const periodGoalItemList = [];
  periodGoals.forEach((periodGoal) => {
    if (Array.isArray(periodGoal.goalItems) && periodGoal.goalItems.length) {
      periodGoal.goalItems.forEach((periodGoalItem) => {
        if (periodGoalItem.isMilestone) {
          const goalItemToSave = updatePeriodDate(periodGoalItem, period, periodGoal.date);
          milestoneGoals.push(goalItemToSave);
        } else {
          const goalItemToPush = updatePeriodDate(periodGoalItem, period, periodGoal.date);
          periodGoalItemList.push(goalItemToPush);
        }
      });
    }
  });

  updateMilestonesEntry(period, milestoneGoals, periodGoalItemList);
  updateMilestonesEntry(period, milestoneGoals, milestoneGoals);

  return periodGoalItemList;
}

function getGoalMilestone(goals) {
  const milestoneGoals = [];
  const periods = ['day', 'week', 'month', 'year', 'lifetime'];
  const milestonesView = {};

  periods.forEach((period) => {
    milestonesView[period] = getGoalPeriodMilestone(period, goals, milestoneGoals);
  });

  return milestonesView;
}

module.exports = getGoalMilestone;
