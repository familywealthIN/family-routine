const {
  briefSteps, hooks, levers, diagnose, fallbackMessage,
} = require('./insightStrategy');

/** A summary as summariseRoutineHistory returns it, with only what a case needs. */
const summary = (over = {}) => ({
  days: 10,
  onTime: 6,
  late: 1,
  missed: 2,
  skipped: 0,
  showedUp: 7,
  streak: 1,
  bestStreak: 4,
  thisWeek: 3,
  lastWeek: 3,
  todayState: 'onTime',
  todayItems: [],
  topActivities: [],
  linked: [],
  plan: [],
  missedToday: [],
  moment: {},
  lastBefore: 'onTime',
  milestone: '3 more days beats your best run of 4',
  weekday: 'Thursday',
  bestWeekday: null,
  ...over,
});

describe('hooks: why this tick matters', () => {
  it('celebrates a first check-in and nothing else', () => {
    expect(hooks(summary({ showedUp: 1 })).map((h) => h.key)).toEqual(['first']);
  });

  it('puts a record run first, and only when it IS the record', () => {
    expect(hooks(summary({ streak: 5, bestStreak: 5 }))[0]).toMatchObject({
      key: 'record',
      evidence: '5 check-ins in a row, the longest run in the last 30 days',
    });
    expect(hooks(summary({ streak: 3, bestStreak: 5 })).map((h) => h.key)).not.toContain('record');
  });

  it('calls a tick after a missed session a comeback', () => {
    expect(hooks(summary({ lastBefore: 'missed' }))[0].key).toBe('comeback');
    expect(hooks(summary({ lastBefore: 'absent' }))[0].key).toBe('comeback');
  });

  it('chases the best run with the exact gap', () => {
    const chase = hooks(summary({ streak: 3, bestStreak: 5 })).find((h) => h.key === 'chase');
    expect(chase.evidence).toBe('3 in a row, 3 more sessions beats the best run of 5');
  });

  it('only claims a better week when last week had check-ins too', () => {
    expect(hooks(summary({ thisWeek: 4, lastWeek: 2 })).map((h) => h.key)).toContain('weekUp');
    expect(hooks(summary({ thisWeek: 4, lastWeek: 0 })).map((h) => h.key)).not.toContain('weekUp');
  });
});

describe('levers: the one change for next time', () => {
  it('makes up a missed routine inside a later one today first', () => {
    const [top] = levers(summary({
      missedToday: ['Morning Pages'],
      plan: [
        { time: '06:30', name: 'Morning Pages', state: 'missed' },
        { time: '19:30', name: 'Workout', state: 'done', current: true },
        { time: '22:00', name: 'Night Routine', state: 'not yet' },
      ],
    }));
    expect(top.key).toBe('compensate');
    expect(top.hint).toMatch(/"Morning Pages".*"Night Routine" at 22:00/);
  });

  it('turns an open checklist item and spare minutes into a finish', () => {
    const [top] = levers(summary({
      todayItems: ['Full body workout (not done)'],
      moment: { minutesLeft: 46 },
    }));
    expect(top.key).toBe('finish');
    expect(top.hint).toMatch(/"Full body workout" is still open with 46 minutes left/);
  });

  it('fixes timing when the routine keeps slipping', () => {
    const keys = levers(summary({ days: 10, late: 3, missed: 2 })).map((l) => l.key);
    expect(keys).toContain('timing');
  });

  it('progresses the activity done most', () => {
    const lever = levers(summary({ topActivities: [{ body: 'Deadlifts', count: 5 }] }))
      .find((l) => l.key === 'progress');
    expect(lever.hint).toMatch(/"Deadlifts" was done 5 times/);
  });

  it('uses the area\'s next step when there is one', () => {
    const lever = levers(summary(), { brief: 'Health\n- Book a physio check\n- Walk 8k steps daily' })
      .find((l) => l.key === 'area');
    expect(lever.hint).toMatch(/"Book a physio check"/);
  });

  it('always has a twist to fall back on', () => {
    expect(levers(summary()).map((l) => l.key)).toContain('twist');
  });
});

describe('diagnose', () => {
  // The screenshot that started this: Workout ticked with 46 minutes left,
  // 6 check-ins this week against 5, "Full body workout" still open. The old
  // message recited those numbers; the strategy now turns them into a reason
  // and a move.
  const s = summary({
    thisWeek: 6,
    lastWeek: 5,
    todayItems: ['Full body workout (not done)'],
    moment: { minutesLeft: 46 },
    linked: [{ period: 'week', body: 'Train 5 times', done: false }],
  });

  it('picks one hook and one lever, with the evidence as facts', () => {
    const strategy = diagnose(s);
    expect(strategy.hook.key).toBe('weekUp');
    expect(strategy.lever.key).toBe('finish');
    expect(strategy.facts[0]).toBe('6 check-ins this week against 5 last week');
    expect(strategy.facts).toContain('this routine feeds: week goal "Train 5 times" (open)');
    expect(strategy.alternatives[0].key).toBe('goal');
  });

  it('collects every number the writer may quote', () => {
    const { numbers } = diagnose(s);
    ['6', '5', '46'].forEach((n) => expect(numbers.has(n)).toBe(true));
    expect(numbers.has('64')).toBe(false);
  });

  it('writes a complete card without a model', () => {
    const card = fallbackMessage(diagnose(s), 'Workout');
    expect(card).toEqual({
      title: 'A stronger week',
      spark: '6 check-ins this week against 5 last week.',
      action: 'Use the 46 minutes left for a short "Full body workout".',
      when: 'now',
    });
  });
});

describe('briefSteps', () => {
  it('reads list lines as steps and skips headings and long prose', () => {
    expect(briefSteps('Next steps:\n1. Draft the intro\n- x\n* Ship v2 to beta\nA very long paragraph that goes on and on well past sixteen words so it cannot be a step at all here.'))
      .toEqual(['Draft the intro', 'Ship v2 to beta']);
  });
});
