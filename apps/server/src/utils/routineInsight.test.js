jest.mock('./chatApi', () => ({ completeChat: jest.fn() }));

const { completeChat } = require('./chatApi');
const {
  DEFAULT_INSIGHT_MODEL,
  previousDates,
  periodDates,
  dayPlan,
  dayStates,
  goalItemState,
  summariseRoutineHistory,
  nextMilestone,
  parseCard,
  validateCard,
  formatCard,
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

  it('keeps a skipped item as not done on the card, whose strategy has no word for it', () => {
    const skipped = [{
      date: '05-10-2026',
      goalItems: [{
        taskRef: 'r1', body: 'Skipped one', isComplete: false, status: 'missed',
      }],
    }];
    const s = summariseRoutineHistory({
      routines, goals: skipped, taskRef: 'r1', today: '05-10-2026',
    });
    expect(s.todayItems).toEqual(['Skipped one (not done)']);
    expect(s.itemsOpen).toBe(1);
  });
});

describe('goalItemState', () => {
  // The one reading of status 'missed', shared by the coach card and the chat.
  it('reads missed on a ticked item as late and on an open one as skipped', () => {
    expect(goalItemState({ isComplete: true, status: 'done' })).toBe('done');
    expect(goalItemState({ isComplete: true, status: 'missed' })).toBe('late');
    expect(goalItemState({ isComplete: false, status: 'missed' })).toBe('skipped');
    expect(goalItemState({ isComplete: false, status: 'todo' })).toBe('not done');
    expect(goalItemState({ isComplete: false })).toBe('not done');
  });
});

describe('dayStates', () => {
  const routines = [{ date: '05-10-2026', tasklist: [task({ ticked: false })] }];

  it('counts today as ticked for the post-tick card', () => {
    expect(dayStates({ routines, taskRef: 'r1', today: '05-10-2026' })[0].state).toBe('onTime');
  });

  it('reads today as the document has it when justTicked is false', () => {
    expect(dayStates({
      routines, taskRef: 'r1', today: '05-10-2026', justTicked: false,
    })[0].state).toBe('missed');
  });
});

const CARD = {
  title: 'Three sessions, one habit',
  spark: 'Every tick this week is a vote for the person who trains without a reminder.',
  action: 'Swap the last set of squats for a slow tempo set and feel the difference.',
};
const reply = (card, model = 'm') => ({ content: JSON.stringify(card), model });

describe('the card', () => {
  const strategy = { numbers: new Set(['3', '42']) };

  it('reads the first JSON object out of a chatty reply and strips markdown', () => {
    expect(parseCard('Sure!\n```json\n{"title":"**Big** day.","spark":"a","action":"b"}\n```'))
      .toEqual({ title: 'Big day', spark: 'a', action: 'b' });
    expect(parseCard('no json here')).toBeNull();
  });

  it('accepts a card that keeps to the brief', () => {
    expect(validateCard(CARD, strategy)).toEqual([]);
  });

  it('names every problem so the retry can fix it', () => {
    const problems = validateCard({
      title: 'This title is far too long to read',
      spark: 'Keep it up, 97 days of momentum.',
      action: '',
    }, strategy);
    expect(problems).toEqual(expect.arrayContaining([
      'title has 8 words, the limit is 6',
      'action is empty',
      expect.stringMatching(/stock phrase/),
      'uses numbers not in the facts: 97',
    ]));
  });

  it('refuses an action that repeats an earlier card', () => {
    const earlier = [formatCard(CARD)];
    expect(validateCard(CARD, strategy, earlier)).toContain('the action repeats an earlier card, so give a different idea');
  });

  it('stores title, spark and the next-time action on three lines', () => {
    expect(formatCard(CARD)).toBe(`${CARD.title}\n${CARD.spark}\nNext time: ${CARD.action}`);
  });
});

describe('generateRoutineInsight', () => {
  const summary = summariseRoutineHistory({ routines: [], goals: [], taskRef: 'r1' });
  beforeEach(() => completeChat.mockReset());

  it('returns the validated card and the strategy it was written from', async () => {
    completeChat.mockResolvedValueOnce(reply(CARD, 'm'));
    await expect(generateRoutineInsight({ summary, routineName: 'Jog' }))
      .resolves.toEqual({ text: formatCard(CARD), model: 'm', strategy: 'first/twist' });
  });

  it('sends the strategy brief, not raw statistics, and shows earlier cards', async () => {
    completeChat.mockResolvedValueOnce(reply(CARD));
    await generateRoutineInsight({
      summary, routineName: 'Jog', previous: ['Old title\nOld spark.\nNext time: Run hills.'],
    });
    const [[messages, options]] = completeChat.mock.calls;
    expect(options).toMatchObject({ models: [DEFAULT_INSIGHT_MODEL], temperature: 1 });
    const [system, user] = messages;
    expect(system.content).toMatch(/Answer with JSON only/);
    expect(user.content).toMatch(/^Routine: Jog\nHOOK: .+\nLEVER \(for the NEXT session\): .+/);
    expect(user.content).toMatch(/do not repeat them\):\n- Old title \/ Old spark\. \/ Next time: Run hills\./);
  });

  it('sends the problems back once and accepts the corrected card', async () => {
    completeChat
      .mockResolvedValueOnce({ content: 'not json', model: 'm' })
      .mockResolvedValueOnce(reply(CARD, 'm'));
    const result = await generateRoutineInsight({ summary, routineName: 'Jog' });
    expect(result.text).toBe(formatCard(CARD));
    const retry = completeChat.mock.calls[1][0];
    expect(retry[retry.length - 1].content).toMatch(/^Fix these and answer with the JSON again: the answer was not the JSON object/);
  });

  it('moves to the free roster when the chosen model is unavailable', async () => {
    completeChat
      .mockRejectedValueOnce(new Error('402 credits'))
      .mockResolvedValueOnce(reply(CARD, 'free:model'));
    const result = await generateRoutineInsight({ summary, routineName: 'Jog' });
    expect(result.model).toBe('free:model');
    expect(completeChat.mock.calls[1][1].models).toBeUndefined();
  });

  it('writes the same strategy without a model when nothing usable comes back', async () => {
    completeChat.mockRejectedValue(new Error('down'));
    const { text, model } = await generateRoutineInsight({ summary, routineName: 'Jog' });
    expect(model).toBeNull();
    const [title, spark, action] = text.split('\n');
    expect(title).toBe('Jog is on the board');
    expect(spark).toMatch(/first check-in/);
    expect(action).toMatch(/^Next time: /);
    completeChat.mockReset();
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
    expect(s.moment).toEqual({ tickedAt: '20:29', windowEnd: '21:00', minutesLeft: 31 });
    expect(s.plan.find((r) => r.current).name).toBe('Workout');
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

  it('records the previous scheduled session, skipping rest days', () => {
    // 06-10 was ticked; the rest day on 05-10 does not count as a session.
    expect(s.lastBefore).toBe('onTime');
  });

  it('counts today even before the tick reaches the document', () => {
    const fresh = summariseRoutineHistory({
      routines: [day('07-10-2026', { ticked: false })], goals: [], taskRef: 'r1', today: '07-10-2026',
    });
    expect(fresh).toMatchObject({ todayState: 'onTime', streak: 1, showedUp: 1 });
  });

  it('hands the model the target within reach', () => {
    expect(s.milestone).toBe('2 more days beats your best run of 4');
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
