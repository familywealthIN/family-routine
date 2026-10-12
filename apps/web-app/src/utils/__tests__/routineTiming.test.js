import {
  onTimeRate, drawerWindow, drawerTiming, weekdayPattern, timingBuckets, routineRows,
} from '../routineTiming';

const day = (date, counts = {}, extra = {}) => ({
  date, skip: false, onTime: 0, late: 0, missed: 0, pending: 0, slots: [], ...counts, ...extra,
});

describe('routineTiming (client)', () => {
  it('rates on time against what has landed, and knows unknown from 0%', () => {
    expect(onTimeRate({
      onTime: 3, late: 1, missed: 0, pending: 9,
    })).toBe(75);
    expect(onTimeRate({ pending: 4 })).toBeNull();
    expect(onTimeRate({ missed: 2 })).toBe(0);
  });

  it('reads two weeks ending today for the drawer', () => {
    expect(drawerWindow('09-10-2026')).toEqual({ startDate: '26-09-2026', endDate: '09-10-2026' });
  });

  it('gives the drawer today’s ribbon, the next one to come, and the week against the last', () => {
    const slots = [
      {
        id: 'a', name: 'Wake', time: '06:00', state: 'onTime',
      },
      {
        id: 'b', name: 'Work', time: '09:00', state: 'late',
      },
      {
        id: 'c', name: 'Gym', time: '19:30', state: 'pending',
      },
    ];
    const timing = {
      days: [
        day('28-09-2026', { onTime: 1, missed: 1 }), // last week: 50%
        day('05-10-2026', { onTime: 3, late: 1 }),
        day('09-10-2026', { onTime: 1, late: 1, pending: 1 }, { slots }),
      ],
    };
    expect(drawerTiming(timing, '09-10-2026')).toEqual({
      slots,
      skip: false,
      counts: {
        onTime: 1, late: 1, missed: 0, pending: 1,
      },
      nextIndex: 2,
      rate: 67,
      delta: 17,
    });
    expect(drawerTiming(null, '09-10-2026')).toBeNull();
  });

  it('lines the weekdays up Monday first and leaves rest days out', () => {
    const rows = weekdayPattern([
      day('05-10-2026', { onTime: 2 }), // Monday
      day('11-10-2026', { missed: 1 }), // Sunday
      day('06-10-2026', { missed: 5 }, { skip: true }),
    ]);
    expect(rows.map((r) => r.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(rows[0].rate).toBe(100);
    expect(rows[1].rate).toBeNull();
    expect(rows[6].rate).toBe(0);
  });

  it('draws a bar per routine on Day, per month on Year, per day otherwise', () => {
    const days = [
      day('30-09-2026', { onTime: 1 }),
      day('01-10-2026', { late: 2 }, {
        slots: [{
          id: 'a', name: 'Wake', time: '06:00', state: 'late',
        }],
      }),
    ];
    expect(timingBuckets('day', days)).toEqual([{
      key: 'a', label: '06:00', title: 'Wake · 06:00', onTime: 0, late: 1, missed: 0, pending: 0,
    }]);
    expect(timingBuckets('year', days).map((b) => [b.title, b.onTime, b.late]))
      .toEqual([['September', 1, 0], ['October', 0, 2]]);
    expect(timingBuckets('month', days).map((b) => b.label)).toEqual(['30', '1']);
  });

  it('puts the routines that slip most first, and the ones with nothing landed last', () => {
    const rows = routineRows([
      {
        id: 'a', time: '06:00', onTime: 4, late: 0, missed: 0,
      },
      {
        id: 'b', time: '19:30', onTime: 1, late: 1, missed: 2,
      },
      {
        id: 'c', time: '21:00', pending: 1,
      },
    ]);
    expect(rows.map((r) => [r.id, r.rate])).toEqual([['b', 25], ['a', 100], ['c', null]]);
  });
});
