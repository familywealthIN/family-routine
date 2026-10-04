const {
  getBestRoutineSorted,
  getProgressReport,
  getStimuli,
  getTaskActivities,
} = require('./getProgressReport');

// D-27: /progress shipped a "Goals on Track (Coming Soon)" tile reading "?",
// listed items scoring 0 under "Great Going!" as well as "Needs Attention!",
// and divided a week's counts by its days so "Routine Items 1/7" read as
// today's count beside a WEEK toggle.
//
// G is left at 0 in every fixture: getScore weights it by weekday and week of
// month, which would make the scores depend on the date the suite runs.
const task = (id, earnedD, earnedK = 0) => ({
  _id: id,
  name: id,
  points: 30,
  ticked: earnedD > 0,
  stimuli: [
    { name: 'D', splitRate: 4, earned: earnedD },
    { name: 'K', splitRate: 2, earned: earnedK },
    { name: 'G', splitRate: 4, earned: 0 },
  ],
});

const day = (date, tasklist) => ({ date, skip: false, tasklist });

const names = (card) => card.values.map((value) => value.name);

const sorted = (periodRoutines, cardId) => getBestRoutineSorted({
  periodRoutines,
  cardId,
  cardName: cardId === 'good' ? 'Great Going!' : 'Needs Attention!',
});

describe('getBestRoutineSorted', () => {
  // The seven-item routine that produced the reported split: one item scored,
  // the other six did not.
  const week = () => [day('17-08-2026', [
    task('Wake Up', 0),
    task('Morning movement', 0),
    task('Jogging', 30),
    task('Meditation', 0),
    task('Start Work', 0),
    task('Wind-down', 0),
    task('Sleep Time', 0),
  ])];

  it('keeps items that scored nothing out of "Great Going!"', () => {
    expect(names(sorted(week(), 'good'))).toEqual(['Jogging']);
  });

  it('never puts the same item in both cards', () => {
    const good = names(sorted(week(), 'good'));
    const bad = names(sorted(week(), 'bad'));

    expect(bad.filter((name) => good.includes(name))).toEqual([]);
  });

  it('praises nothing at all when nothing scored', () => {
    const blank = () => [day('17-08-2026', [task('Wake Up', 0), task('Sleep Time', 0)])];

    expect(names(sorted(blank(), 'good'))).toEqual([]);
    expect(names(sorted(blank(), 'bad'))).toEqual(['Wake Up', 'Sleep Time']);
  });

  it('keeps the cards disjoint with fewer than six items, where the slices used to overlap', () => {
    const four = () => [day('17-08-2026', [
      task('Jogging', 90), task('Meditation', 60), task('Start Work', 30), task('Sleep Time', 3),
    ])];

    expect(names(sorted(four(), 'good'))).toEqual(['Jogging', 'Meditation', 'Start Work']);
    expect(names(sorted(four(), 'bad'))).toEqual(['Sleep Time']);
  });
});

describe('getTaskActivities', () => {
  const periodRoutines = [
    day('17-08-2026', [task('Wake Up', 30), task('Start Work', 0)]),
    day('18-08-2026', [task('Wake Up', 30), task('Start Work', 30)]),
  ];
  const goals = [{
    period: 'week',
    goalItems: [
      { isMilestone: true, isComplete: true },
      { isMilestone: true, isComplete: false },
      { isMilestone: false, isComplete: true },
    ],
  }];
  const periodDailyTasks = [
    { date: '17-08-2026', goalItems: [{ isComplete: true }, { isComplete: false }] },
    { date: '18-08-2026', goalItems: [{ isComplete: true }] },
  ];

  const card = () => getTaskActivities({
    periodRoutines, goals, periodDailyTasks, period: 'week',
  });
  const valueOf = (name) => card().values.find((value) => value.name === name);

  it('counts the whole period for the figures that accrue per day', () => {
    // Three of four routine items ticked, two of eight task slots completed —
    // not the 1/2 and 1/4 a per-day average reduced them to.
    expect(valueOf('Routine Items')).toMatchObject({ value: 3, total: 4 });
    expect(valueOf('Tasks')).toMatchObject({ value: 2, total: 8 });
  });

  it('counts a period milestone once for the period, not once per routine day', () => {
    expect(valueOf('Milestones')).toMatchObject({ value: 1, total: 2 });
  });

  it('says which window the counts cover', () => {
    expect(card().description).toContain('this week');
  });
});

describe('getStimuli', () => {
  it('carries the spelt-out stimulus beside each initial, so D / K / G has a legend', () => {
    const card = getStimuli({ periodRoutines: [day('17-08-2026', [task('Wake Up', 30, 10)])] });

    expect(card.values.map((value) => [value.name, value.description])).toEqual([
      ['D', 'Discipline'],
      ['K', 'Kinetics'],
      ['G', 'Geniuses'],
    ]);
    expect(card.description).toContain('100 a day');
  });
});

describe('getProgressReport', () => {
  it('ships no unimplemented placeholder card', () => {
    const report = getProgressReport({
      routines: [day('17-08-2026', [task('Wake Up', 30)])],
      goals: [],
      dailyTasks: [],
      period: 'week',
      startDate: '17-08-2026',
      endDate: '18-08-2026',
    });

    expect(report.cards.map((reportCard) => reportCard.id)).toEqual([
      'radar-chart', 'efficiency', 'task-activities', 'good', 'bad',
    ]);
    expect(JSON.stringify(report)).not.toContain('Coming Soon');
  });
});
