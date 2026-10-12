jest.mock('./chatApi', () => ({ completeChat: jest.fn() }));

const { completeChat } = require('./chatApi');
const {
  DEFAULT_INSIGHT_MODEL,
  previousDates,
  periodDates,
  dayPlan,
  summariseRoutineHistory,
  nextMilestone,
  describeHistory,
  fallbackInsight,
  threeSentences,
  generateRoutineInsight,
} = require('./routineInsight');

const task = (over) => ({ _id: 'r1', ...over });

describe('previousDates', () => {
  it('lists the days before the date, newest first, across a month edge', () => {
    expect(previousDates('02-10-2026', 3)).toEqual(['01-10-2026', '30-09-2026', '29-09-2026']);
  });
});

describe('summariseRoutineHistory', () => {
  const routines = [
    { date: '05-10-2026', tasklist: [task({ ticked: true })] },
    { date: '04-10-2026', tasklist: [task({ ticked: true, passed: true })] },
    { date: '03-10-2026', tasklist: [task({ ticked: false, passed: true })] },
    { date: '02-10-2026', skip: true, tasklist: [task({})] },
    { date: '01-10-2026', tasklist: [{ _id: 'other', ticked: true }] },
  ];
  const goals = [
    { date: '04-10-2026', goalItems: [{ taskRef: 'r1', body: 'Late one', isComplete: true, status: 'missed' }] },
    { date: '05-10-2026', goalItems: [
      { taskRef: 'r1', body: 'Write notes', isComplete: true, status: 'done' },
      { taskRef: 'r1', body: 'Open one', isComplete: false },
      { taskRef: 'x', body: 'Not mine', isComplete: true },
    ] },
  ];

  it('splits ticks into in time, late, missed and skipped', () => {
    const s = summariseRoutineHistory({ routines, goals, taskRef: 'r1' });
    expect(s).toMatchObject({
      days: 4, onTime: 1, late: 1, missed: 1, skipped: 1, itemsDone: 1, itemsLate: 1, itemsOpen: 1,
    });
  });

  it('lists the routine\'s own activities newest first with their state', () => {
    const s = summariseRoutineHistory({ routines, goals, taskRef: 'r1' });
    expect(s.activities).toEqual(['Write notes (done)', 'Open one (not done)', 'Late one (late)']);
  });
});

describe('threeSentences', () => {
  it('keeps the first three sentences as one plain paragraph', () => {
    expect(threeSentences('**One.**\n- Two!\n3. Three? Four.')).toBe('One. Two! Three?');
  });

  it('rejects an answer shorter than three sentences', () => {
    expect(threeSentences('Just one.')).toBe('');
  });
});

describe('generateRoutineInsight', () => {
  const summary = summariseRoutineHistory({ routines: [], goals: [], taskRef: 'r1' });

  it('returns the model paragraph trimmed to three sentences', async () => {
    completeChat.mockResolvedValueOnce({ content: 'A one. B two. C three. D four.', model: 'm' });
    await expect(generateRoutineInsight({ summary, routineName: 'Jog' }))
      .resolves.toEqual({ text: 'A one. B two. C three.', model: 'm' });
  });

  it('falls back to a measured three-sentence paragraph when the model fails', async () => {
    completeChat.mockRejectedValueOnce(new Error('down'));
    const { text, model } = await generateRoutineInsight({ summary, routineName: 'Jog' });
    expect(model).toBeNull();
    expect(text).toBe(fallbackInsight(summary, 'Jog'));
    expect(text.match(/[.!?](\s|$)/g)).toHaveLength(3);
  });

  it('fallback celebrates the run, offers one idea and ends on the next target', () => {
    const s = {
      ...summary,
      days: 10,
      onTime: 4,
      late: 3,
      missed: 3,
      showedUp: 7,
      streak: 3,
      bestStreak: 5,
      topActivities: [{ body: 'Core Workout', count: 6 }],
      milestone: nextMilestone({ streak: 3, bestStreak: 5 }),
    };
    const text = fallbackInsight(s, 'Jog');
    expect(text).toBe('3 in a row on Jog. Next time, beat "Core Workout" by one rep or one minute. '
      + '3 more days beats your best run of 5.');
    expect(text.split(' ').length).toBeLessThanOrEqual(30);
    expect(text).not.toMatch(/missed|late/);
    expect(text.match(/[.!?](\s|$)/g)).toHaveLength(3);
  });

  it('fallback welcomes a first check-in', () => {
    const text = fallbackInsight({ ...summary, showedUp: 0 }, 'Jog');
    expect(text).toMatch(/^First Jog on the board/);
    expect(text.match(/[.!?](\s|$)/g)).toHaveLength(3);
  });

  it('asks Claude Fable first, at full creativity, with the moment and past messages', async () => {
    completeChat.mockClear();
    completeChat.mockResolvedValueOnce({ content: 'A. B. C.', model: 'anthropic/claude-fable-5.1' });
    await generateRoutineInsight({
      summary, routineName: 'Jog', previous: ['Yesterday you ran a 5k. Try hills. See you.'],
    });
    const [[messages, options]] = completeChat.mock.calls;
    expect(options).toMatchObject({ models: [DEFAULT_INSIGHT_MODEL], temperature: 1 });
    const [system, user] = messages;
    expect(system.content).toMatch(/Formulas and stock phrases such as "just N more"/);
    expect(system.content).toMatch(/quick way to compensate/);
    expect(user.content).toMatch(/The moment:/);
    expect(user.content).toMatch(/do not repeat them\):\n- Yesterday you ran a 5k/);
  });

  it('falls back to the free roster when Fable is unavailable', async () => {
    completeChat.mockClear();
    completeChat
      .mockRejectedValueOnce(new Error('402 credits'))
      .mockResolvedValueOnce({ content: 'One. Two. Three.', model: 'free:model' });
    await expect(generateRoutineInsight({ summary, routineName: 'Jog' }))
      .resolves.toEqual({ text: 'One. Two. Three.', model: 'free:model' });
    expect(completeChat.mock.calls[1][1].models).toBeUndefined();
  });
});

describe('the day around the tick', () => {
  const routine = {
    date: '07-10-2026',
    tasklist: [
      { _id: 'r3', name: 'Night Routine', time: '22:00' },
      { _id: 'r1', name: 'Workout', time: '19:30', passed: false },
      { _id: 'r0', name: 'Morning Pages', time: '06:30', passed: true, ticked: false },
      { _id: 'r2', name: 'Lunch Walk', time: '12:30', passed: true, ticked: true },
    ],
  };

  it('lists the whole day in time order and marks what was missed', () => {
    expect(dayPlan(routine, 'r1')).toEqual([
      { time: '06:30', name: 'Morning Pages', state: 'missed', current: false },
      { time: '12:30', name: 'Lunch Walk', state: 'done late', current: false },
      { time: '19:30', name: 'Workout', state: 'done', current: true },
      { time: '22:00', name: 'Night Routine', state: 'not yet', current: false },
    ]);
  });

  it('carries the tick moment, the missed routines and the linked goals to the model', () => {
    const s = summariseRoutineHistory({
      routines: [routine],
      goals: [],
      taskRef: 'r1',
      today: '07-10-2026',
      periodGoals: [
        { period: 'week', goalItems: [{ taskRef: 'r1', body: 'Train 4 times', isComplete: false }] },
        { period: 'month', goalItems: [{ taskRef: 'other', body: 'Not mine' }] },
      ],
      moment: { tickedAt: '20:29', windowEnd: '21:00', minutesLeft: 31 },
    });
    expect(s.missedToday).toEqual(['Morning Pages']);
    expect(s.linked).toEqual([{ period: 'week', body: 'Train 4 times', done: false }]);
    const text = describeHistory(s);
    expect(text).toMatch(/The moment: ticked at 20:29, on Wednesday, window 19:30-21:00, 31 min left in the window/);
    expect(text).toMatch(/Missed earlier today: Morning Pages/);
    expect(text).toMatch(/19:30 Workout \(done\) <- this routine/);
    expect(text).toMatch(/week goal "Train 4 times" \(open\)/);
  });

  it('keys week goals by their Friday and month goals by the last day', () => {
    expect(periodDates('07-10-2026')).toEqual({ week: '09-10-2026', month: '31-10-2026' });
  });
});

describe('momentum', () => {
  // Today is Wed 07-10-2026; r1 runs daily.
  const day = (date, over = {}, skip = false) => ({ date, skip, tasklist: [task(over)] });
  const routines = [
    day('07-10-2026', { ticked: true, stimuli: [{ name: 'G', earned: 10 }] }),
    day('06-10-2026', { ticked: true, stimuli: [{ name: 'G', earned: 10 }, { name: 'K', earned: 5 }] }),
    day('05-10-2026', {}, true), // a rest day neither adds nor breaks
    day('04-10-2026', { ticked: true, passed: true }),
    day('03-10-2026', { ticked: false, passed: true }), // breaks the run
    day('02-10-2026', { ticked: true }),
    day('01-10-2026', { ticked: true }),
    day('30-09-2026', { ticked: true }),
    day('29-09-2026', { ticked: true }),
    // 28-09 has no document: the app was not opened, which also breaks a run
    day('27-09-2026', { ticked: true }),
  ];
  const goals = [
    { date: '06-10-2026', goalItems: [{ taskRef: 'r1', body: 'Core Workout.', isComplete: true, status: 'done' }] },
    { date: '04-10-2026', goalItems: [{ taskRef: 'r1', body: 'Core Workout', isComplete: true, status: 'done' }] },
    { date: '02-10-2026', goalItems: [{ taskRef: 'r1', body: 'Stretch', isComplete: true, status: 'done' }] },
  ];
  const s = summariseRoutineHistory({
    routines, goals, taskRef: 'r1', today: '07-10-2026',
  });

  it('counts the current and best runs of check-ins', () => {
    expect(s.streak).toBe(3);
    expect(s.bestStreak).toBe(4);
  });

  it('compares this week with last week', () => {
    expect(s.thisWeek).toBe(5);
    expect(s.lastWeek).toBe(3);
  });

  it('totals the K/D/G this routine earned', () => {
    expect(s.earned).toEqual({ K: 5, D: 0, G: 20 });
  });

  it('ranks the activities done most often', () => {
    expect(s.topActivities[0]).toEqual({ body: 'Core Workout', count: 2 });
  });

  it('counts today even before the tick reaches the document', () => {
    const fresh = summariseRoutineHistory({
      routines: [day('07-10-2026', { ticked: false })], goals: [], taskRef: 'r1', today: '07-10-2026',
    });
    expect(fresh).toMatchObject({ todayState: 'onTime', streak: 1, showedUp: 1 });
  });

  it('hands the model the target within reach', () => {
    expect(s.milestone).toBe('2 more days beats your best run of 4');
    expect(describeHistory(s)).toMatch(/Current run of check-ins: 3 \(NOT a record: the best run in the last 30 days is 4\)/);
  });
});

describe('nextMilestone', () => {
  it('aims at beating the best run first', () => {
    expect(nextMilestone({ streak: 2, bestStreak: 6 })).toBe('5 more days beats your best run of 6');
  });

  it('aims at the next round number once the run is the record', () => {
    expect(nextMilestone({ streak: 6, bestStreak: 6 })).toBe('1 more day makes 7 in a row');
  });
});
