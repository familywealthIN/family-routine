function updatePeriodDate(goalItem, period, date) {
  return {
    // eslint-disable-next-line no-underscore-dangle
    ...goalItem, period, date, id: goalItem._id,
  };
}

function updateMilestonesEntry(period, milestoneGoals, periodGoalItemList, attachedIds) {
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
      // eslint-disable-next-line no-underscore-dangle
      attachedIds.add(milestoneGoal._id);
      // spliceList.push(i);
    }
  });

  // spliceList.forEach((i) => milestoneGoals.splice(i, 1));
}

function getGoalPeriodMilestone(period, goals, milestoneGoals, attachedIds) {
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

  updateMilestonesEntry(period, milestoneGoals, periodGoalItemList, attachedIds);
  updateMilestonesEntry(period, milestoneGoals, milestoneGoals, attachedIds);

  return periodGoalItemList;
}

function getGoalMilestone(goals) {
  const milestoneGoals = [];
  const attachedIds = new Set();
  const periods = ['day', 'week', 'month', 'year', 'lifetime'];
  const milestonesView = {};

  periods.forEach((period) => {
    milestonesView[period] = getGoalPeriodMilestone(period, goals, milestoneGoals, attachedIds);
  });

  // A milestone is only ever rendered under the parent it was attached to, so
  // one whose goalRef is empty or names an item that no longer exists fell out
  // of the view entirely — and took everything nested below it with it. An AI
  // plan disappears the moment any link above it is unrooted. List those at
  // their own period, where they are the top of what is left of the tree.
  milestoneGoals.forEach((milestoneGoal) => {
    // eslint-disable-next-line no-underscore-dangle
    if (!attachedIds.has(milestoneGoal._id) && milestonesView[milestoneGoal.period]) {
      milestonesView[milestoneGoal.period].push(milestoneGoal);
    }
  });

  return milestonesView;
}

module.exports = getGoalMilestone;
