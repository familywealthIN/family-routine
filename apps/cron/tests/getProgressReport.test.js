const {
  getEfficiency, getProgressReport, getProgressStatement, getStimuli,
} = require('../src/utils/getProgressReport');

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

  // E2E BUG-6: with nothing to earn the card used to read "0%", which says "you
  // did nothing" about a window that has no data. Null is the "no figure" the
  // UI already renders as "—".
  it('stays a percentage — never above 100, and no figure with nothing to earn', () => {
    const overEarned = day('17-08-2026', [{ points: 10, ticked: true, stimuli: [{ name: 'D', earned: 40 }] }]);

    expect(getEfficiency({ period: 'week', periodRoutines: [overEarned] }).value).toBe('100%');
    expect(getEfficiency({ period: 'week', periodRoutines: [] }).value).toBeNull();
    expect(getEfficiency({ period: 'day', periodRoutines: [day('17-08-2026', [])] }).value).toBeNull();
  });

  it('carries the formula so a screen can show it without writing its own', () => {
    const card = getEfficiency({ period: 'week', periodRoutines: [] });

    expect(card.description).toContain('Routine points earned');
    expect(card.description).toContain("this week's days");
    expect(card.description).toContain('Skipped days do not count');
  });

  // The redesigned /progress hero discloses this sentence verbatim behind the
  // info icon, so the unit word has to be the thing the period actually counts.
  // A Day window holds one routine day: what the ratio runs across there is that
  // day's routines, not its "days".
  it('names the unit the period counts, not always "days"', () => {
    const formula = (period) => getEfficiency({ period, periodRoutines: [] }).description;

    expect(formula('day')).toBe("Routine points earned ÷ routine points available, across this day's routines. Skipped days do not count.");
    expect(formula('week')).toBe("Routine points earned ÷ routine points available, across this week's days. Skipped days do not count.");
    expect(formula('month')).toContain("this month's days");
    expect(formula('year')).toContain("this year's days");
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

// E2E BUG-6: getProgress(day) for a date with no routine doc divided by a zero
// length, and GraphQLString refused the NaNs ("String cannot represent value:
// NaN", 9 errors) — failing the whole response.
describe('getProgressReport with no routine doc in the window', () => {
  const emptyReport = () => getProgressReport({
    routines: [],
    goals: [],
    dailyTasks: [],
    period: 'day',
    startDate: '28-09-2026',
    endDate: '28-09-2026',
    periodRoutines: [],
    periodDailyTasks: [],
  });

  it('carries no NaN anywhere', () => {
    const json = JSON.stringify(emptyReport(), (key, value) => (Number.isNaN(value) ? 'NaN!' : value));

    expect(json).not.toContain('NaN!');
  });

  it('reports the averaged cards as having no data rather than zeros', () => {
    const { cards } = emptyReport();
    const byId = (id) => cards.find((item) => item && item.id === id);

    expect(getStimuli({ periodRoutines: [] })).toEqual({ id: 'radar-chart', name: 'Radar Chart', values: [] });
    expect(byId('radar-chart').values).toEqual([]);
    expect(byId('task-activities').values).toEqual([]);
    expect(byId('efficiency').value).toBeNull();
  });
});

// E2E BUG-3: the headline averaged raw points over only the days that scored —
// the pre-D-13 definition — so a 47% week said "Great Going!" while a 63% day
// said "Live your potential". It now reads the efficiency card's own number.
describe('getProgressStatement', () => {
  it('follows the efficiency figure, so a missed day lowers the praise', () => {
    // 141 of 297 available (47%) — but 141 / 2 scoring days = 71 under the old rule.
    const week = [
      day('01-10-2026', [task(99, false)]),
      day('02-10-2026', [task(79, true), task(20, false)]),
      day('03-10-2026', [task(62, true), task(37, false)]),
    ];
    const today = [day('03-10-2026', [task(62, true), task(37, false)])];

    expect(getEfficiency({ period: 'week', periodRoutines: week }).value).toBe('47%');
    expect(getProgressStatement({ periodRoutines: week })).toBe('Live your potential. You got this.');
    expect(getEfficiency({ period: 'day', periodRoutines: today }).value).toBe('63%');
    expect(getProgressStatement({ periodRoutines: today })).toBe('Live your potential. You got this.');
  });

  it('uses the same 70 / 40 bands on the percentage', () => {
    expect(getProgressStatement({ periodRoutines: [day('03-10-2026', [task(70, true), task(30, false)])] })).toBe('Great Going!');
    expect(getProgressStatement({ periodRoutines: [day('03-10-2026', [task(39, true), task(61, false)])] })).toBe("Stay Calm and focus on what's right?");
    expect(getProgressStatement({ periodRoutines: [] })).toBe("Stay Calm and focus on what's right?");
  });
});

// apps/cron/src/progress.js pushes getProgressStatement as the "Routine
// Progress" notification body: it must always be one of the three sentences,
// never "null"/"NaN"/undefined, even for a day with nothing to earn.
describe('progress notification body', () => {
  const sentences = [
    'Great Going!',
    'Live your potential. You got this.',
    "Stay Calm and focus on what's right?",
  ];

  it.each([
    [[]],
    [[day('03-10-2026', [])]],
    [[day('03-10-2026', [{ points: 0, stimuli: [] }])]],
    [[day('03-10-2026', [task(10, true)])]],
  ])('is always a real sentence (%#)', (periodRoutines) => {
    expect(sentences).toContain(getProgressStatement({ periodRoutines }));
  });
});
