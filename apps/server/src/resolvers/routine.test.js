/**
 * buildStimuliForRoutineItem / timeDiff.
 *
 * D.splitRate is the gap in hours to the next routine item, and
 * `round(D.splitRate / K.splitRate)` (K is always 2) is how many day goal-items
 * a task needs before its card reads full. These tests pin that arithmetic,
 * because getting it wrong silently changes how many goals a task demands and
 * can stop the agent end event from ever becoming eligible.
 */

process.env.ENCRYPTION_KEY = 'routine-resolver-test-key';

const { buildStimuliForRoutineItem } = require('./routine');

// Mirrors the consumers (DashBoard.countTaskTotal, utils/stimulusPoints).
const slotsFor = (stimuli) => {
  const d = stimuli.find((st) => st.name === 'D');
  const k = stimuli.find((st) => st.name === 'K');
  return Number((d.splitRate / k.splitRate).toFixed(0));
};

const task = (id, time) => ({ _id: id, time });

// The real routine this regression was found on.
const TASKLIST = [
  task('wake', '06:00'),
  task('movement', '06:00'),
  task('jogging', '06:15'),
  task('meditation', '06:40'),
  task('startWork', '09:00'),
  task('windDown', '11:30'),
  task('sleep', '23:00'),
];

const splitRateOf = (id, tasklist = TASKLIST) => buildStimuliForRoutineItem(id, tasklist)
  .find((st) => st.name === 'D').splitRate;

describe('timeDiff (via buildStimuliForRoutineItem)', () => {
  it('counts minutes, not just the hour field', () => {
    // 06:40 -> 09:00 is 2h20m. The old code read the hours alone (9 - 6) and
    // called it 3, which is the entire D-20 bug.
    expect(splitRateOf('meditation')).toBe(2.33);
  });

  it('gives a 2h20m gap ONE goal slot, so the card can read 1/1', () => {
    // round(2.33 / 2) = 1. Under the old value it was round(3 / 2) = 2, so a
    // task with a single goal item sat on "1/2" forever.
    expect(slotsFor(buildStimuliForRoutineItem('meditation', TASKLIST))).toBe(1);
  });

  it('floors short gaps at 2 hours, i.e. one slot', () => {
    expect(splitRateOf('jogging')).toBe(2); // 06:15 -> 06:40 is 25 minutes
    expect(splitRateOf('movement')).toBe(2); // 06:00 -> 06:15
    expect(splitRateOf('wake')).toBe(2); // 06:00 -> 06:00, a zero-length gap
    expect(slotsFor(buildStimuliForRoutineItem('jogging', TASKLIST))).toBe(1);
  });

  it('keeps a genuinely long gap as a real multi-goal task', () => {
    // 11:30 -> 23:00 is 11.5h, deliberately several goals.
    expect(splitRateOf('windDown')).toBe(11.5);
    expect(slotsFor(buildStimuliForRoutineItem('windDown', TASKLIST))).toBe(6);
  });

  it('treats the last task as running to midnight', () => {
    expect(splitRateOf('sleep')).toBe(2); // 23:00 -> 24:00 is 1h, floored to 2
    expect(slotsFor(buildStimuliForRoutineItem('sleep', TASKLIST))).toBe(1);
  });

  it('no longer rounds a half-hour gap up past the real elapsed time', () => {
    const list = [task('a', '08:00'), task('b', '10:30')];
    expect(splitRateOf('a', list)).toBe(2.5); // was 2 under hour-only subtraction
  });

  it('starts every stimulus at zero earned, with the K and G constants intact', () => {
    const stimuli = buildStimuliForRoutineItem('meditation', TASKLIST);
    expect(stimuli.map((st) => st.name)).toEqual(['D', 'K', 'G']);
    expect(stimuli.every((st) => st.earned === 0)).toBe(true);
    expect(stimuli.find((st) => st.name === 'K').splitRate).toBe(2);
    expect(stimuli.find((st) => st.name === 'G').splitRate).toBe(4);
  });
});
