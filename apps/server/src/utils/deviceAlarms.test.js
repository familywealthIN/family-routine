const fs = require('fs');
const path = require('path');
const {
  ALARM_REPEAT, MAX_ALARMS, BUTTONS, aiLevel, addDays, alarmKey, localToUtc, planDeviceAlarms,
} = require('./deviceAlarms');

const NY = 'America/New_York';
const yoga = {
  _id: 'r-yoga', name: 'Yoga', time: '07:00', notifyMode: 'alarm',
};
const reading = {
  _id: 'r-read', name: 'Reading', time: '21:30', notifyMode: 'notify',
};

// 30 Oct 2026, 06:00 in New York (EDT, UTC-4).
const now = new Date('2026-10-30T10:00:00Z');
const plan = (over = {}) => planDeviceAlarms({
  items: [yoga, reading], routines: [], today: '30-10-2026', timezone: NY, now, days: 3, ...over,
});

describe('localToUtc', () => {
  it('reads the wall clock of the zone, across a daylight-saving change', () => {
    expect(localToUtc('30-10-2026', '07:00', NY).toISOString()).toBe('2026-10-30T11:00:00.000Z');
    // US clocks go back on 1 Nov 2026: 07:00 is then UTC-5.
    expect(localToUtc('02-11-2026', '07:00', NY).toISOString()).toBe('2026-11-02T12:00:00.000Z');
    expect(localToUtc('30-10-2026', '07:00', 'Asia/Kolkata').toISOString()).toBe('2026-10-30T01:30:00.000Z');
  });

  it('maps legacy offset zones like the rest of the server', () => {
    expect(localToUtc('30-10-2026', '07:00', '+05:50').toISOString()).toBe('2026-10-30T01:30:00.000Z');
  });
});

describe('addDays', () => {
  it('crosses months and years', () => {
    expect(addDays('31-10-2026', 1)).toBe('01-11-2026');
    expect(addDays('31-12-2026', 1)).toBe('01-01-2027');
  });
});

describe('planDeviceAlarms', () => {
  it('rings alarm routines at their time and once more after, for each day', () => {
    const { alarms, through } = plan();
    expect(alarms.map((a) => [a.date, a.fireAt, a.repeat])).toEqual([
      ['30-10-2026', '2026-10-30T11:00:00.000Z', false],
      ['30-10-2026', '2026-10-30T11:05:00.000Z', true],
      ['31-10-2026', '2026-10-31T11:00:00.000Z', false],
      ['31-10-2026', '2026-10-31T11:05:00.000Z', true],
      ['01-11-2026', '2026-11-01T12:00:00.000Z', false],
      ['01-11-2026', '2026-11-01T12:05:00.000Z', true],
    ]);
    expect(ALARM_REPEAT).toBe(5);
    expect(alarms[0].title).toBe('Yoga');
    expect(alarmKey(alarms[0])).toBe('r-yoga@07:00');
    expect(alarms[1].title).toBe('Still on: Yoga');
    // The window: midnight after the last day.
    expect(through.toISOString()).toBe('2026-11-02T05:00:00.000Z');
  });

  it('leaves out what has passed, rest days, done routines and days without it', () => {
    const { alarms } = plan({
      now: new Date('2026-10-30T11:02:00Z'), // between today's alarm and its repeat
      routines: [
        { date: '31-10-2026', skip: true, tasklist: [{ _id: 'r-yoga' }] },
        { date: '01-11-2026', tasklist: [{ _id: 'r-read' }] },
      ],
    });
    expect(alarms.map((a) => a.fireAt)).toEqual(['2026-10-30T11:05:00.000Z']);

    const ticked = plan({ routines: [{ date: '30-10-2026', tasklist: [{ _id: 'r-yoga', ticked: true }] }] });
    expect(ticked.alarms.map((a) => a.date)).not.toContain('30-10-2026');
  });

  it('gives the plan\'s button for how much AI the routine has', () => {
    expect(plan().alarms[0]).toMatchObject({ button: 'DO_NOW', buttonTitle: 'Do now' });
    expect(plan({ levels: { 'r-yoga': 'agent' } }).alarms[0]).toMatchObject({ button: 'START_AGENT', buttonTitle: 'Start agent' });
    expect(plan({ levels: { 'r-yoga': 'context' } }).alarms[0]).toMatchObject({ button: 'BUILD_AGENT', buttonTitle: 'Build agent' });
    expect(aiLevel({ hasAgent: true, hasAiContext: true })).toBe('agent');
    expect(aiLevel({ hasAgent: false, hasAiContext: true })).toBe('context');
    expect(aiLevel({})).toBe('none');
  });

  it('keeps the nearest alarms under the cap, and through stops at the first left out', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      _id: `r${i}`, name: `R${i}`, time: `${String(8 + i).padStart(2, '0')}:00`, notifyMode: 'alarm',
    }));
    const { alarms, through } = planDeviceAlarms({
      items, routines: [], today: '30-10-2026', timezone: NY, now, days: 7,
    });
    // 20 a day: today and tomorrow fill the cap.
    expect(alarms).toHaveLength(MAX_ALARMS);
    expect(alarms[alarms.length - 1].fireAt).toBe('2026-10-31T21:05:00.000Z');
    // The first one left out: 08:00 on 1 Nov, after the clocks went back.
    expect(through.toISOString()).toBe('2026-11-01T13:00:00.000Z');
  });

  it('ignores routines without a usable time', () => {
    expect(plan({ items: [{ ...yoga, time: '' }, { ...yoga, time: '7am' }] }).alarms).toEqual([]);
  });
});

describe('buttons match the cron', () => {
  it('uses the same levels as apps/cron/src/cue/routineActions.js', () => {
    const cron = fs.readFileSync(path.join(__dirname, '../../../cron/src/cue/routineActions.js'), 'utf8');
    expect(cron).toMatch(/hasAgent\) return \{ level: 'agent'/);
    expect(cron).toMatch(/hasAiContext\) return \{ level: 'context'/);
    expect(Object.keys(BUTTONS).sort()).toEqual(['agent', 'context', 'none']);
  });

  it('names alarms the way the cron matches them (apps/cron/src/utils/push.js)', () => {
    const push = fs.readFileSync(path.join(__dirname, '../../../cron/src/utils/push.js'), 'utf8');
    // eslint-disable-next-line no-template-curly-in-string
    expect(push).toContain('const alarmKey = ({ routineId, time }) => `${routineId}@${time}`;');
    expect(alarmKey({ routineId: 'r1', time: '07:00' })).toBe('r1@07:00');
  });
});
