const {
  absence, planMissedEmail, emailCopy, historyDates, HISTORY_DAYS,
} = require('./missedDays');

const TODAY = '29-10-2026'; // a Thursday
const day = (n) => historyDates(TODAY, 40)[n]; // n days before today
const tick = (n, extra = {}) => ({ date: day(n), tasklist: [{ ticked: true }], ...extra });
const open = (n, extra = {}) => ({ date: day(n), tasklist: [{ ticked: false }], ...extra });

const PREFS = { missedEmail: true, morningTime: '07:00' };
const ITEMS = [
  { name: 'Morning run', time: '06:30', points: 20, steps: [{ name: 'Shoes by the door' }] },
  { name: 'Read', time: '22:00', points: 5, steps: [{ name: 'Open the book' }] },
];
// Ticked days 4..10 before today, nothing since: missed 1, 2 and 3 days ago.
const ACTIVE = [4, 5, 6, 7, 8, 9, 10].map((n) => tick(n));
const plan = (over = {}) => planMissedEmail({
  today: TODAY,
  nowMinute: 10 * 60 + 5,
  prefs: PREFS,
  name: 'Asha Rao',
  items: ITEMS,
  routines: ACTIVE,
  sentKeys: new Set(),
  ...over,
});

describe('absence', () => {
  it('counts the days after the last tick and before today', () => {
    expect(absence(ACTIVE, TODAY)).toEqual({ lastTick: day(4), missed: 3, activeDays: 7 });
  });

  it('does not count rest days, and an unticked day doc is still a missed day', () => {
    expect(absence([...ACTIVE, open(2), open(1, { skip: true })], TODAY).missed).toBe(2);
  });

  it('only counts ticks inside the 14 days up to the last one as activity', () => {
    expect(absence([tick(4), tick(17), tick(18), tick(30)], TODAY).activeDays).toBe(2);
  });

  it('is null for someone who never ticked anything', () => {
    expect(absence([open(1), open(5)], TODAY)).toBeNull();
  });
});

describe('planMissedEmail', () => {
  it('emails an active person on the third missed day, keyed on the last tick', () => {
    const out = plan();
    expect(out).toMatchObject({ key: `email:missed:${day(4)}`, kind: 'email-missed', missed: 3 });
    expect(out.subject).toBe('3 days off — pick up with Read');
  });

  it('starts from the smallest routine and its first step', () => {
    const { text, html } = plan();
    expect(text).toContain('Hi Asha,');
    expect(text).toContain('Start small: Read at 22:00. First step: Open the book');
    expect(text).toContain('https://routine.familywealth.in/settings/notifications');
    expect(html).toContain('href="https://routine.familywealth.in/home"');
  });

  it('waits until three days are missed, and stops after five', () => {
    expect(plan({ routines: [3, 4, 5, 6].map((n) => tick(n)) })).toBeNull(); // 2 missed
    expect(plan({ routines: [6, 7, 8, 9].map((n) => tick(n)) })).toMatchObject({ missed: 5 });
    expect(plan({ routines: [7, 8, 9, 10].map((n) => tick(n)) })).toBeNull(); // 6 missed
  });

  it('skips people who were not active: fewer than 3 ticked days', () => {
    expect(plan({ routines: [tick(4), tick(5)] })).toBeNull();
  });

  it('is sent once per absence', () => {
    expect(plan({ sentKeys: new Set([`email:missed:${day(4)}`]) })).toBeNull();
    expect(plan({ sentKeys: new Set(['email:missed:01-01-2026']) })).not.toBeNull();
  });

  it('respects the setting and the morning-relative window (10:00–13:00 by default)', () => {
    expect(plan({ prefs: { ...PREFS, missedEmail: false } })).toBeNull();
    expect(plan({ nowMinute: 9 * 60 + 59 })).toBeNull();
    expect(plan({ nowMinute: 12 * 60 + 59 })).not.toBeNull();
    expect(plan({ nowMinute: 13 * 60 })).toBeNull();
    expect(plan({ prefs: { ...PREFS, morningTime: '09:00' }, nowMinute: 11 * 60 })).toBeNull();
    expect(plan({ prefs: { ...PREFS, morningTime: '09:00' }, nowMinute: 12 * 60 })).not.toBeNull();
  });

  it('needs routines to point at', () => {
    expect(plan({ items: [] })).toBeNull();
  });

  it('loads enough history to see activity before the longest absence', () => {
    expect(HISTORY_DAYS).toBeGreaterThanOrEqual(5 + 14);
  });
});

describe('emailCopy', () => {
  it('escapes routine names in the HTML and falls back without a step or name', () => {
    const { text, html } = emailCopy({
      name: '', missed: 4, lastTick: day(5), item: { name: '<b>Yoga</b> & stretch' }, step: null,
    });
    expect(text).toMatch(/^Hi,/);
    expect(text).toContain('Start small: <b>Yoga</b> & stretch. Two minutes counts.');
    expect(html).toContain('&lt;b&gt;Yoga&lt;/b&gt; &amp; stretch');
    expect(html).not.toContain('<b>Yoga</b>');
  });
});
