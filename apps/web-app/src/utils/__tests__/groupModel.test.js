/* eslint-env jest */
/**
 * The Groups page's arithmetic (`packages/design/Groups.dc.html`).
 *
 * Three of these are the rules the design calls out as easy to get wrong:
 *  - the group pulse and BOTH of its sentences,
 *  - today's dot is not scored,
 *  - a routine on today that has not been reached is NOT a miss.
 */
const { TODAY_DOT_BG, WEEK_CELL } = require('@routine-notes/ui/constants/groups');
const {
  dayScore,
  memberDays,
  weekAverage,
  sevenDayDots,
  weekGrid,
  weekRoutineRows,
  nowLine,
  finishedWithinHour,
  memberStreak,
  groupPulse,
  NO_DATA_DOT_BG,
  NO_DATA_CELL_BG,
  sortMembers,
  otherNames,
  dayWindow,
} = require('../groupModel');

const TODAY = '10-09-2026';

// 06:30 + 09:00 + 12:30 + 18:00 = 50 points across four routines.
const ROUTINES = [
  { name: 'Morning Pages', time: '06:30', points: 10 },
  { name: 'Start Work', time: '09:00', points: 20 },
  { name: 'Lunch Walk', time: '12:30', points: 10 },
  { name: 'Family Dinner', time: '18:00', points: 10 },
];

/** `day('10-09-2026', '1100')` — one char per routine, '1' means ticked. */
const day = (date, bits) => ({
  id: `r-${date}`,
  date,
  tasklist: ROUTINES.map((routine, index) => ({
    ...routine, ticked: bits[index] === '1', passed: false, wait: false,
  })),
});

describe('dayScore — points-weighted, not a plain count', () => {
  it('weighs the 20-point routine twice as heavily as a 10-point one', () => {
    expect(dayScore(day(TODAY, '0100'))).toBe(40);
    expect(dayScore(day(TODAY, '1010'))).toBe(40);
    expect(dayScore(day(TODAY, '1111'))).toBe(100);
  });

  it('falls back to a ticked/total ratio when a day carries no points', () => {
    const noPoints = {
      date: TODAY,
      tasklist: [{ name: 'a', time: '07:00', ticked: true }, { name: 'b', time: '08:00' }],
    };
    expect(dayScore(noPoints)).toBe(50);
  });

  it('reads an absent or empty day as 0', () => {
    expect(dayScore(null)).toBe(0);
    expect(dayScore({ date: TODAY, tasklist: [] })).toBe(0);
  });
});

describe('the seven-day window', () => {
  it('ends on today and runs oldest first', () => {
    const window = dayWindow(TODAY);
    expect(window).toHaveLength(7);
    expect(window[0]).toBe('04-09-2026');
    expect(window[6]).toBe(TODAY);
  });

  it('marks a day with no routine document as having no data', () => {
    const days = memberDays([day(TODAY, '1111')], TODAY);
    expect(days[6].hasData).toBe(true);
    expect(days[0].hasData).toBe(false);
    expect(days[0].score).toBe(0);
  });
});

describe('sevenDayDots — today is the exception', () => {
  const days = memberDays([day('09-09-2026', '0000'), day(TODAY, '1000')], TODAY);
  const dots = sevenDayDots(days);

  it('gives today a flat blue tint and NO icon, because today is not scored yet', () => {
    expect(dots[6].bg).toBe(TODAY_DOT_BG);
    expect(dots[6].icon).toBe('');
    expect(dots[6].isToday).toBe(true);
  });

  it('still scores every day before today, icon and all', () => {
    expect(dots[5].bg).toBe('#e53935');
    expect(dots[5].icon).toBe('close');
  });

  it('shows a day with no routine document as neutral, never as a red miss', () => {
    // 04-09 .. 08-09 carry no document in this window.
    expect(dots[0].bg).toBe(NO_DATA_DOT_BG);
    expect(dots[0].icon).toBe('');
    expect(dots[0].title).toMatch(/nothing logged/);
  });

  it('bands at 70 and 40, not the old 70/33', () => {
    const banded = sevenDayDots(memberDays(
      [day('08-09-2026', '1101'), day('09-09-2026', '1010')],
      TODAY,
    ));
    // 40 of 50 = 80% -> green check; 20 of 50 = 40% -> orange remove.
    expect([banded[4].bg, banded[4].icon]).toEqual(['#4CAF50', 'check']);
    expect([banded[5].bg, banded[5].icon]).toEqual(['#FF9800', 'remove']);
  });
});

describe('weekGrid — "later today" must not read as missed', () => {
  // 10:00: Morning Pages and Start Work have been and gone; Lunch Walk and
  // Family Dinner have not been reached.
  const days = memberDays([day(TODAY, '1000')], TODAY);
  const grid = weekGrid(days, 10 * 60);
  const rowFor = (name) => grid.rows.find((row) => row.name === name);

  it('draws an unreached routine transparent with no ring of its own', () => {
    const cell = rowFor('Lunch Walk').cells[6];
    expect(cell.state).toBe('later');
    expect(cell.missed).toBe(false);
    expect(cell.bg).toBe(WEEK_CELL.laterBg);
    // The dashed ring is a border, drawn by the organism's `--later` class.
    expect(cell.ring).toBe(WEEK_CELL.noRing);
    expect(cell.title).toContain('later today');
  });

  it('still counts a routine whose time HAS passed today as missed', () => {
    const cell = rowFor('Start Work').cells[6];
    expect(cell.state).toBe('missed');
    expect(cell.missed).toBe(true);
    expect(cell.bg).toBe(WEEK_CELL.missedBg);
  });

  it('gives today’s column the inset blue ring on every scored cell', () => {
    expect(rowFor('Morning Pages').cells[6].ring).toBe(WEEK_CELL.todayRing);
    expect(rowFor('Morning Pages').cells[5].ring).toBe(WEEK_CELL.noRing);
  });

  it('labels the last column Today and totals every day', () => {
    expect(grid.dayHeads[6].label).toBe('Today');
    expect(grid.dayHeads[6].isToday).toBe(true);
    expect(grid.dayTotals).toHaveLength(7);
    expect(grid.dayTotals[6].value).toBe('20%');
  });

  it('draws a day with no routine document blank, not as missed cells', () => {
    // 04-09 .. 09-09 carry no document in this window.
    const cell = rowFor('Start Work').cells[5];
    expect(cell.state).toBe('nodata');
    expect(cell.missed).toBe(false);
    expect(cell.bg).toBe(NO_DATA_CELL_BG);
    expect(cell.icon).toBe('');
    expect(cell.title).toContain('nothing logged');
  });

  it('scores a no-data day as "–", never a fake 0%', () => {
    expect(grid.dayTotals[0].value).toBe('–');
    expect(grid.dayTotals[5].value).toBe('–');
    // A real 0% day still says 0%.
    const zero = weekGrid(memberDays([day('09-09-2026', '0000'), day(TODAY, '1000')], TODAY), 600);
    expect(zero.dayTotals[5].value).toBe('0%');
    expect(zero.rows[0].cells[5].state).toBe('missed');
  });

  it('keeps today’s ring on a today with nothing logged yet', () => {
    const empty = weekGrid(memberDays([day('09-09-2026', '1111')], TODAY), 600);
    const cell = empty.rows[0].cells[6];
    expect(cell.state).toBe('nodata');
    expect(cell.ring).toBe(WEEK_CELL.todayRing);
  });

  it('keys rows on time+name, so a reused RoutineItem id cannot collapse them', () => {
    const rows = weekRoutineRows(memberDays([day('09-09-2026', '1111'), day(TODAY, '1111')], TODAY));
    expect(rows.map((row) => row.name)).toEqual([
      'Morning Pages', 'Start Work', 'Lunch Walk', 'Family Dinner',
    ]);
    expect(rows[0].key).toBe('06:30|Morning Pages');
  });
});

describe('nowLine — what they are doing right now', () => {
  it('reads as live, with a count, inside an unticked routine', () => {
    const line = nowLine(day(TODAY, '1000'), 10 * 60);
    expect(line).toEqual({ text: 'In Start Work · 1 of 4 done', live: true });
  });

  it('says "just started" when nothing is ticked yet', () => {
    expect(nowLine(day(TODAY, '0000'), 10 * 60)).toEqual({
      text: 'In Start Work · just started', live: true,
    });
  });

  it('reports a routine finished in the last hour', () => {
    const line = nowLine(day(TODAY, '1100'), 9 * 60 + 12);
    expect(line).toEqual({ text: 'Finished Start Work · 12 min ago', live: false });
  });

  it('looks ahead once the current routine is done and the tick is no longer news', () => {
    // 11:00, Start Work ticked at 09:00 — two hours old, so not "just finished".
    const line = nowLine(day(TODAY, '1100'), 11 * 60);
    expect(line).toEqual({ text: 'Next: Lunch Walk at 12:30', live: false });
  });

  it('says so when there is no routine logged at all', () => {
    expect(nowLine(null, 600).text).toBe('No routine logged today');
  });

  it('feeds the pulse’s last-hour count from the same reading', () => {
    expect(finishedWithinHour(day(TODAY, '1100'), 9 * 60 + 30)).toBe(true);
    expect(finishedWithinHour(day(TODAY, '1100'), 13 * 60)).toBe(false);
    expect(finishedWithinHour(day(TODAY, '0000'), 600)).toBe(false);
  });
});

describe('memberStreak', () => {
  it('counts consecutive days that cleared three ticks', () => {
    const days = memberDays([
      day('08-09-2026', '1110'),
      day('09-09-2026', '1111'),
      day(TODAY, '1110'),
    ], TODAY);
    expect(memberStreak(days)).toBe(3);
  });

  it('does not break the streak just because today is still short', () => {
    const days = memberDays([
      day('08-09-2026', '1110'),
      day('09-09-2026', '1111'),
      day(TODAY, '1000'),
    ], TODAY);
    expect(memberStreak(days)).toBe(2);
  });

  it('stops at the first past day that fell short', () => {
    const days = memberDays([
      day('07-09-2026', '1111'),
      day('08-09-2026', '1000'),
      day('09-09-2026', '1111'),
      day(TODAY, '1111'),
    ], TODAY);
    expect(memberStreak(days)).toBe(2);
  });
});

describe('groupPulse — the mean of the member week averages', () => {
  it('rounds the mean of every member’s week average', () => {
    const { average } = groupPulse([{ name: 'A', average: 80 }, { name: 'B', average: 71 }]);
    expect(average).toBe(76);
  });

  it('says the week is strong at 70 and above', () => {
    expect(groupPulse([{ name: 'Alex Morgan', average: 70 }, { name: 'Priya Shah', average: 70 }]).line)
      .toBe('Strong week. Everyone is showing up.');
  });

  it('names everyone under 50 when the group average is below 70', () => {
    const { average, line } = groupPulse([
      { name: 'Alex Morgan', average: 68 },
      { name: 'Priya Shah', average: 40 },
      { name: 'Leo Morgan', average: 30 },
    ]);
    expect(average).toBe(46);
    expect(line).toBe('Average across 3 members. Priya and Leo could use a nudge.');
  });

  it('says Nobody when the average is low but no single member is', () => {
    expect(groupPulse([{ name: 'A B', average: 66 }, { name: 'C D', average: 60 }]).line)
      .toBe('Average across 2 members. Nobody could use a nudge.');
  });

  it('averages the member days end to end', () => {
    const days = memberDays([day('09-09-2026', '1111'), day(TODAY, '0100')], TODAY);
    // 100 + 40 over seven columns = 140/7 = 20.
    expect(weekAverage(days)).toBe(20);
    expect(groupPulse([{ name: 'Solo One', average: weekAverage(days) }])).toEqual({
      average: 20,
      line: 'Just you so far. Invite someone to share the week with.',
    });
  });

  it('never tells a group of one to nudge themselves', () => {
    expect(groupPulse([{ name: 'Gaurav P', email: 'g@x.com', average: 0 }], 'g@x.com').line)
      .not.toMatch(/nudge/);
  });

  it('leaves you out of the names to nudge', () => {
    const { line } = groupPulse([
      { name: 'Alex Morgan', email: 'ALEX@routine.app', average: 10 },
      { name: 'Priya Shah', email: 'p@x.com', average: 20 },
    ], 'alex@routine.app');
    expect(line).toBe('Average across 2 members. Priya could use a nudge.');
  });

  it('has something to say before any member read has landed', () => {
    expect(groupPulse([])).toEqual({ average: 0, line: 'No one to compare with yet.' });
  });
});

describe('sortMembers — you first, then today descending', () => {
  const roster = [
    { email: 'b@x.com', todayScore: 90 },
    { email: 'me@x.com', todayScore: 10 },
    { email: 'c@x.com', todayScore: 50 },
  ];

  it('puts you at the top however badly your day is going', () => {
    expect(sortMembers(roster, 'me@x.com').map((m) => m.email))
      .toEqual(['me@x.com', 'b@x.com', 'c@x.com']);
  });

  it('matches your email case-insensitively', () => {
    expect(sortMembers(roster, 'ME@X.COM')[0].email).toBe('me@x.com');
  });

  it('keeps ties in their incoming order, so rows do not reshuffle mid-load', () => {
    const tied = [{ email: 'a' }, { email: 'b' }, { email: 'c' }];
    expect(sortMembers(tied, 'nobody').map((m) => m.email)).toEqual(['a', 'b', 'c']);
  });
});

describe('otherNames — who the leave sheet says you stop seeing', () => {
  const roster = [
    { name: 'Alex Morgan', email: 'me@x.com' },
    { name: 'Priya Shah', email: 'p@x.com' },
    { name: 'Sam Morgan', email: 's@x.com' },
    { name: 'Leo Morgan', email: 'l@x.com' },
  ];

  it('lists first names and joins the last with "and"', () => {
    expect(otherNames(roster, 'me@x.com')).toBe('Priya, Sam and Leo');
  });

  it('drops the comma for a single other member', () => {
    expect(otherNames(roster.slice(0, 2), 'me@x.com')).toBe('Priya');
  });

  it('falls back when you are the only member', () => {
    expect(otherNames([roster[0]], 'me@x.com')).toBe('the others');
  });
});
