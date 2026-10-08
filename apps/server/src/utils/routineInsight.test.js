jest.mock('./chatApi', () => ({ completeChat: jest.fn() }));

const { completeChat } = require('./chatApi');
const {
  previousDates,
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
    expect(text).toMatch(/^That is 3 check-ins in a row on Jog/);
    expect(text).toMatch(/"Core Workout" into a game/);
    expect(text).toMatch(/3 more days beats your best run of 5, so see you there\.$/);
    expect(text).not.toMatch(/missed|late/);
    expect(text.match(/[.!?](\s|$)/g)).toHaveLength(3);
  });

  it('fallback welcomes a first check-in', () => {
    const text = fallbackInsight({ ...summary, showedUp: 0 }, 'Jog');
    expect(text).toMatch(/^First Jog on the board/);
    expect(text.match(/[.!?](\s|$)/g)).toHaveLength(3);
  });

  it('asks the model for a win, an idea and a hook, never a lecture', async () => {
    completeChat.mockResolvedValueOnce({ content: 'A. B. C.', model: 'm' });
    await generateRoutineInsight({ summary, routineName: 'Jog' });
    const [system, user] = completeChat.mock.calls[completeChat.mock.calls.length - 1][0];
    expect(system.content).toMatch(/Never shame or lecture/);
    expect(system.content).toMatch(/Never give generic advice/);
    expect(user.content).toMatch(/Next target within reach:/);
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
    expect(nextMilestone({ streak: 6, bestStreak: 6 })).toMatch(/^1 more day makes it a 7-day run/);
  });
});
