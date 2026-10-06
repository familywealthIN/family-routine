/* eslint-env jest */
/**
 * Reading the `getProgress` report.
 *
 * Two things the server's shape makes easy to get wrong, and both would show as
 * a confident wrong number on /progress:
 *   - every scalar arrives as a STRING ('58%', '12'), so it has to be parsed;
 *   - a slot the report could not fill is ABSENT, which is not zero.
 *
 * And one thing the report itself gets wrong: `getBestRoutineSorted` slices one
 * descending list twice, so the same routine can be both the best and the worst.
 */
const {
  periodWindow,
  rangeLabel,
  previousLabel,
  normalisePeriod,
  toNumber,
  findCard,
  efficiencyOf,
  balanceOf,
  completedOf,
  rankingsOf,
} = require('../progressReport');

const TODAY = '12-09-2026'; // Saturday

const report = (cards) => ({ progressStatement: 'Great Going!', cards });

describe('progressReport — the window', () => {
  it('asks from the start of the period through today', () => {
    expect(periodWindow('day', TODAY)).toEqual({ startDate: '12-09-2026', endDate: '12-09-2026' });
    expect(periodWindow('week', TODAY)).toEqual({ startDate: '06-09-2026', endDate: '12-09-2026' });
    expect(periodWindow('month', TODAY)).toEqual({ startDate: '01-09-2026', endDate: '12-09-2026' });
    expect(periodWindow('year', TODAY)).toEqual({ startDate: '01-01-2026', endDate: '12-09-2026' });
  });

  it('falls back to the week for a period the route invented', () => {
    expect(normalisePeriod('fortnight')).toBe('week');
    expect(normalisePeriod(undefined)).toBe('week');
    expect(normalisePeriod('year')).toBe('year');
    expect(periodWindow('fortnight', TODAY)).toEqual(periodWindow('week', TODAY));
  });
});

describe('progressReport — the labels', () => {
  const label = (period) => {
    const { startDate, endDate } = periodWindow(period, TODAY);
    return rangeLabel(period, startDate, endDate);
  };

  it('names the range the way the design writes it', () => {
    expect(label('day')).toBe('Saturday, 12 September');
    expect(label('week')).toBe('Week of 6 – 12 September');
    expect(label('month')).toBe('September 2026 · 12 days in');
    expect(label('year')).toBe('2026 · January – September');
  });

  it('spells out both months when the week straddles two', () => {
    expect(rangeLabel('week', '28-09-2026', '04-10-2026')).toBe('Week of 28 September – 4 October');
  });

  it('says "1 day in" on the first of the month', () => {
    expect(rangeLabel('month', '01-10-2026', '01-10-2026')).toBe('October 2026 · 1 day in');
  });

  it('drops the range on a year still in its first month', () => {
    expect(rangeLabel('year', '01-01-2026', '09-01-2026')).toBe('2026 · January');
  });

  it('says nothing rather than "Invalid date" for a broken window', () => {
    expect(rangeLabel('week', '', '')).toBe('');
  });

  it('names what the delta compares against', () => {
    expect(previousLabel('day', '12-09-2026')).toBe('yesterday');
    expect(previousLabel('week', '06-09-2026')).toBe('last week');
    expect(previousLabel('month', '01-09-2026')).toBe('August');
    expect(previousLabel('year', '01-01-2026')).toBe('2025');
  });
});

describe('progressReport — numbers out of strings', () => {
  it('reads the percentage out of the card value', () => {
    expect(toNumber('58%')).toBe(58);
    expect(toNumber('12')).toBe(12);
    expect(toNumber(7)).toBe(7);
  });

  it('returns null, never 0, for a value it cannot read', () => {
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
    expect(toNumber('?')).toBeNull();
    expect(toNumber('')).toBeNull();
  });
});

describe('progressReport — the efficiency card', () => {
  const card = {
    id: 'efficiency',
    name: 'Routine Efficiency',
    value: '72%',
    description: "Routine points earned ÷ routine points available, across this week's days. Skipped days do not count.",
  };

  it('reads the number and the formula off the one card the server ships', () => {
    expect(efficiencyOf(report([card]))).toEqual({ value: 72, formula: card.description });
  });

  it('never composes the formula itself — no card, no sentence', () => {
    expect(efficiencyOf(report([]))).toEqual({ value: null, formula: '' });
    expect(efficiencyOf(null)).toEqual({ value: null, formula: '' });
  });

  it('ignores a different card that happens to carry a value', () => {
    expect(efficiencyOf(report([{ id: 'on-track', value: '?' }])).value).toBeNull();
  });

  it('finds a card by its slot id and nothing else', () => {
    expect(findCard(report([card]), 'efficiency')).toBe(card);
    expect(findCard(report([null, card]), 'radar-chart')).toBeNull();
  });
});

describe('progressReport — the stimulus balance', () => {
  it('keys the trio off the stimulus letter', () => {
    const balance = balanceOf(report([{
      id: 'radar-chart',
      values: [{ name: 'D', value: '80' }, { name: 'K', value: '46' }, { name: 'G', value: '64' }],
    }]));
    expect(balance).toEqual({ D: 80, K: 46, G: 64 });
  });

  it('still reads the long stimulus names the pre-getStimuli mock used', () => {
    const balance = balanceOf(report([{
      id: 'radar-chart',
      values: [{ name: 'Discipline', value: '12' }, { name: 'Kinetics', value: '77' }, { name: 'Geniuses', value: '44' }],
    }]));
    expect(balance).toEqual({ D: 12, K: 77, G: 44 });
  });

  it('is null — not three zeros — when the report has no stimulus card', () => {
    expect(balanceOf(report([]))).toBeNull();
    expect(balanceOf(report([{ id: 'radar-chart', values: [] }]))).toBeNull();
  });
});

describe('progressReport — the completed bars', () => {
  const card = {
    id: 'task-activities',
    values: [
      { name: 'Routine Items', value: '5', total: '7' },
      { name: 'Tasks', value: '8', total: '11' },
      { name: 'Milestones', value: '1', total: '2' },
    ],
  };

  it('keeps the design order and icons whatever the report returns', () => {
    expect(completedOf(report([card]))).toEqual([
      {
        key: 'routine-items', label: 'Routine items', icon: 'history', value: 5, total: 7,
      },
      {
        key: 'tasks', label: 'Tasks', icon: 'task_alt', value: 8, total: 11,
      },
      {
        key: 'milestones', label: 'Milestones', icon: 'flag', value: 1, total: 2,
      },
    ]);
  });

  it('still labels a row the report left out, with unknown values', () => {
    const rows = completedOf(report([{ id: 'task-activities', values: [card.values[0]] }]));
    expect(rows.map((r) => r.label)).toEqual(['Routine items', 'Tasks', 'Milestones']);
    expect(rows[2]).toMatchObject({ value: null, total: null });
  });
});

describe('progressReport — the rankings', () => {
  const ranked = (good, bad) => report([
    { id: 'good', values: good },
    { id: 'bad', values: bad },
  ]);
  const row = (id, value) => ({ id, name: `Routine ${id}`, value: String(value) });

  it('carries the routine id through, which is what the deep link needs', () => {
    const { good } = rankingsOf(ranked([row('r1', 96)], []));
    expect(good).toEqual([{ id: 'r1', name: 'Routine r1', score: 96 }]);
  });

  it('refuses to call one routine both the best and the worst', () => {
    // Three routines: getBestRoutineSorted slices the same three twice.
    const three = [row('r1', 96), row('r2', 60), row('r3', 20)];
    const { good, bad } = rankingsOf(ranked(three, three));
    expect(good.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);
    expect(bad).toEqual([]);
  });

  it('keeps the weakest routine first in the attention list', () => {
    const good = [row('r1', 96), row('r2', 90), row('r3', 84)];
    const bad = [row('r4', 52), row('r5', 44), row('r6', 31)];
    expect(rankingsOf(ranked(good, bad)).bad.map((r) => r.id)).toEqual(['r6', 'r5', 'r4']);
  });

  it('drops a repeated id so one routine cannot render twice', () => {
    const { good } = rankingsOf(ranked([row('r1', 96), row('r1', 90), { name: 'No id', value: '5' }], []));
    expect(good.map((r) => r.name)).toEqual(['Routine r1', 'No id']);
  });

  it('is two empty lists when the report has no ranking cards', () => {
    expect(rankingsOf(report([]))).toEqual({ good: [], bad: [] });
  });
});
