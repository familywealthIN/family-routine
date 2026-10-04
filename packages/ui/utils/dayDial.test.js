/* eslint-env jest */
/**
 * dayDial — the geometry and the derivation both halves of the Routines screen
 * read.
 *
 * What is locked here is everything a reader cannot verify by eye on a 240px
 * circle:
 *   1. minute 0 is at 12 o'clock and the day runs CLOCKWISE (6:00 on the right),
 *   2. an arc stops 3 minutes short of the next routine, and the LAST routine
 *      stops at 23:00 rather than midnight,
 *   3. the large-arc flag flips only past 720 minutes — get it wrong and a long
 *      arc silently draws the short way round,
 *   4. the "+ Add routine" row appears only on a gap of 3h or more, at the
 *      midpoint rounded to 10 minutes,
 *   5. the stepper moves in 10s and wraps through midnight; points clamp at 1
 *      and 50; a step at either bound does not move,
 *   6. the day's 100 points are shared across EVERY routine, and the routine
 *      being edited gets its own points added back so it cannot bound itself.
 */
const dial = require('./dayDial');

const {
  DAILY_POINTS_BUDGET,
  DAY_END,
  DIAL,
  arcPath,
  buildArcs,
  buildNowMarker,
  buildRows,
  centreContent,
  clampPoints,
  countLabel,
  currentIndex,
  durationLabel,
  fromMinutes,
  gapMidpoint,
  maxPointsFor,
  moveStep,
  nextStartAfter,
  remainingPoints,
  polarPoint,
  sortByTime,
  stepTime,
  stepsLabel,
  toMinutes,
  totalPoints,
  untilCaption,
  windowEnd,
} = dial;

const item = (id, time, over = {}) => ({
  id, name: id.toUpperCase(), time, points: 10, steps: [], tags: [], ...over,
});

/** 06:30 · 09:00 · 12:30 — a 3h30 gap sits between the last two. */
const DAY = [
  item('mp', '06:30', { name: 'Morning Pages', points: 10 }),
  item('sw', '09:00', { name: 'Start Work', points: 12, steps: [{ name: 'a' }, { name: 'b' }] }),
  item('lw', '12:30', { name: 'Lunch Walk', points: 8, steps: [{ name: 'walk' }] }),
];

describe('time parsing and labels', () => {
  it('reads HH:mm as minutes and writes it back', () => {
    expect(toMinutes('06:30')).toBe(390);
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('23:00')).toBe(DAY_END);
    expect(fromMinutes(390)).toBe('06:30');
    expect(fromMinutes(0)).toBe('00:00');
  });

  it('never yields NaN from junk — a NaN would blank every arc', () => {
    expect(toMinutes(null)).toBe(0);
    expect(toMinutes('nonsense')).toBe(0);
    expect(fromMinutes(undefined)).toBe('00:00');
  });

  it('wraps out-of-day minutes into the day, both directions', () => {
    expect(fromMinutes(1440)).toBe('00:00');
    expect(fromMinutes(1450)).toBe('00:10');
    expect(fromMinutes(-10)).toBe('23:50');
  });

  it('labels durations in hours and minutes, and never negatively', () => {
    expect(durationLabel(45)).toBe('45m');
    expect(durationLabel(60)).toBe('1h');
    expect(durationLabel(90)).toBe('1h 30m');
    expect(durationLabel(210)).toBe('3h 30m');
    // A routine started after 23:00 has no window left against DAY_END.
    expect(durationLabel(-30)).toBe('0m');
  });

  it('pluralises the counts the header and the chips print', () => {
    expect(countLabel(0)).toBe('0 routines');
    expect(countLabel(1)).toBe('1 routine');
    expect(countLabel(7)).toBe('7 routines');
    expect(stepsLabel(1)).toBe('1 step');
    expect(stepsLabel(3)).toBe('3 steps');
  });
});

describe('the angle mapping', () => {
  it('puts minute 0 at 12 o\'clock', () => {
    const p = polarPoint(0, DIAL.radius);
    expect(p.x).toBeCloseTo(120, 6);
    expect(p.y).toBeCloseTo(120 - DIAL.radius, 6);
  });

  it('runs clockwise: 06:00 is on the RIGHT, 18:00 on the left', () => {
    const six = polarPoint(6 * 60, DIAL.radius);
    expect(six.x).toBeCloseTo(120 + DIAL.radius, 6);
    expect(six.y).toBeCloseTo(120, 6);

    const eighteen = polarPoint(18 * 60, DIAL.radius);
    expect(eighteen.x).toBeCloseTo(120 - DIAL.radius, 6);
    expect(eighteen.y).toBeCloseTo(120, 6);
  });

  it('puts noon at the bottom', () => {
    const noon = polarPoint(12 * 60, DIAL.radius);
    expect(noon.x).toBeCloseTo(120, 6);
    expect(noon.y).toBeCloseTo(120 + DIAL.radius, 6);
  });
});

describe('arc paths', () => {
  it('always sweeps clockwise and names the radius twice', () => {
    expect(arcPath(0, 360)).toBe('M 120.00 24.00 A 96 96 0 0 1 216.00 120.00');
  });

  it('flips largeArc only past 720 minutes', () => {
    expect(arcPath(0, 720)).toContain('A 96 96 0 0 1');
    expect(arcPath(0, 721)).toContain('A 96 96 0 1 1');
  });
});

describe('a routine\'s window', () => {
  it('ends at the next routine\'s start', () => {
    const sorted = sortByTime(DAY);
    expect(windowEnd(sorted, 0)).toBe(toMinutes('09:00'));
    expect(windowEnd(sorted, 1)).toBe(toMinutes('12:30'));
  });

  it('ends at 23:00 for the last routine of the day', () => {
    const sorted = sortByTime(DAY);
    expect(windowEnd(sorted, sorted.length - 1)).toBe(DAY_END);
  });
});

describe('buildArcs', () => {
  const sorted = sortByTime(DAY);

  it('insets each arc by 3 minutes at both ends', () => {
    const arcs = buildArcs(sorted);
    expect(arcs[0].d).toBe(arcPath(toMinutes('06:30') + 3, toMinutes('09:00') - 3));
  });

  it('runs the last arc to 23:00, inset', () => {
    const arcs = buildArcs(sorted);
    expect(arcs[2].d).toBe(arcPath(toMinutes('12:30') + 3, DAY_END - 3));
    // 12:33 -> 22:57 is 624 minutes, still under the 720 threshold.
    expect(arcs[2].d).toContain('A 96 96 0 0 1');
  });

  it('uses the large-arc flag once a window passes 12 hours', () => {
    const [arc] = buildArcs(sortByTime([item('solo', '06:00')]));
    // 06:03 -> 22:57 is 1014 minutes.
    expect(arc.d).toContain('A 96 96 0 1 1');
  });

  it('keeps a minimum 4-minute arc for back-to-back routines', () => {
    const sorted2 = sortByTime([item('a', '06:00'), item('b', '06:05')]);
    // start+3 = 363, next-3 = 362 — so the floor at start+3+4 applies.
    expect(buildArcs(sorted2)[0].d).toBe(arcPath(363, 367));
  });

  it('paints the routine containing now orange and the rest blue', () => {
    const arcs = buildArcs(sorted, { now: toMinutes('09:30') });
    expect(arcs.map((a) => a.color)).toEqual([DIAL.colorIdle, DIAL.colorNow, DIAL.colorIdle]);
  });

  it('thickens the selected arc and fades the others', () => {
    const arcs = buildArcs(sorted, { selectedId: 'sw' });
    expect(arcs[1].width).toBe(24);
    expect(arcs[1].opacity).toBe(1);
    expect(arcs[0].width).toBe(18);
    expect(arcs[0].opacity).toBe(DIAL.dimmedOpacity);
  });

  it('leaves every arc at full opacity when nothing is selected', () => {
    expect(buildArcs(sorted).every((a) => a.opacity === 1)).toBe(true);
  });
});

describe('currentIndex', () => {
  const sorted = sortByTime(DAY);

  it('finds the routine the clock is inside', () => {
    expect(currentIndex(sorted, toMinutes('06:30'))).toBe(0);
    expect(currentIndex(sorted, toMinutes('08:59'))).toBe(0);
    expect(currentIndex(sorted, toMinutes('09:00'))).toBe(1);
  });

  it('is -1 before the first start and after 23:00', () => {
    expect(currentIndex(sorted, toMinutes('05:00'))).toBe(-1);
    expect(currentIndex(sorted, DAY_END)).toBe(-1);
  });
});

describe('the NOW marker', () => {
  it('draws from r=80 to r=110 at the current minute', () => {
    const marker = buildNowMarker(0);
    expect(marker).toEqual({
      x1: '120.0', y1: '40.0', x2: '120.0', y2: '10.0',
    });
  });
});

describe('buildRows', () => {
  const sorted = sortByTime(DAY);

  it('prints each routine\'s window and duration', () => {
    const rows = buildRows(sorted);
    expect(rows[0].time).toBe('06:30');
    expect(rows[0].end).toBe('09:00');
    expect(rows[0].duration).toBe('2h 30m');
    expect(rows[2].end).toBe('23:00');
    expect(rows[2].duration).toBe('10h 30m');
  });

  it('offers "+ Add routine" only on a gap of 3 hours or more', () => {
    const rows = buildRows(sorted);
    // 06:30 -> 09:00 is 2h30: below the threshold.
    expect(rows[0].hasGap).toBe(false);
    // 09:00 -> 12:30 is exactly 3h30, and 12:30 -> 23:00 is 10h30.
    expect(rows[1].hasGap).toBe(true);
    expect(rows[2].hasGap).toBe(true);
  });

  it('treats exactly 180 minutes as long enough', () => {
    const rows = buildRows(sortByTime([item('a', '06:00'), item('b', '09:00'), item('c', '09:30')]));
    expect(rows[0].hasGap).toBe(true);
  });

  it('suggests the gap\'s midpoint, rounded to 10 minutes', () => {
    const rows = buildRows(sorted);
    // 09:00 + round(210/2/10)*10 = 09:00 + 110 = 10:50
    expect(rows[1].gapAt).toBe('10:50');
    expect(rows[1].gapAtMinutes).toBe(toMinutes('10:50'));
    expect(rows[1].gapLabel).toBe('3h 30m');
  });

  it('rounds the midpoint to the nearest 10, not down', () => {
    // 185 / 2 = 92.5 -> round(9.25) = 9 -> 90 minutes.
    expect(gapMidpoint(0, 185)).toBe(90);
    // 190 / 2 = 95 -> round(9.5) = 10 -> 100 minutes.
    expect(gapMidpoint(0, 190)).toBe(100);
  });

  it('marks now, the ends of the list, the selection and the flash', () => {
    const rows = buildRows(sorted, { now: toMinutes('13:00'), selectedId: 'mp', flashId: 'sw' });
    expect(rows.map((r) => r.isNow)).toEqual([false, false, true]);
    expect(rows[0].isFirst).toBe(true);
    expect(rows[2].isLast).toBe(true);
    expect(rows[0].selected).toBe(true);
    expect(rows[1].flash).toBe(true);
  });
});

describe('sortByTime', () => {
  it('re-sorts the timeline so a moved routine lands in its new slot', () => {
    const moved = DAY.map((r) => (r.id === 'lw' ? { ...r, time: '07:00' } : r));
    expect(sortByTime(moved).map((r) => r.id)).toEqual(['mp', 'lw', 'sw']);
  });

  it('places a new routine by its time, not at the end', () => {
    const added = [...DAY, item('nn', '07:15')];
    expect(sortByTime(added).map((r) => r.id)).toEqual(['mp', 'nn', 'sw', 'lw']);
  });

  it('drops repeated ids — a duplicate :key renders one routine twice', () => {
    const dupes = [item('mp', '06:30'), item('mp', '06:30'), item('sw', '09:00')];
    expect(sortByTime(dupes).map((r) => r.id)).toEqual(['mp', 'sw']);
  });

  it('drops entries with no id, and leaves the input alone', () => {
    const input = [item('a', '09:00'), { time: '06:00' }, null];
    expect(sortByTime(input).map((r) => r.id)).toEqual(['a']);
    expect(input).toHaveLength(3);
  });

  it('survives a non-array', () => {
    expect(sortByTime(undefined)).toEqual([]);
  });
});

describe('the dial centre', () => {
  const sorted = sortByTime(DAY);

  it('shows the day total with no selection', () => {
    expect(centreContent(sorted, { now: toMinutes('09:30') })).toEqual({
      over: 'TODAY',
      overColor: 'rgba(0,0,0,.45)',
      title: '30 points',
      sub: 'Now: Start Work',
    });
  });

  it('falls back to the routine count outside every window', () => {
    expect(centreContent(sorted, { now: toMinutes('04:00') }).sub).toBe('3 routines');
  });

  it('shows the selected routine\'s window, name, points and steps', () => {
    expect(centreContent(sorted, { selectedId: 'sw' })).toEqual({
      over: '09:00 – 12:30',
      overColor: DIAL.colorIdle,
      title: 'Start Work',
      sub: '+12 pts · 2 steps',
    });
  });

  it('runs the last routine\'s window to 23:00', () => {
    expect(centreContent(sorted, { selectedId: 'lw' }).over).toBe('12:30 – 23:00');
  });

  it('sums the points a full day is worth', () => {
    expect(totalPoints(DAY)).toBe(30);
    expect(totalPoints(null)).toBe(0);
  });
});

describe('the STARTS AT caption', () => {
  it('names the next routine\'s start and the span to it', () => {
    expect(untilCaption('09:00', DAY, 'sw')).toBe('Until 12:30 · 3h 30m');
  });

  it('ignores the routine being moved, so it cannot bound itself', () => {
    // Without the exclusion 12:30 would be "Until 12:30 · 0m".
    expect(untilCaption('12:30', DAY, 'lw')).toBe('Until 23:00 · 10h 30m');
  });

  it('runs to 23:00 when nothing follows', () => {
    expect(nextStartAfter(toMinutes('20:00'), DAY)).toBe(DAY_END);
    expect(untilCaption('20:00', DAY)).toBe('Until 23:00 · 3h');
  });

  it('takes minutes as readily as a clock string', () => {
    expect(untilCaption(toMinutes('09:00'), DAY, 'sw')).toBe('Until 12:30 · 3h 30m');
  });

  // E2E BUG-8: two routines at 06:00 — the row read "06:00 – 06:00 · 0m" while
  // the editor said "Until 06:15". Both now read the one schedule window.
  describe('when routines share a start time', () => {
    const TIED = [
      item('wake', '06:00', { name: 'Wake Up' }),
      item('water', '06:00', { name: 'Water' }),
      item('walk', '06:15', { name: 'Walk' }),
    ];

    it('agrees with the timeline row for every routine in the tie', () => {
      const rows = buildRows(sortByTime(TIED));
      rows.forEach((row) => {
        expect(untilCaption(row.time, TIED, row.id)).toBe(`Until ${row.end} · ${row.duration}`);
      });
      expect(untilCaption('06:00', TIED, 'wake')).toBe('Until 06:00 · 0m');
      expect(untilCaption('06:00', TIED, 'water')).toBe('Until 06:15 · 15m');
    });

    it('puts a new routine after the ones already at its time', () => {
      expect(untilCaption('06:00', TIED)).toBe('Until 06:15 · 15m');
    });
  });
});

describe('the 10-minute stepper', () => {
  it('moves by 10 in both directions', () => {
    expect(stepTime('09:00', 1)).toBe('09:10');
    expect(stepTime('09:00', -1)).toBe('08:50');
  });

  it('wraps forward past midnight', () => {
    expect(stepTime('23:50', 1)).toBe('00:00');
    expect(stepTime('23:55', 1)).toBe('00:05');
  });

  it('wraps backward past midnight', () => {
    expect(stepTime('00:00', -1)).toBe('23:50');
    expect(stepTime('00:05', -1)).toBe('23:55');
  });

  it('accepts minutes directly', () => {
    expect(stepTime(0, -1)).toBe('23:50');
  });
});

describe('points clamping', () => {
  it('clamps at 1 on the way down', () => {
    expect(clampPoints(2)).toBe(2);
    expect(clampPoints(1)).toBe(1);
    expect(clampPoints(0)).toBe(1);
    expect(clampPoints(-5)).toBe(1);
  });

  it('clamps at 50 on the way up', () => {
    expect(clampPoints(49)).toBe(49);
    expect(clampPoints(50)).toBe(50);
    expect(clampPoints(51)).toBe(50);
    expect(clampPoints(9999)).toBe(50);
  });

  it('never yields NaN — the server takes an Int', () => {
    expect(clampPoints('12')).toBe(12);
    expect(clampPoints('')).toBe(1);
    expect(clampPoints(undefined)).toBe(1);
    expect(clampPoints('abc')).toBe(1);
  });
});

describe('the day\'s shared points budget', () => {
  /** 100 points exactly, so "spent" and "one left" are both reachable. */
  const FULL = [item('a', '07:00', { points: 40 }), item('b', '12:00', { points: 60 })];

  it('is 100 a day across every routine, not per routine', () => {
    expect(DAILY_POINTS_BUDGET).toBe(100);
    // DAY is 10 + 12 + 8.
    expect(remainingPoints(DAY)).toBe(70);
    expect(remainingPoints(FULL)).toBe(0);
  });

  it('adds the edited routine\'s own points back — it cannot bound itself', () => {
    // Without the add-back, re-opening Start Work would see 70 left and then
    // refuse to save it back at the 12 it already has.
    expect(remainingPoints(DAY, 'sw')).toBe(82);
    expect(remainingPoints(FULL, 'b')).toBe(60);
    // Which means an untouched routine always fits: its own value <= remaining.
    expect(remainingPoints(FULL, 'a')).toBe(40);
  });

  it('spends from scratch for a new routine, and for an id that is not in the list', () => {
    expect(remainingPoints(DAY, '')).toBe(70);
    expect(remainingPoints(DAY, 'brand-new')).toBe(70);
  });

  it('reads an id loosely — a numeric Mongo id is still the same routine', () => {
    const numeric = [{ id: 7, time: '07:00', points: 25 }];
    expect(remainingPoints(numeric, 7)).toBe(100);
    expect(remainingPoints(numeric, '7')).toBe(100);
  });

  it('goes negative rather than lying when the stored day is already over', () => {
    const over = [item('a', '07:00', { points: 70 }), item('b', '12:00', { points: 60 })];
    expect(remainingPoints(over)).toBe(-30);
    // Editing one of them still only frees its OWN points.
    expect(remainingPoints(over, 'b')).toBe(30);
  });

  it('treats a missing, negative or unparseable points value as nothing', () => {
    expect(remainingPoints(null)).toBe(100);
    expect(remainingPoints([])).toBe(100);
    expect(remainingPoints([{ id: 'x' }, null])).toBe(100);
    // The original's `> 0 ?` guard: a stored -5 adds nothing back either.
    expect(remainingPoints([item('x', '07:00', { points: -5 })], 'x')).toBe(105);
    expect(remainingPoints([item('x', '07:00', { points: 'abc' })])).toBe(100);
  });
});

describe('the ceiling one routine\'s points stepper stops at', () => {
  it('is the lower of the per-routine 50 and what the day has left', () => {
    // 70 left, so 50 still binds first.
    expect(maxPointsFor(DAY)).toBe(50);
    // 62 spent elsewhere leaves 38, which now binds before 50 does.
    expect(maxPointsFor([item('a', '07:00', { points: 62 })])).toBe(38);
    expect(maxPointsFor([])).toBe(50);
  });

  it('reports an exhausted day raw, so a caller can say so instead of clamping', () => {
    expect(maxPointsFor([item('a', '07:00', { points: 100 })])).toBe(0);
    expect(maxPointsFor([item('a', '07:00', { points: 130 })])).toBe(-30);
  });

  it('lets the edited routine keep the points it already had', () => {
    const full = [item('a', '07:00', { points: 55 }), item('b', '12:00', { points: 45 })];
    // The day is spent, yet editing `b` can still save 45 back.
    expect(maxPointsFor(full)).toBe(0);
    expect(maxPointsFor(full, 'b')).toBe(45);
  });
});

describe('step reordering', () => {
  const steps = ['one', 'two', 'three'];

  it('swaps with the neighbour', () => {
    expect(moveStep(steps, 1, -1)).toEqual(['two', 'one', 'three']);
    expect(moveStep(steps, 1, 1)).toEqual(['one', 'three', 'two']);
  });

  it('is a no-op at the top — and returns the same array, so nothing flashes', () => {
    expect(moveStep(steps, 0, -1)).toBe(steps);
  });

  it('is a no-op at the bottom', () => {
    expect(moveStep(steps, 2, 1)).toBe(steps);
  });

  it('is a no-op for an index off the list', () => {
    expect(moveStep(steps, 9, -1)).toBe(steps);
    expect(moveStep(steps, -1, 1)).toBe(steps);
  });

  it('does not mutate the input', () => {
    moveStep(steps, 1, -1);
    expect(steps).toEqual(['one', 'two', 'three']);
  });
});
