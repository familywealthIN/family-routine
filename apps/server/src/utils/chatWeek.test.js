const { chatWeekDates, weekDigest } = require('./chatWeek');

describe('weekDigest', () => {
  // Today is Sun 25-10-2026; r1 is the routine the chat belongs to.
  const day = (date, task, skip = false) => ({
    date, skip, tasklist: task ? [{ _id: 'r1', ...task }] : [],
  });
  const routines = [
    day('25-10-2026', { ticked: false }),
    day('24-10-2026', { ticked: true }),
    day('23-10-2026', { ticked: true, passed: true }),
    day('22-10-2026', { ticked: false, passed: true }),
    day('21-10-2026', null), // not on that day's list
    day('20-10-2026', { ticked: false }, true), // rest day
    // 19-10 has no document: the app was not opened
    day('18-10-2026', { ticked: true }),
    day('17-10-2026', { ticked: true }), // eight days back: outside the week
  ];
  const goals = [
    {
      date: '24-10-2026',
      goalItems: [
        { taskRef: 'r1', body: 'Draft pricing page', isComplete: true },
        { taskRef: 'r1', body: 'Email beta users', isComplete: false },
        { taskRef: 'other', body: 'Not this routine', isComplete: true },
      ],
    },
  ];
  const text = weekDigest({
    routines,
    goals,
    taskRef: 'r1',
    today: '25-10-2026',
    periodGoals: [{ period: 'week', goalItems: [{ taskRef: 'r1', body: 'Ship the site', isComplete: false }] }],
  });

  it('reads today and the seven days before it', () => {
    const dates = chatWeekDates('25-10-2026');
    expect(dates).toHaveLength(8);
    expect(dates[7]).toBe('18-10-2026');
  });

  it('counts the week so the model never has to', () => {
    expect(text.split('\n')[0]).toBe('Last 7 days: 3 of 5 scheduled sessions done (2 on time, 1 late),'
      + ' 2 missed; checklist items 1 done, 1 left open.');
  });

  it('writes one line per day, newest first, starting yesterday', () => {
    const lines = text.split('\n').filter((line) => line.startsWith('- '));
    expect(lines).toEqual([
      '- Sat 24 Oct: done on time · Draft pricing page (done), Email beta users (not done)',
      '- Fri 23 Oct: done late',
      '- Thu 22 Oct: missed',
      '- Wed 21 Oct: not scheduled',
      '- Tue 20 Oct: rest day',
      '- Mon 19 Oct: app not opened',
      '- Sun 18 Oct: done on time',
    ]);
  });

  it('names the goals the routine feeds', () => {
    expect(text).toMatch(/This routine feeds: week goal "Ship the site" \(open\)\.$/);
  });

  it('says nothing for a routine with no history', () => {
    expect(weekDigest({
      routines: [], goals: [], taskRef: 'r1', today: '25-10-2026',
    })).toBe('');
  });
});
