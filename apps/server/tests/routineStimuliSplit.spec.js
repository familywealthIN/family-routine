process.env.ENCRYPTION_KEY = 'routine-stimuli-split-test-key';

const { buildStimuliForRoutineItem } = require('../src/resolvers/routine');
const { updateStimulusEarnedPoint } = require('../src/utils/stimulusPoints');

// The routine card header ("06:40 - 1/2") is not a checkbox count: the total is
// round(D.splitRate / K.splitRate) and the completed figure is that total
// scaled by the K earned. Mirrors DashBoard.countTaskTotal /
// countTaskCompleted and utils/getProgressReport.
function countTaskTotal(task) {
  const d = task.stimuli.find((st) => st.name === 'D');
  const k = task.stimuli.find((st) => st.name === 'K');
  return Number((d.splitRate / k.splitRate).toFixed(0));
}

function countTaskCompleted(task) {
  const k = task.stimuli.find((st) => st.name === 'K');
  return Number((countTaskTotal(task) * (k.earned / task.points)).toFixed(0));
}

// 06:40 Meditation -> 09:00 Start Work -> 13:00 Lunch, the beta-run routine.
const tasklist = [
  { _id: 'meditation', time: '06:40' },
  { _id: 'start-work', time: '09:00' },
  { _id: 'lunch', time: '13:00' },
];

describe('buildStimuliForRoutineItem split rate', () => {
  // D-20: reading only the hour field turned the 2h20m Meditation window into
  // a full 3 hours, so the card demanded two goal items and stuck at 1/2.
  it('measures the gap in minutes, not whole hours', () => {
    const [d] = buildStimuliForRoutineItem('meditation', tasklist);

    expect(d.name).toBe('D');
    expect(d.splitRate).toBeCloseTo(7 / 3, 6);
  });

  it('floors a short gap at two hours so every task keeps one slot', () => {
    const shortDay = [
      { _id: 'stretch', time: '07:00' },
      { _id: 'shower', time: '07:30' },
    ];
    const [d] = buildStimuliForRoutineItem('stretch', shortDay);

    expect(d.splitRate).toBe(2);
  });

  it('leaves whole-hour gaps as they were', () => {
    const [d] = buildStimuliForRoutineItem('start-work', tasklist);

    expect(d.splitRate).toBe(4);
    expect(countTaskTotal({ points: 15, stimuli: buildStimuliForRoutineItem('start-work', tasklist) })).toBe(2);
  });
});

describe('routine card counter', () => {
  // D-20 repro: one day goal item checked on the 06:40 task must read 1/1,
  // not 1/2 — and completed >= total is what releases the agent end event.
  it('reads 1/1 once the single day goal item on a 2h20m task is checked', () => {
    const task = {
      points: 15,
      stimuli: buildStimuliForRoutineItem('meditation', tasklist),
    };

    expect(countTaskTotal(task)).toBe(1);
    expect(countTaskCompleted(task)).toBe(0);

    task.stimuli = updateStimulusEarnedPoint('K', task);

    expect(countTaskCompleted(task)).toBe(1);
    expect(countTaskCompleted(task)).toBeGreaterThanOrEqual(countTaskTotal(task));
  });
});
