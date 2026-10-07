jest.mock('./chatApi', () => ({ completeChat: jest.fn() }));

const { completeChat } = require('./chatApi');
const {
  previousDates,
  summariseRoutineHistory,
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

  it('fallback cites the in-time record when there is history', () => {
    const s = { ...summary, days: 10, onTime: 4, late: 3, missed: 3, itemsDone: 2, itemsOpen: 5 };
    const text = fallbackInsight(s, 'Jog');
    expect(text).toMatch(/in time on 4 of the last 10 days \(40%\)/);
    expect(text.match(/[.!?](\s|$)/g)).toHaveLength(3);
  });
});
