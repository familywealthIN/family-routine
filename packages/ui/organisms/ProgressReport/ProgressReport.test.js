/* eslint-env jest */
/**
 * ProgressReport — the redesigned Progress body.
 *
 * What is pinned here is what the page can get wrong and a molecule test cannot
 * see: that the four periods drive the one thumb formula, that the info
 * disclosure prints the SERVER's formula sentence rather than a second copy
 * written in the UI, that a gap in the trend stays a gap, that a stimulus over
 * 100% fills the ring without lying in the legend, that each period gets its own
 * COMPLETED scope, and that a "Needs attention" row opens THAT routine while a
 * "Great going" row promises nothing.
 */
const Vue = require('vue');
const Vuetify = require('vuetify');

const ProgressReport = require('./ProgressReport.vue').default;
const { completedScope, balanceScope } = require('../../constants/progress');

Vue.config.productionTip = false;
Vue.config.devtools = false;
// The error state's retry is a Vuetify button.
Vue.use(Vuetify);

/**
 * The four sentences `getEfficiency` ships as the efficiency card's
 * `description` (apps/server/src/utils/getProgressReport.js). They are the
 * contract this card renders verbatim — the unit word is "routines" on Day,
 * because a Day window holds one routine day.
 */
const SERVER_FORMULA = {
  day: "Routine points earned ÷ routine points available, across this day's routines. Skipped days do not count.",
  week: "Routine points earned ÷ routine points available, across this week's days. Skipped days do not count.",
  month: "Routine points earned ÷ routine points available, across this month's days. Skipped days do not count.",
  year: "Routine points earned ÷ routine points available, across this year's days. Skipped days do not count.",
};

const GOOD = [
  { id: 'r1', name: 'Family Dinner', score: 96 },
  { id: 'r2', name: 'Morning Pages', score: 90 },
];
const BAD = [
  { id: 'r5', name: 'Lunch Walk', score: 31 },
  { id: 'r6', name: 'Deep Work', score: 44 },
];

const render = (props = {}, listeners = {}) => {
  const vm = new Vue({
    render: (h) => h(ProgressReport, {
      props: {
        shell: 'phone',
        period: 'week',
        statement: 'Great going!',
        efficiency: 72,
        formula: SERVER_FORMULA.week,
        balance: { D: 80, K: 46, G: 64 },
        balanceHeading: `BALANCE · ${balanceScope('week')}`,
        completedHeading: `COMPLETED · ${completedScope('week')}`,
        completed: [{ key: 'routine-items', label: 'Routine items', icon: 'history', value: 5, total: 7 }],
        good: GOOD,
        bad: BAD,
        routeFor: (row) => `/agenda/tree/${row.id}`,
        ...props,
      },
      on: listeners,
    }),
  }).$mount();
  return { vm, el: vm.$el, report: vm.$children[0] };
};

/** The organism nests its molecules, so reach them by component name. */
const findByName = (component, name) => {
  if (component.$options.name === name) return component;
  return component.$children.reduce((found, child) => found || findByName(child, name), null);
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);
const all = (el, testid) => Array.from(el.querySelectorAll(`[data-testid="${testid}"]`));
const text = (el, testid) => (q(el, testid) || { textContent: '' }).textContent.trim();

// ---------------------------------------------------------------- the switch

describe('ProgressReport — the Day · Week · Month · Year switch', () => {
  const thumb = (period) => {
    const { report } = render({ period });
    return findByName(report, 'MoleculeSlidingSwitch').indicatorStyle;
  };

  it('places the thumb at 3px + i * (100% - 6px) / 4 for every period', () => {
    expect(thumb('day').left).toBe('calc(3px + 0 * (100% - 6px) / 4)');
    expect(thumb('week').left).toBe('calc(3px + 1 * (100% - 6px) / 4)');
    expect(thumb('month').left).toBe('calc(3px + 2 * (100% - 6px) / 4)');
    expect(thumb('year').left).toBe('calc(3px + 3 * (100% - 6px) / 4)');
  });

  it('sizes the thumb to a quarter of the track', () => {
    expect(thumb('year').width).toBe('calc((100% - 6px) / 4)');
  });

  it('reports a period change rather than routing itself', () => {
    const changed = [];
    const { el } = render({ period: 'week' }, { 'change-period': (p) => changed.push(p) });
    all(el, 'sliding-switch-segment')[3].click();
    expect(changed).toEqual(['year']);
  });

  it('leaves the switch to the shell header on tablet and desktop', () => {
    expect(q(render({ shell: 'tablet' }).el, 'sliding-switch')).toBeNull();
    expect(q(render({ shell: 'desktop' }).el, 'sliding-switch')).toBeNull();
    expect(q(render({ shell: 'phone' }).el, 'sliding-switch')).not.toBeNull();
  });
});

// ------------------------------------------------------------------ the hero

describe('ProgressReport — the efficiency hero', () => {
  it('merges the statement and the figure into one card', () => {
    const { el } = render();
    expect(text(el, 'progress-statement')).toBe('Great going!');
    expect(text(el, 'progress-efficiency')).toBe('72%');
  });

  it('prints an em dash, not a zero, before the report arrives', () => {
    const { el } = render({ efficiency: null, statement: '' });
    expect(text(el, 'progress-efficiency')).toBe('—');
  });

  it('discloses the server formula verbatim, for each period', async () => {
    const periods = ['day', 'week', 'month', 'year'];
    await periods.reduce(async (chain, period) => {
      await chain;
      const { el } = render({ period, formula: SERVER_FORMULA[period] });
      q(el, 'progress-formula-toggle').click();
      await Vue.nextTick();
      expect(text(el, 'progress-formula')).toBe(SERVER_FORMULA[period]);
    }, Promise.resolve());
  });

  it('says "routines" on Day and "days" on the longer periods', () => {
    expect(SERVER_FORMULA.day).toContain("this day's routines");
    expect(SERVER_FORMULA.week).toContain("this week's days");
    expect(SERVER_FORMULA.month).toContain("this month's days");
    expect(SERVER_FORMULA.year).toContain("this year's days");
  });

  it('keeps the formula hidden until the info icon is used', () => {
    const { el } = render();
    expect(q(el, 'progress-formula')).toBeNull();
  });

  it('offers no info icon when the report shipped no formula', () => {
    expect(q(render({ formula: '' }).el, 'progress-formula-toggle')).toBeNull();
  });

  it('colours the delta green up and red down', async () => {
    const up = render({ efficiency: 72, previousEfficiency: 66, previousLabel: 'last week' });
    expect(text(up.el, 'progress-delta')).toBe('▲ 6 pts vs last week');
    expect(q(up.el, 'progress-delta').style.color).toBe('rgb(46, 125, 50)');

    const down = render({ efficiency: 58, previousEfficiency: 64, previousLabel: 'yesterday' });
    expect(text(down.el, 'progress-delta')).toBe('▼ 6 pts vs yesterday');
    expect(q(down.el, 'progress-delta').style.color).toBe('rgb(211, 47, 47)');
  });

  it('says there is nothing to compare rather than printing "▲ 0 pts"', () => {
    const { el } = render({ previousEfficiency: null, previousLabel: 'last week' });
    expect(text(el, 'progress-delta')).toBe('No last week to compare yet');
  });
});

// ----------------------------------------------------------------- the trend

describe('ProgressReport — the trend', () => {
  const SERIES = [100, 100, 60, null, null, null, null];

  it('leaves a null out of the line and gives it no hit zone', () => {
    const { el } = render({ series: SERIES, seriesLabels: ['06:30', '21:30'] });
    const line = q(el, 'mini-sparkline-line').getAttribute('d');
    expect(line.match(/[ML]/g)).toHaveLength(3);
    expect(all(el, 'mini-sparkline-dot')).toHaveLength(7);
    expect(all(el, 'mini-sparkline-hit')).toHaveLength(3);
  });

  it('still draws the gap as a zero-size dot, so the break is visible', () => {
    const { el } = render({ series: SERIES });
    expect(all(el, 'mini-sparkline-dot').slice(3).map((d) => d.style.width))
      .toEqual(['0px', '0px', '0px', '0px']);
  });

  it('selects the last point with data and names it', () => {
    const { el } = render({
      series: SERIES,
      pointNames: ['Morning Pages', 'Workout', 'Start Work', 'Lunch Walk', 'Deep Work', 'Family Dinner', 'Wind Down'],
    });
    expect(text(el, 'progress-readout')).toContain('Start Work');
    expect(text(el, 'progress-readout')).toContain('60%');
  });

  it('reports a tap on a hit zone instead of selecting on its own', () => {
    const picked = [];
    const { el } = render({ series: SERIES }, { 'select-point': (i) => picked.push(i) });
    all(el, 'mini-sparkline-hit')[0].click();
    expect(picked).toEqual([0]);
  });

  it('draws the previous period as the dashed reference line when there is one', () => {
    expect(q(render({ series: SERIES, previousEfficiency: 64 }).el, 'mini-sparkline-reference')).not.toBeNull();
    expect(q(render({ series: SERIES }).el, 'mini-sparkline-reference')).toBeNull();
  });

  it('says why there is no trend rather than drawing an empty chart', () => {
    const { el } = render({ series: [], trendNote: 'No day-by-day trend yet.' });
    expect(q(el, 'mini-sparkline')).toBeNull();
    expect(text(el, 'progress-trend-empty')).toBe('No day-by-day trend yet.');
  });

  it('treats an all-null series as no trend at all', () => {
    const { el } = render({ series: [null, null], trendNote: 'No day-by-day trend yet.' });
    expect(q(el, 'mini-sparkline')).toBeNull();
  });
});

// ---------------------------------------------------------------- the balance

describe('ProgressReport — the D/K/G trio', () => {
  it('replaces the radar chart with the three concentric rings', () => {
    const { el } = render();
    expect(q(el, 'dkg-ring-trio')).not.toBeNull();
    expect(all(el, 'progress-ring-value').map((a) => Number(a.getAttribute('r')))).toEqual([56, 42, 28]);
  });

  it('fills the ring at 100% but keeps the legend honest above it', () => {
    const { el } = render({ balance: { D: 140, K: 64, G: 0 } });
    const arcs = all(el, 'progress-ring-value');
    expect(Number(arcs[0].getAttribute('stroke-dashoffset'))).toBe(0);
    expect(all(el, 'dkg-legend-value').map((n) => n.textContent.trim())).toEqual(['140%', '64%', '0%']);
  });

  it('withholds the card entirely when the report has no stimulus figures', () => {
    expect(q(render({ balance: null }).el, 'progress-balance')).toBeNull();
  });

  it('scopes the heading to the period, because a Day window is not a mean', () => {
    expect(balanceScope('day')).toBe('TODAY');
    expect(balanceScope('week')).toBe('AVG PER DAY');
  });
});

// -------------------------------------------------------------- the bar group

describe('ProgressReport — COMPLETED', () => {
  it('labels the scope per period', () => {
    expect(completedScope('day')).toBe('TODAY');
    expect(completedScope('week')).toBe('AVG PER DAY');
    expect(completedScope('month')).toBe('AVG PER DAY');
    expect(completedScope('year')).toBe('AVG PER DAY · MILESTONES THIS YEAR');
  });

  it('renders the scope it was handed', () => {
    const { el } = render({ completedHeading: `COMPLETED · ${completedScope('year')}` });
    expect(text(el, 'progress-bars-heading')).toBe('COMPLETED · AVG PER DAY · MILESTONES THIS YEAR');
  });

  it('draws a 6px bar per row at value over total', () => {
    const { el } = render({
      completed: [
        { key: 'routine-items', label: 'Routine items', icon: 'history', value: 5, total: 7 },
        { key: 'tasks', label: 'Tasks', icon: 'task_alt', value: 8, total: 11 },
        { key: 'milestones', label: 'Milestones', icon: 'flag', value: 1, total: 2 },
      ],
    });
    expect(all(el, 'progress-bar-row')).toHaveLength(3);
    expect(all(el, 'progress-bar-fill').map((f) => f.style.width)).toEqual(['71%', '73%', '50%']);
  });

  it('prints an em dash and an empty bar for a row the report did not fill', () => {
    const { el } = render({
      completed: [{ key: 'milestones', label: 'Milestones', icon: 'flag', value: null, total: null }],
    });
    expect(text(el, 'progress-bar-value')).toBe('—');
    expect(q(el, 'progress-bar-fill').style.width).toBe('0%');
  });
});

// ------------------------------------------------------------- the rank cards

describe('ProgressReport — great going and needs attention', () => {
  it('lists both cards', () => {
    const { el } = render();
    expect(all(el, 'routine-rank-card')).toHaveLength(2);
    expect(all(el, 'routine-rank-row')).toHaveLength(4);
  });

  it('deep-links an attention row to that routine, not the Routines page', () => {
    const opened = [];
    const { el } = render({}, { 'open-routine': (id) => opened.push(id) });
    const rows = all(el, 'routine-rank-row');
    const attention = rows.filter((row) => row.tagName === 'A');

    expect(attention.map((row) => row.getAttribute('href')))
      .toEqual(['/agenda/tree/r5', '/agenda/tree/r6']);

    attention[0].click();
    expect(opened).toEqual(['r5']);
  });

  it('leaves great-going rows unlinked — there is nothing to open', () => {
    const opened = [];
    const { el } = render({}, { 'open-routine': (id) => opened.push(id) });
    const good = all(el, 'routine-rank-row').filter((row) => row.tagName !== 'A');

    expect(good).toHaveLength(2);
    good[0].click();
    expect(opened).toEqual([]);
  });

  it('shows the weekly hit pattern only when the rows carry one', () => {
    expect(all(render().el, 'routine-rank-pips')).toHaveLength(0);
    const withPattern = render({ good: [{ id: 'r1', name: 'Family Dinner', score: 96, pattern: [1, 1, 1, 1, 1, 0, 1] }] });
    expect(all(withPattern.el, 'routine-rank-pips')).toHaveLength(1);
  });

  it('prints the score bare, because the report\'s score is not a percentage', () => {
    expect(text(render().el, 'routine-rank-score')).toBe('96');
  });

  it('says so when no routine scored, rather than showing two empty cards', () => {
    const { el } = render({ good: [], bad: [], rankEmptyText: 'No routines scored in this week yet.' });
    expect(all(el, 'routine-rank-empty').map((n) => n.textContent.trim()))
      .toEqual(['No routines scored in this week yet.', 'No routines scored in this week yet.']);
  });
});

// ------------------------------------------------------------------- layout

describe('ProgressReport — layout', () => {
  it('stacks the phone in the design order', () => {
    const { el } = render();
    const order = Array.from(el.children).map((node) => node.getAttribute('data-testid'));
    expect(order).toEqual([
      'sliding-switch',
      'progress-hero',
      'progress-balance',
      'progress-bars',
      'routine-rank-card',
      'routine-rank-card',
      'progress-history-link',
    ]);
  });

  it('splits tablet and desktop into the 3fr / 2fr grid', () => {
    ['tablet', 'desktop'].forEach((shell) => {
      const { el } = render({ shell });
      expect(el.className).toContain(`rn-prog--${shell}`);
      const grid = el.querySelector('.rn-prog__grid');
      expect(grid.children).toHaveLength(2);
      // left: hero + the 2-up pair. right: rings, bars, history.
      expect(grid.children[0].querySelector('.rn-prog__pair')).not.toBeNull();
      expect(grid.children[1].querySelector('[data-testid="progress-bars"]')).not.toBeNull();
    });
  });

  it('offers the routine history row with a real href', () => {
    const opened = [];
    const { el } = render({ historyRoute: '/history' }, { 'open-history': () => opened.push(true) });
    const link = q(el, 'progress-history-link');
    expect(link.getAttribute('href')).toBe('/history');
    link.click();
    expect(opened).toEqual([true]);
  });
});

// ---------------------------------------------------------------- read state

describe('ProgressReport — loading and error', () => {
  const dataCards = (el) => [
    'progress-efficiency', 'progress-balance', 'progress-statement',
  ].filter((id) => q(el, id));

  ['phone', 'desktop'].forEach((shell) => {
    it(`shows a loading state instead of dashes and "No routines scored" (${shell})`, () => {
      const { el } = render({ shell, loading: true, rankEmptyText: 'No routines scored in this week yet.' });
      expect(text(el, 'progress-loading')).toContain('Loading your week');
      expect(q(el, 'progress-loading').getAttribute('role')).toBe('status');
      expect(dataCards(el)).toEqual([]);
      expect(el.textContent).not.toContain('No routines scored');
      expect(q(el, 'progress-history-link')).not.toBeNull();
    });

    it(`shows the D-10 error state with a retry, never stale figures (${shell})`, () => {
      const retried = [];
      const { el } = render({ shell, loadError: true }, { retry: () => retried.push(true) });
      expect(q(el, 'progress-loading')).toBeNull();
      expect(q(el, 'progress-error').textContent).toContain("We couldn't load your progress.");
      expect(dataCards(el)).toEqual([]);
      el.querySelector('.load-error-state__retry').click();
      expect(retried).toEqual([true]);
    });
  });

  it('keeps the phone period switch usable while loading', () => {
    expect(q(render({ shell: 'phone', loading: true }).el, 'sliding-switch')).not.toBeNull();
  });

  it('renders the report when neither flag is up', () => {
    const { el } = render();
    expect(q(el, 'progress-loading')).toBeNull();
    expect(q(el, 'progress-error')).toBeNull();
    expect(text(el, 'progress-efficiency')).toBe('72%');
  });
});
