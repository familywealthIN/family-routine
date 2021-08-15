/* eslint-disable no-case-declarations */
function getEstimatedStimulusUnit(action, task, isRemove = false, period) {
  let earned = 0;
  const stimulus = task.stimuli.find((st) => st.name === action);
  switch (action) {
    case 'D':
      earned = stimulus.earned < task.points ? task.points : earned;
      return { earned };
    case 'K':
      const dStimulus = task.stimuli.find((st) => st.name === 'D');
      console.log('dStimulus', dStimulus);
      const count = Number((dStimulus.splitRate / stimulus.splitRate).toFixed(0));
      console.log('count', count);
      if (isRemove) {
        earned = stimulus.earned >= (task.points / count) ? (task.points / count) : earned;
      } else {
        earned = stimulus.earned < task.points ? (task.points / count) : earned;
      }
      console.log('earned', earned);
      return { earned, count };
    case 'G':
      console.log('period G', period);
      let periodPoint = 0;
      switch (period) {
        case 'day':
          periodPoint = task.points * 0.25;
          return { earned: stimulus.earned > periodPoint ? stimulus.earned : periodPoint };
        case 'week':
          periodPoint = task.points * 0.50;
          return { earned: stimulus.earned > periodPoint ? stimulus.earned : periodPoint };
        case 'month':
          periodPoint = task.points * 0.75;
          return { earned: stimulus.earned > periodPoint ? stimulus.earned : periodPoint };
        case 'year':
          periodPoint = task.points * 1;
          return { earned: stimulus.earned > periodPoint ? stimulus.earned : periodPoint };
        default:
          return { earned: stimulus.earned };
      }
    default:
      return { earned };
  }
}

function updateStimulusEarnedPoint(action, task, period) {
  const earnedDetail = getEstimatedStimulusUnit(action, task, false, period);
  console.log('earnedDetail', earnedDetail);
  if (action === 'G') {
    task.stimuli.forEach((st) => {
      if (st.name === action) {
        // eslint-disable-next-line no-param-reassign
        st.earned = earnedDetail.earned;
      }

      return st;
    });
  } else {
    task.stimuli.forEach((st) => {
      if (st.name === action) {
        // eslint-disable-next-line no-param-reassign
        st.earned += earnedDetail.earned;
      }

      return st;
    });
  }

  return task.stimuli;
}

function removeStimulusEarnedPoint(action, task) {
  const earnedDetail = getEstimatedStimulusUnit(action, task, true);
  task.stimuli.forEach((st) => {
    if (st.name === action) {
      console.log('st.earned', st.earned);
      console.log('earnedDetail.earned', earnedDetail.earned);
      // eslint-disable-next-line no-param-reassign
      st.earned -= earnedDetail.earned;
    }

    return st;
  });

  return task.stimuli;
}

module.exports = {
  getEstimatedStimulusUnit,
  updateStimulusEarnedPoint,
  removeStimulusEarnedPoint,
};
