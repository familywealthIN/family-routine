const { deriveGoalItemStatus, windowEndMinutes } = require('./goalItemStatus');

// Mirrors this account's real routine: two tasks share 06:00, which is what
// produced the always-"missed" grade on the first of them.
const tasklist = [
  { _id: 'wake', time: '06:00' },
  { _id: 'move', time: '06:00' },
  { _id: 'jog', time: '06:15' },
  { _id: 'meditate', time: '06:40' },
  { _id: 'work', time: '09:00' },
  { _id: 'sleep', time: '23:00' },
];

const IST = 'Asia/Kolkata';
const DATE = '28-07-2026';

/** An instant that reads as `hh:mm` on 28-07-2026 in Asia/Kolkata (UTC+5:30). */
function istInstant(hh, mm) {
  return new Date(Date.UTC(2026, 6, 28, hh - 5, mm - 30));
}

describe('windowEndMinutes', () => {
  it('skips tasks that share the same start time', () => {
    // 'wake' and 'move' both start 06:00, so the window runs to 06:15 (jog).
    expect(windowEndMinutes(tasklist, 0)).toBe(6 * 60 + 15);
    expect(windowEndMinutes(tasklist, 1)).toBe(6 * 60 + 15);
  });

  it('uses the next distinct time for ordinary slots', () => {
    expect(windowEndMinutes(tasklist, 2)).toBe(6 * 60 + 40);
    expect(windowEndMinutes(tasklist, 4)).toBe(23 * 60);
  });

  it('runs the last slot to end of day', () => {
    expect(windowEndMinutes(tasklist, 5)).toBe(24 * 60);
  });
});

describe('deriveGoalItemStatus', () => {
  const base = { tasklist, timezone: IST, routineDate: DATE };

  it('grades a tick inside the window as done', () => {
    expect(deriveGoalItemStatus({
      ...base, taskRef: 'jog', completedAt: istInstant(6, 20),
    })).toBe('done');
  });

  it('grades a tick after the window as missed', () => {
    expect(deriveGoalItemStatus({
      ...base, taskRef: 'jog', completedAt: istInstant(8, 30),
    })).toBe('missed');
  });

  // The reported bug: two tasks at 06:00 gave the first a zero-width window,
  // so even a tick at exactly 06:00 graded "missed".
  it('does not mark a shared-start-time task missed when ticked on time', () => {
    expect(deriveGoalItemStatus({
      ...base, taskRef: 'wake', completedAt: istInstant(6, 0),
    })).toBe('done');
    expect(deriveGoalItemStatus({
      ...base, taskRef: 'wake', completedAt: istInstant(6, 10),
    })).toBe('done');
  });

  it('closes the shared window at the next distinct time', () => {
    expect(deriveGoalItemStatus({
      ...base, taskRef: 'wake', completedAt: istInstant(6, 16),
    })).toBe('missed');
  });

  it('treats an early tick as done, not missed', () => {
    expect(deriveGoalItemStatus({
      ...base, taskRef: 'work', completedAt: istInstant(7, 0),
    })).toBe('done');
  });

  // The old code compared moment(task.time,'HH:mm') — server-local — against an
  // absolute completedAt. On a UTC server an IST user ticking 09:05 IST looks
  // like 03:35 UTC and every verdict shifts by 5h30m.
  it('grades in the user timezone, not the server timezone', () => {
    const at0905IST = istInstant(9, 5); // 03:35 UTC
    expect(deriveGoalItemStatus({
      ...base, taskRef: 'work', completedAt: at0905IST,
    })).toBe('done');

    // Same instant, a user whose zone puts it after the 09:00–23:00 window
    // would still be graded on their own clock.
    expect(deriveGoalItemStatus({
      ...base, taskRef: 'work', completedAt: at0905IST, timezone: 'UTC',
    })).toBe('done'); // 03:35 UTC is before the 09:00 slot => early => done
  });

  it('accepts legacy offset-style timezone values', () => {
    expect(deriveGoalItemStatus({
      ...base, taskRef: 'jog', completedAt: istInstant(6, 20), timezone: '+05:50',
    })).toBe('done');
  });

  it('marks a completion on a later local day as missed', () => {
    expect(deriveGoalItemStatus({
      ...base, taskRef: 'jog', completedAt: new Date(Date.UTC(2026, 6, 29, 12, 0)),
    })).toBe('missed');
  });

  it('defaults to done when the task is not in the list', () => {
    expect(deriveGoalItemStatus({
      ...base, taskRef: 'nope', completedAt: istInstant(6, 20),
    })).toBe('done');
  });

  it('defaults to done without a completedAt', () => {
    expect(deriveGoalItemStatus({ ...base, taskRef: 'jog', completedAt: null })).toBe('done');
  });
});
