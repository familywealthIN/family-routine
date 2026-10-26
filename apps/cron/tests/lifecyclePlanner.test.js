const { planNotifications, DAILY_CAP } = require('../src/lifecycle/planner');
const { withDefaults } = require('../src/lifecycle/prefs');
const { historyDates, toMinutes } = require('../src/cue/cueEngine');

const TZ = 'Asia/Kolkata';
const TODAY = '20-10-2026';
const NOW = new Date('2026-10-20T07:10:00+05:30');
const RUN = {
  _id: 'run', name: 'Run', time: '07:30', points: 10,
};
const READ = {
  _id: 'read', name: 'Read', time: '21:30', points: 5,
};
const day = (date, ticked = [], extra = {}) => ({
  date,
  tasklist: [RUN, READ].map((i) => ({ _id: i._id, ticked: ticked.includes(i._id) })),
  ...extra,
});
const past = (n, ticked) => historyDates(TODAY, n).slice(1).map((d) => day(d, ticked));

const base = (over = {}) => ({
  now: NOW,
  timezone: TZ,
  today: TODAY,
  nowMinute: toMinutes('07:10'),
  prefs: withDefaults({}),
  items: [RUN, READ],
  routines: past(5, ['run']),
  dayGoals: [],
  carryOver: [],
  weekGoals: [],
  chats: [],
  sentKeys: new Set(),
  sentToday: 0,
  ...over,
});
const kinds = (list) => list.map((n) => n.kind);
// The beta account's day: three routines close before 07:00 (time + 30 min).
const DAY = [
  ['wake', 'Wake Up', '06:00'], ['jog', 'Jogging', '06:15'], ['med', 'Meditation', '06:40'],
  ['work', 'Start Work', '09:00'], ['wind', 'Wind-down', '11:30'], ['sleep', 'Sleep Time', '23:00'],
].map(([_id, name, time]) => ({
  _id, name, time, points: 5,
}));
const fullDay = (ticked = [], items = DAY) => ({
  items,
  routines: [
    ...historyDates(TODAY, 3).slice(1).map((date) => ({ date, tasklist: items.map((i) => ({ _id: i._id, ticked: true })) })),
    { date: TODAY, tasklist: items.map((i) => ({ _id: i._id, ticked: ticked.includes(i._id) })) },
  ],
});
const only = (kind, list) => list.filter((n) => n.kind === kind);

describe('morning', () => {
  it('gives the day context inside the morning window', () => {
    const [n] = planNotifications(base());
    expect(n.kind).toBe('morning');
    expect(n.body).toMatch('2 routines today');
    expect(n.body).toMatch('first up: Run at 07:30');
    expect(n.body).toMatch('5-day Run run');
  });

  it('respects the window, the opt-out and the once-only key', () => {
    expect(planNotifications(base({ nowMinute: toMinutes('08:30') }))).toEqual([]);
    expect(planNotifications(base({ prefs: withDefaults({ morning: false }) }))).toEqual([]);
    expect(planNotifications(base({ sentKeys: new Set([`morning:${TODAY}`]) }))).toEqual([]);
  });

  it('says rest day on a skipped day', () => {
    const routines = [...past(3, ['run']), day(TODAY, [], { skip: true })];
    expect(planNotifications(base({ routines }))[0].title).toMatch('Rest day');
  });

  it('never names a routine whose tick window has closed as first up', () => {
    const at = (time, ticked, prefs = {}) => only('morning', planNotifications(base({
      ...fullDay(ticked), nowMinute: toMinutes(time), prefs: withDefaults(prefs),
    })))[0].body;
    expect(at('07:00')).toMatch('first up: Meditation at 06:40'); // closes 07:10
    expect(at('07:00', ['med'])).toMatch('first up: Start Work at 09:00');
    expect(at('08:15', [], { morningTime: '08:15' })).toMatch('first up: Start Work at 09:00');
    expect(at('07:11', [], { morningTime: '07:11' })).toMatch('first up: Start Work at 09:00');
  });

  it('drops the first-up clause when nothing is left to tick today', () => {
    const early = DAY.slice(0, 3);
    const [n] = only('morning', planNotifications(base({ ...fullDay([], early), nowMinute: toMinutes('07:15') })));
    expect(n.body).toMatch('3 routines today');
    expect(n.body).not.toMatch('first up');
  });

  it('follows the user\'s own morning time', () => {
    const prefs = withDefaults({ morningTime: '06:00' });
    expect(kinds(planNotifications(base({ prefs, nowMinute: toMinutes('06:05') })))).toEqual(['morning']);
  });
});

describe('plan', () => {
  const at = toMinutes('07:40');
  it('suggests open week tasks and yesterday\'s carry-over when nothing is planned', () => {
    const [n] = only('plan', planNotifications(base({
      nowMinute: at,
      carryOver: [{ body: 'Email Sam', isComplete: false }],
      weekGoals: [{ body: 'Draft report', isComplete: false }, { body: 'Done thing', isComplete: true }],
    })));
    expect(n.kind).toBe('plan');
    expect(n.body).toBe('Suggested: Email Sam · Draft report. Pick one to start.');
    expect(n.route).toBe('/goals');
  });

  it('stays quiet when the day is already planned or there is nothing to suggest', () => {
    expect(only('plan', planNotifications(base({ nowMinute: at, dayGoals: [{ body: 'x', isComplete: false }], weekGoals: [{ body: 'y' }] })))).toEqual([]);
    expect(only('plan', planNotifications(base({ nowMinute: at })))).toEqual([]);
  });
});

describe('evening progress', () => {
  it('reports done / total, points and what is still possible', () => {
    const routines = [...past(5, ['run']), day(TODAY, ['run'])];
    const [n] = planNotifications(base({ routines, nowMinute: toMinutes('21:05') }));
    expect(n.kind).toBe('evening');
    expect(n.title).toBe('Today: 1/2 routines');
    expect(n.body).toMatch('+10 pts');
    expect(n.body).toMatch('still time for Read');
  });

  it('never offers a routine whose window has closed as still to do', () => {
    const [n] = only('evening', planNotifications(base({ ...fullDay(), nowMinute: toMinutes('21:00') })));
    expect(n.title).toBe('Today: 0/6 routines');
    expect(n.body).toMatch('still time for Sleep Time');
    DAY.slice(0, 5).forEach((i) => expect(n.body).not.toMatch(i.name));
  });

  it('drops the still-time clause when every open routine is done or closed', () => {
    const [n] = only('evening', planNotifications(base({ ...fullDay(['sleep']), nowMinute: toMinutes('21:00') })));
    expect(n.title).toBe('Today: 1/6 routines');
    expect(n.body).not.toMatch('still time');
    expect(n.body).toMatch('tomorrow starts with Wake Up at 06:00');
  });

  it('celebrates a perfect day', () => {
    const routines = [...past(5, ['run']), day(TODAY, ['run', 'read'])];
    const [n] = planNotifications(base({ routines, nowMinute: toMinutes('21:05'), sentKeys: new Set() }))
      .filter((x) => x.kind === 'evening');
    expect(n.title).toBe('Perfect day 🎉 2/2');
  });
});

describe('streak celebration', () => {
  it('fires when today\'s tick makes a milestone, once', () => {
    const routines = [...past(6, ['run']), day(TODAY, ['run'])]; // 6 + today = 7
    const list = planNotifications(base({ routines, nowMinute: toMinutes('12:00') }));
    expect(kinds(list)).toEqual(['streak']);
    expect(list[0].title).toMatch('7-day streak: Run');
    expect(planNotifications(base({
      routines, nowMinute: toMinutes('12:00'), sentKeys: new Set([list[0].key]),
    }))).toEqual([]);
  });

  it('counts runs longer than the cue history (21 days)', () => {
    const routines = [...past(20, ['run']), day(TODAY, ['run'])];
    expect(planNotifications(base({ routines, nowMinute: toMinutes('12:00') }))[0].title).toMatch('21-day');
  });

  it('is held during quiet hours', () => {
    const routines = [...past(6, ['run']), day(TODAY, ['run'])];
    expect(planNotifications(base({ routines, nowMinute: toMinutes('23:00') }))).toEqual([]);
  });
});

describe('re-engagement (not using)', () => {
  const at = toMinutes('10:05');
  const awayFor = (days) => [day(historyDates(TODAY, days)[days], ['run'])];

  it('nudges at 2, 7 and 14 days away and only once per level', () => {
    expect(planNotifications(base({ routines: awayFor(2), nowMinute: at }))[0].title).toBe('Never miss twice');
    expect(planNotifications(base({ routines: awayFor(8), nowMinute: at }))[0].title).toBe('Fresh start?');
    const last = planNotifications(base({ routines: awayFor(20), nowMinute: at }))[0];
    expect(last.body).toMatch('last nudge');
    expect(planNotifications(base({ routines: awayFor(20), nowMinute: at, sentKeys: new Set([last.key]) }))).toEqual([]);
  });

  it('an away user gets no morning brief, an active one no re-engagement', () => {
    expect(planNotifications(base({ routines: awayFor(3) }))).toEqual([]);
    expect(planNotifications(base({ nowMinute: at }))).toEqual([]);
  });
});

describe('insights the user is unaware of', () => {
  const at = toMinutes('19:05');
  const insight = (daysAgo, text = 'Your best runs start before 7:40.') => ({
    taskRef: 'run', from: 'routine', icon: 'tips_and_updates', text, createdAt: new Date(NOW.getTime() - daysAgo * 86400000),
  });
  const daily = [...past(6, ['run']), day(TODAY, ['run'])];

  it('nudges a daily user who never opens the routine\'s insights', () => {
    const [n] = only('insights', planNotifications(base({
      routines: daily, nowMinute: at, chats: [insight(1), insight(2), insight(3, 'old')],
    })));
    expect(n.kind).toBe('insights');
    expect(n.title).toBe('Run: 3 insights waiting for you');
    expect(n.body).toBe('Your best runs start before 7:40.');
    expect(n.route).toBe('/home/run/insight?src=push');
  });

  it('stays quiet once they engage, or when they are not using it daily', () => {
    const chats = [insight(1), insight(2), insight(3)];
    const mine = { ...insight(1), from: 'me' };
    expect(only('insights', planNotifications(base({ routines: daily, nowMinute: at, chats: [...chats, mine] })))).toEqual([]);
    expect(only('insights', planNotifications(base({ routines: past(2, ['run']), nowMinute: at, chats })))).toEqual([]);
  });
});

it(`never sends more than ${DAILY_CAP} a day`, () => {
  const routines = [...past(6, ['run']), day(TODAY, ['run'])];
  expect(planNotifications(base({ routines, nowMinute: toMinutes('12:00'), sentToday: DAILY_CAP }))).toEqual([]);
});
