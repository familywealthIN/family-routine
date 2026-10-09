const { datesBetween, summariseTiming } = require('./routineTiming');

describe('routineTiming', () => {
  const routines = [
    {
      date: '06-10-2026',
      tasklist: [
        { _id: 'b', name: 'Workout', time: '19:30', ticked: true, passed: true },
        { _id: 'a', name: 'Wake Up', time: '06:00', ticked: true, passed: false },
        { _id: 'c', name: 'Reading', time: '21:00' },
      ],
    },
    { date: '07-10-2026', skip: true, tasklist: [{ _id: 'a', name: 'Wake Up', time: '06:00', passed: true }] },
    {
      date: '08-10-2026',
      tasklist: [
        { _id: 'a', name: 'Wake Up Early', time: '05:30', ticked: true },
        { _id: 'b', name: 'Workout', time: '19:30', passed: true },
        { _id: 'c', name: 'Reading', time: '21:00' },
      ],
    },
  ];

  it('lists every date of the range, capped at a year', () => {
    expect(datesBetween('30-09-2026', '02-10-2026')).toEqual(['30-09-2026', '01-10-2026', '02-10-2026']);
    expect(datesBetween('02-10-2026', '01-10-2026')).toEqual([]);
    expect(datesBetween('01-01-2020', '31-12-2030')).toHaveLength(366);
  });

  it('counts on time, late, missed and still-to-come check-ins', () => {
    const t = summariseTiming({
      routines, startDate: '05-10-2026', endDate: '08-10-2026', today: '08-10-2026',
    });
    // 06-10: on time, late, and an untouched routine on a day that is over.
    // 07-10: a rest day counts for nothing. 08-10: on time, missed, pending.
    expect(t).toMatchObject({
      onTime: 2, late: 1, missed: 2, pending: 1,
    });
    expect(t.days.map((d) => d.date)).toEqual(['05-10-2026', '06-10-2026', '07-10-2026', '08-10-2026']);
    expect(t.days[2]).toMatchObject({ skip: true, onTime: 0, slots: [] });
    expect(t.days[1].slots.map((s) => [s.time, s.state]))
      .toEqual([['06:00', 'onTime'], ['19:30', 'late'], ['21:00', 'missed']]);
    expect(t.days[3].slots.map((s) => s.state)).toEqual(['onTime', 'missed', 'pending']);
  });

  it('rolls each routine up under its newest name and time', () => {
    const t = summariseTiming({
      routines, startDate: '06-10-2026', endDate: '08-10-2026', today: '08-10-2026',
    });
    expect(t.routines).toEqual([
      {
        id: 'a', name: 'Wake Up Early', time: '05:30', onTime: 2, late: 0, missed: 0, pending: 0,
      },
      {
        id: 'b', name: 'Workout', time: '19:30', onTime: 0, late: 1, missed: 1, pending: 0,
      },
      {
        id: 'c', name: 'Reading', time: '21:00', onTime: 0, late: 0, missed: 1, pending: 1,
      },
    ]);
  });
});
