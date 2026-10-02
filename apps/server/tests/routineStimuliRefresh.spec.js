process.env.ENCRYPTION_KEY = 'routine-stimuli-refresh-test-key';

const { buildStimuliForRoutineItem, refreshStimuliSplitRates } = require('../src/resolvers/routine');

// D-03: routineDate carried a day copy's stimuli over verbatim, so a day
// document written before a time edit kept the split rate it was created with.
// The same routine item then read 0/6 on Wednesday and 0/1 on Thursday of the
// same week. The card total is Number((D.splitRate / K.splitRate).toFixed(0)).
function countTaskTotal(stimuli) {
  const d = stimuli.find((st) => st.name === 'D');
  const k = stimuli.find((st) => st.name === 'K');
  return Number((d.splitRate / k.splitRate).toFixed(0));
}

// 09:00 Start Work -> 11:30 Wind-down, as the routine stood before the edit.
const oldTasklist = [
  { _id: 'start-work', time: '09:00' },
  { _id: 'wind-down', time: '11:30' },
];

// Wind-down moved to 21:30; Start Work's window is now 12h30m.
const newTasklist = [
  { _id: 'start-work', time: '09:00' },
  { _id: 'wind-down', time: '21:30' },
];

describe('refreshStimuliSplitRates', () => {
  it('re-derives a stale day copy from the current schedule', () => {
    const stored = buildStimuliForRoutineItem('start-work', oldTasklist);
    expect(countTaskTotal(stored)).toBe(1);

    const refreshed = refreshStimuliSplitRates(stored, 'start-work', newTasklist);

    expect(countTaskTotal(refreshed)).toBe(6);
  });

  it('keeps what the day has earned', () => {
    const stored = buildStimuliForRoutineItem('wind-down', oldTasklist);
    stored.find((st) => st.name === 'D').earned = 15;

    const refreshed = refreshStimuliSplitRates(stored, 'wind-down', newTasklist);

    expect(countTaskTotal(refreshed)).toBe(1);
    expect(refreshed.find((st) => st.name === 'D').earned).toBe(15);
  });

  it('freezes the rate once K has been banked against the old slicing', () => {
    const stored = buildStimuliForRoutineItem('start-work', oldTasklist);
    stored.find((st) => st.name === 'K').earned = 15;

    const refreshed = refreshStimuliSplitRates(stored, 'start-work', newTasklist);

    expect(countTaskTotal(refreshed)).toBe(1);
  });
});
