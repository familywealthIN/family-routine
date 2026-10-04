/* eslint-env jest */
/**
 * GoalCascade — the Goals screen body.
 *
 * What only this component can get wrong: the routine group headers (one NOW
 * badge, the orange clock, the n/n count), the three row shapes — and above all
 * that a YEAR row navigates rather than ticks, which is the difference between
 * opening a goal's page and silently closing it.
 */
const Vue = require('vue');
// The shared LoadErrorState is built on the Vuetify atoms, so the error branch
// needs the plugin the same way AgentList's suite does.
const Vuetify = require('vuetify');

const GoalCascade = require('./GoalCascade.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

const LADDER = ['day', 'week', 'month', 'year', 'lifetime'].map((key, index) => ({
  key,
  label: key,
  num: '0/0',
  value: 0,
  color: '#288bd5',
  active: index === 0,
  threshold: index < 3 ? '×5' : '',
  pop: false,
}));

const GROUPS = [
  {
    key: 'mp',
    time: '06:30',
    name: 'Morning Pages',
    isNow: false,
    current: false,
    count: '1/1',
    rows: [{
      key: 'd1', id: 'd1', kind: 'check', body: 'Write 3 pages', done: true, strike: true, period: 'day',
    }],
  },
  {
    key: 'sw',
    time: '09:00',
    name: 'Start Work',
    isNow: true,
    current: true,
    count: '0/1',
    rows: [{
      key: 'd2', id: 'd2', kind: 'check', body: 'Ship dashboard PR', done: false, strike: true, period: 'day',
    }],
  },
  {
    key: 'none',
    time: '—',
    name: 'No routine',
    isNow: false,
    current: false,
    count: '0/1',
    rows: [{
      key: 'l1', id: 'l1', kind: 'check', body: 'Visit 30 countries', done: false, strike: false, period: 'lifetime', meta: 'No linked year goal yet',
    }],
  },
];

const BAR_GROUP = [{
  key: 'sw',
  time: '09:00',
  name: 'Start Work',
  isNow: false,
  current: false,
  count: '0/1',
  rows: [{
    key: 'w1',
    id: 'w1',
    kind: 'bar',
    body: 'Ship the dashboard',
    done: false,
    strike: false,
    period: 'week',
    barLabel: '4/5 days',
    barPct: 80,
    status: { label: 'Active', color: '#FF9800', bg: 'rgba(255,152,0,.14)' },
    blocked: false,
  }],
}];

const YEAR_GROUP = [{
  key: 'sw',
  time: '09:00',
  name: 'Start Work',
  isNow: false,
  current: false,
  count: '0/1',
  rows: [{
    key: 'y1',
    id: 'y1',
    kind: 'year',
    body: 'Ship v2 of Routine Notes',
    done: false,
    period: 'year',
    pct: 83,
    pctLabel: '83%',
    ringColor: '#288bd5',
    meta: '5/6 months · Active',
  }],
}];

const render = (props = {}) => {
  const events = {
    toggled: [], edited: [], deleted: [], years: [], add: 0,
  };
  const vm = new Vue({
    render: (h) => h(GoalCascade, {
      props: {
        shell: 'phone',
        tab: 'day',
        ladder: LADDER,
        rule: 'Day goals count toward this week’s goal.',
        ruleIcon: 'today',
        listTitle: 'Today',
        listDone: 1,
        listTotal: 3,
        groups: GROUPS,
        addLabel: 'Add day goal',
        ...props,
      },
      on: {
        'toggle-row': (row) => events.toggled.push(row.id),
        'edit-row': (row) => events.edited.push(row.id),
        'delete-row': (row) => events.deleted.push(row.id),
        'open-year': (row) => events.years.push(row.id),
        add: () => { events.add += 1; },
      },
      scopedSlots: { calendar: () => h('div', { attrs: { 'data-testid': 'stub-calendar' } }) },
    }),
  }).$mount();
  return { el: vm.$el, events };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);
const all = (el, selector) => Array.from(el.querySelectorAll(selector));

describe('GoalCascade — routine groups', () => {
  it('draws one header per routine, in the order it was given', () => {
    const { el } = render();
    expect(all(el, '.rn-gcas__group-name').map((node) => node.textContent))
      .toEqual(['Morning Pages', 'Start Work', 'No routine']);
  });

  it('badges exactly one routine NOW', () => {
    const { el } = render();
    expect(all(el, '[data-testid="goal-group-now"]').length).toBe(1);
    expect(all(el, '.rn-gcas__group-time--now').length).toBe(1);
  });

  it('badges none when no group claims it', () => {
    const groups = GROUPS.map((group) => ({ ...group, isNow: false, current: false }));
    expect(all(render({ groups }).el, '[data-testid="goal-group-now"]').length).toBe(0);
  });

  it('counts the group done-of-total next to its hairline', () => {
    const { el } = render();
    expect(all(el, '.rn-gcas__group-count').map((node) => node.textContent)).toEqual(['1/1', '0/1', '0/1']);
  });

  it('heads the list with how much of this level is done', () => {
    const { el } = render();
    expect(q(el, 'goal-cascade-list').textContent).toContain('1 of 3 done');
  });
});

describe('GoalCascade — the three row shapes', () => {
  it('ticks a day goal and strikes it through when done', () => {
    const { el, events } = render();
    const done = q(el, 'goal-row-d1');
    expect(done.getAttribute('aria-checked')).toBe('true');
    expect(done.querySelector('.rn-gcas__row-body').className).toContain('rn-gcas__row-body--done');
    q(el, 'goal-row-d2').click();
    expect(events.toggled).toEqual(['d2']);
  });

  it('gives a week goal its streak bar and status chip', () => {
    const { el } = render({ tab: 'week', groups: BAR_GROUP });
    expect(q(el, 'goal-row-w1').textContent).toContain('4/5 days');
    expect(q(el, 'goal-status-w1').textContent).toBe('Active');
    expect(q(el, 'goal-row-w1').querySelector('.rn-gcas__bar-fill').style.width).toBe('80%');
  });

  it('leaves a week goal strikeable only by its checkbox, never struck through', () => {
    const { el } = render({ tab: 'week', groups: BAR_GROUP });
    expect(q(el, 'goal-row-w1').querySelector('.rn-gcas__row-body').className)
      .not.toContain('rn-gcas__row-body--done');
  });

  it('shows a lifetime goal where it came from', () => {
    const { el } = render();
    expect(q(el, 'goal-row-l1').textContent).toContain('No linked year goal yet');
  });
});

describe('GoalCascade — edit and delete are separate targets from ticking', () => {
  it('offers an edit glyph on every checkbox row', () => {
    const { el } = render();
    expect(all(el, '.rn-gcas__row-edit').length).toBe(3);
    expect(q(el, 'goal-row-edit-d1')).not.toBeNull();
  });

  it('asks the page to open the editor instead of opening it itself', () => {
    const { el, events } = render();
    q(el, 'goal-row-edit-d2').click();
    expect(events.edited).toEqual(['d2']);
  });

  /**
   * Delete is on the ROW, not inside the editor — the same split DashBoard has
   * (its goal lists emit `delete-goal-item`; its editor dialog has no delete).
   */
  it('offers a delete glyph beside the edit one, on every checkbox row', () => {
    const { el } = render();
    expect(all(el, '.rn-gcas__row-delete').length).toBe(3);
    expect(q(el, 'goal-row-delete-d1')).not.toBeNull();
  });

  it('asks the page to delete instead of deleting anything itself', () => {
    const { el, events } = render();
    q(el, 'goal-row-delete-d2').click();
    expect(events.deleted).toEqual(['d2']);
    // And it is not an edit either — two glyphs, two separate requests.
    expect(events.edited).toEqual([]);
  });

  it('does not tick the row the delete glyph was tapped on', () => {
    const { el, events } = render();
    q(el, 'goal-row-delete-d2').click();
    expect(events.toggled).toEqual([]);
  });

  it('deletes a week goal too, where the bar row is', () => {
    const { el, events } = render({ tab: 'week', groups: BAR_GROUP });
    q(el, 'goal-row-delete-w1').click();
    expect(events.deleted).toEqual(['w1']);
    expect(events.toggled).toEqual([]);
  });

  /**
   * The whole row is the tick target, so without `stopPropagation` one tap on the
   * glyph would open the editor AND complete the goal.
   */
  it('does not tick the row it was tapped on', () => {
    const { el, events } = render();
    q(el, 'goal-row-edit-d2').click();
    expect(events.toggled).toEqual([]);
  });

  it('edits a week goal too, where the bar row is', () => {
    const { el, events } = render({ tab: 'week', groups: BAR_GROUP });
    q(el, 'goal-row-edit-w1').click();
    expect(events.edited).toEqual(['w1']);
    expect(events.toggled).toEqual([]);
  });

  /** A year goal is acted on from its own page, so its row has no glyph at all. */
  it('leaves a year row with nothing but its navigation', () => {
    const { el } = render({ tab: 'year', groups: YEAR_GROUP });
    expect(all(el, '.rn-gcas__row-edit').length).toBe(0);
    expect(all(el, '.rn-gcas__row-delete').length).toBe(0);
    expect(all(el, '.rn-gcas__row-act').length).toBe(0);
  });
});

describe('GoalCascade — a year goal navigates, it does not tick', () => {
  it('renders a real link to its own page', () => {
    const { el } = render({ tab: 'year', groups: YEAR_GROUP });
    const row = q(el, 'goal-year-row-y1');
    expect(row.tagName).toBe('A');
    expect(row.getAttribute('href')).toBe('/year-goals/y1');
    expect(row.textContent).toContain('83%');
    expect(row.textContent).toContain('5/6 months · Active');
  });

  it('has no checkbox at all', () => {
    const { el } = render({ tab: 'year', groups: YEAR_GROUP });
    expect(q(el, 'goal-row-y1')).toBeNull();
    expect(el.querySelectorAll('.rn-gcas__box').length).toBe(0);
  });

  it('asks the page to open it instead of following the href itself', () => {
    const { el, events } = render({ tab: 'year', groups: YEAR_GROUP });
    q(el, 'goal-year-row-y1').click();
    expect(events.years).toEqual(['y1']);
    expect(events.toggled).toEqual([]);
  });
});

describe('GoalCascade — empty and add', () => {
  it('says what an empty level means', () => {
    const { el } = render({ groups: [], empty: true, emptyText: 'Nothing planned yet for this day.' });
    expect(q(el, 'goal-cascade-empty').textContent).toBe('Nothing planned yet for this day.');
  });

  it('keeps the add row even when the level is empty', () => {
    const { el, events } = render({ groups: [], empty: true, emptyText: 'No goals here yet.' });
    expect(q(el, 'goal-cascade-add').textContent).toContain('Add day goal');
    q(el, 'goal-cascade-add').click();
    expect(events.add).toBe(1);
  });
});

describe('GoalCascade — the three shells', () => {
  it('stacks ladder, calendar and list on the phone, calendar on the day tab only', () => {
    expect(q(render({ shell: 'phone', tab: 'day' }).el, 'stub-calendar')).not.toBeNull();
    expect(q(render({ shell: 'phone', tab: 'week' }).el, 'stub-calendar')).toBeNull();
    expect(render({ shell: 'phone' }).el.querySelector('.rn-gcas__split')).toBeNull();
  });

  it('splits into a left column and the list on tablet and desktop, calendar always', () => {
    ['tablet', 'desktop'].forEach((shell) => {
      const { el } = render({ shell, tab: 'week' });
      expect(el.className).toContain(`rn-gcas--${shell}`);
      expect(el.querySelector('.rn-gcas__side')).not.toBeNull();
      expect(q(el, 'stub-calendar')).not.toBeNull();
    });
  });

  it('renders ONE list whichever shell it is, so the two cannot diverge', () => {
    ['phone', 'tablet', 'desktop'].forEach((shell) => {
      const { el } = render({ shell });
      expect(el.querySelectorAll('[data-testid="goal-cascade-list"]').length).toBe(1);
    });
  });

  it('keeps the list interactive in the split layout too', () => {
    const { el, events } = render({ shell: 'desktop' });
    q(el, 'goal-row-d2').click();
    expect(events.toggled).toEqual(['d2']);
  });
});

describe('GoalCascade — error is not empty (D-10)', () => {
  it('renders the shared error state instead of "no goals here yet"', () => {
    const { el } = render({ groups: [], empty: false, loadError: true });
    expect(q(el, 'goal-cascade-error')).not.toBeNull();
    expect(el.textContent).toContain('Nothing has been deleted');
    expect(q(el, 'goal-cascade-empty')).toBeNull();
  });

  it('renders the empty copy — never the error state — when there is simply nothing', () => {
    const { el } = render({ groups: [], empty: true, emptyText: 'No goals here yet.' });
    expect(q(el, 'goal-cascade-error')).toBeNull();
    expect(q(el, 'goal-cascade-empty').textContent).toBe('No goals here yet.');
  });

  it('keeps the rows when a refetch fails but goals are already on screen', () => {
    // The container only raises loadError with an empty list, so this is the shape
    // it hands over: rows AND no error.
    const { el } = render({ loadError: false });
    expect(q(el, 'goal-cascade-error')).toBeNull();
    expect(q(el, 'goal-row-d1')).not.toBeNull();
  });

  it('offers a retry that asks the container to re-read', () => {
    const retried = [];
    const vm = new Vue({
      render: (h) => h(GoalCascade, {
        props: {
          shell: 'phone', tab: 'day', ladder: LADDER, groups: [], loadError: true,
        },
        on: { retry: () => retried.push(true) },
      }),
    }).$mount();
    vm.$el.querySelector('.load-error-state__retry').click();
    expect(retried).toEqual([true]);
  });

  it('hides the add row behind the error, so nothing invites a write into a dead read', () => {
    const { el } = render({ groups: [], loadError: true });
    expect(q(el, 'goal-cascade-add')).toBeNull();
  });
});
