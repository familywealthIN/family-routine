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
    day('18-10-2026', { ticked: true }), // seven days back: outside the week
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

  it('reads today and the six days before it', () => {
    const dates = chatWeekDates('25-10-2026');
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe('25-10-2026');
    expect(dates[6]).toBe('19-10-2026');
  });

  it('counts the week so the model never has to', () => {
    expect(text.split('\n')[0]).toBe('Last 7 days, today included: 2 of 4 scheduled sessions done'
      + ' (1 on time, 1 late), 2 missed; checklist items 1 ticked (0 of them missed and ticked late), 0 missed and not ticked, 1 left open.');
  });

  it('writes one line per day, newest first, starting today', () => {
    const lines = text.split('\n').filter((line) => line.startsWith('- '));
    expect(lines).toEqual([
      '- Today, Sun 25 Oct: not done yet',
      '- Sat 24 Oct: done on time · Draft pricing page (done), Email beta users (not done)',
      '- Fri 23 Oct: done late',
      '- Thu 22 Oct: missed',
      '- Wed 21 Oct: not scheduled',
      '- Tue 20 Oct: rest day',
      '- Mon 19 Oct: app not opened',
    ]);
  });

  it('calls today missed only once its window has closed untouched', () => {
    const closed = weekDigest({
      routines: [day('25-10-2026', { ticked: false, passed: true })], taskRef: 'r1', today: '25-10-2026',
    });
    expect(closed).toMatch(/^- Today, Sun 25 Oct: missed$/m);
  });

  it('names the goals the routine feeds', () => {
    expect(text).toMatch(/^This routine feeds: week goal "Ship the site" \(open\)\.$/m);
  });

  it('says nothing for a routine with no history', () => {
    expect(weekDigest({
      routines: [], goals: [], taskRef: 'r1', today: '25-10-2026',
    })).toBe('');
  });
});

describe('weekDigest on the last day of a week goal', () => {
  // Beta run 25-Oct-2026 retry, Day 7 (Sat 7 Nov): three items ticked on later
  // days, one marked missed through the chat, and the week goal at 15 / 16.
  // The chat answered "none late, none skipped, 1 milestone".
  const WEEK = ['01-11-2026', '02-11-2026', '03-11-2026', '04-11-2026', '05-11-2026', '06-11-2026', '07-11-2026'];
  const routines = WEEK.map((date) => ({ date, tasklist: [{ _id: 'r1', ticked: true }] }));
  const item = (body, isComplete, status = isComplete ? 'done' : 'todo') => ({
    taskRef: 'r1', goalRef: 'wk1', body, isComplete, status,
  });
  const goals = [
    { date: '01-11-2026', goalItems: [item('Plan the triage', true), item('List the open bugs', true)] },
    { date: '02-11-2026', goalItems: [item('Draft triage summary', true, 'missed'), item('Sort the crashes', true)] },
    { date: '03-11-2026', goalItems: [item('Write the crash fix notes', true, 'missed'), item('Fix the crash', true)] },
    {
      date: '04-11-2026',
      goalItems: [item('Stabilization', true, 'missed'), item('Reply to the beta testers thread', false, 'missed')],
    },
    { date: '05-11-2026', goalItems: [item('Cut the RC', true), item('Smoke-test the RC', true)] },
    { date: '06-11-2026', goalItems: [item('Write the changelog', true), item('Freeze the branch', true)] },
    {
      date: '07-11-2026',
      goalItems: [
        item('Publish Release Notes & Beta Close', true), item('Tag the 1.2.4 build', true),
        item('Publish the release notes', true), item('Post the announcement', true),
      ],
    },
  ];
  const weekGoal = (isComplete) => [{
    period: 'week',
    goalItems: [{
      _id: 'wk1', taskRef: 'r1', body: 'Close out 1.2.4 Beta Release', isComplete,
    }],
  }];
  const digest = (overrides = {}) => weekDigest({
    routines, goals, periodGoals: weekGoal(true), weekDates: WEEK, taskRef: 'r1', today: '07-11-2026', ...overrides,
  });

  it('names the items finished late and the items skipped', () => {
    const text = digest();
    expect(text).toContain('Missed, ticked late: Stabilization (Wed 4 Nov), Write the crash fix notes (Tue 3 Nov),'
      + ' Draft triage summary (Mon 2 Nov).');
    expect(text).toContain('Missed, not ticked: Reply to the beta testers thread (Wed 4 Nov).');
    expect(text).toContain('- Wed 4 Nov: done on time · Stabilization (missed, ticked late),'
      + ' Reply to the beta testers thread (missed, not ticked)');
    expect(text.split('\n')[0]).toMatch(/checklist items 15 ticked \(3 of them missed and ticked late\), 1 missed and not ticked, 0 left open\.$/);
  });

  it("includes today's items", () => {
    expect(digest()).toContain('- Today, Sat 7 Nov: done on time · Publish Release Notes & Beta Close (done),'
      + ' Tag the 1.2.4 build (done), Publish the release notes (done), Post the announcement (done)');
  });

  it("states the week goal's milestone tally as the app counts it", () => {
    expect(digest()).toContain('This routine feeds: week goal "Close out 1.2.4 Beta Release"'
      + ' (15 of 16 milestones, done).');
  });

  it('calls the week done at the threshold, however many more were planned', () => {
    // Five met of eleven, not yet ticked on the document: still done (5 / 3 / 6 rule).
    const five = [
      goals[0],
      goals[1],
      { date: '03-11-2026', goalItems: [item('Write the crash fix notes', true, 'missed'), item('Fix the crash', false)] },
      { date: '04-11-2026', goalItems: [item('Stabilization', false)] },
      { date: '05-11-2026', goalItems: [item('Cut the RC', false), item('Smoke-test the RC', false)] },
      { date: '06-11-2026', goalItems: [item('Write the changelog', false), item('Freeze the branch', false)] },
    ];
    expect(digest({ goals: five, periodGoals: weekGoal(false) })).toContain('(5 of 11 milestones, done)');

    const four = [goals[0], goals[1], { date: '05-11-2026', goalItems: [item('Cut the RC', false)] }];
    expect(digest({ goals: four, periodGoals: weekGoal(false) }))
      .toContain('(4 of 5 milestones, open, needs 5 met)');
  });

  it("counts the week's later days and ignores milestones outside it, like autoCheckTaskPeriod", () => {
    const text = digest({
      today: '04-11-2026',
      periodGoals: weekGoal(false),
      goals: [
        goals[1],
        { date: '06-11-2026', goalItems: [item('Write the changelog', false)] }, // later this week
        { date: '31-10-2026', goalItems: [item('Last week', true)] }, // the week before
      ],
    });
    expect(text).toContain('(2 of 3 milestones, open, needs 5 met)');
  });
});
