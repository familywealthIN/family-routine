const { getEfficiency, getProgressReport } = require('./getProgressReport');

// D-13: /progress read 15% Routine Efficiency while /history read 6% for the
// same account at the same instant, because each screen picked its own
// denominator. The definition the server now owns is earned over available.
//
// `earned` comes off the D stimulus, which stimulusPoints.js sets to the whole
// of task.points the moment the item is ticked — so a ticked task contributes
// its points to both halves of the ratio and an unticked one only to the
// bottom.
let taskSeq = 0;
const task = (points, ticked) => ({
  _id: `task-${(taskSeq += 1)}`,
  name: `task-${taskSeq}`,
  points,
  ticked,
  stimuli: [
    { name: 'D', splitRate: 4, earned: ticked ? points : 0 },
    { name: 'K', splitRate: 2, earned: 0 },
    { name: 'G', splitRate: 4, earned: 0 },
  ],
});

const day = (date, tasklist, skip = false) => ({ date, skip, tasklist });

describe('getEfficiency', () => {
  it('reports the share of the period\'s available points that was earned', () => {
    const card = getEfficiency({
      period: 'week',
      periodRoutines: [
        day('17-08-2026', [task(30, true), task(10, false)]),
        day('18-08-2026', [task(30, true), task(10, true)]),
      ],
    });

    // 70 earned of 80 available.
    expect(card.value).toBe('88%');
  });

  it('falls when a day is missed, instead of sitting still', () => {
    const scored = [day('17-08-2026', [task(30, true), task(10, true)])];
    const missed = day('18-08-2026', [task(30, false), task(10, false)]);

    expect(getEfficiency({ period: 'week', periodRoutines: scored }).value).toBe('100%');
    expect(getEfficiency({ period: 'week', periodRoutines: [...scored, missed] }).value).toBe('50%');
  });

  it('leaves a skipped day out of both halves of the ratio', () => {
    const card = getEfficiency({
      period: 'week',
      periodRoutines: [
        day('17-08-2026', [task(30, true), task(10, false)]),
        day('18-08-2026', [task(40, false)], true),
      ],
    });

    expect(card.value).toBe('75%');
  });

  it('stays a percentage — never above 100, and 0 with nothing to earn', () => {
    const overEarned = day('17-08-2026', [{ points: 10, ticked: true, stimuli: [{ name: 'D', earned: 40 }] }]);

    expect(getEfficiency({ period: 'week', periodRoutines: [overEarned] }).value).toBe('100%');
    expect(getEfficiency({ period: 'week', periodRoutines: [] }).value).toBe('0%');
    expect(getEfficiency({ period: 'day', periodRoutines: [day('17-08-2026', [])] }).value).toBe('0%');
  });

  it('carries the formula so a screen can show it without writing its own', () => {
    const card = getEfficiency({ period: 'week', periodRoutines: [] });

    expect(card.description).toContain('Routine points earned');
    expect(card.description).toContain("this week's days");
    expect(card.description).toContain('Skipped days do not count');
  });

  it('is still what the efficiency card on /progress carries', () => {
    const periodRoutines = [day('17-08-2026', [task(30, true), task(10, false)])];
    const report = getProgressReport({
      routines: [],
      goals: [],
      dailyTasks: [],
      period: 'week',
      startDate: '16-08-2026',
      endDate: '22-08-2026',
      periodRoutines,
      periodDailyTasks: [],
    });

    const card = report.cards.find((item) => item && item.id === 'efficiency');

    expect(card.value).toBe('75%');
    expect(card.description).toBe(getEfficiency({ period: 'week', periodRoutines }).description);
  });
});
