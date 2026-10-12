/* eslint-env jest */
/**
 * GoalsTime — what only the page can get wrong.
 *
 * It composes six containers and owns four things: which ladder step is showing,
 * which day is selected, the toast, and where a tap goes. The orchestration worth
 * guarding is the tick: the cascade container hands up a PLAN, and the page has to
 * send every mutation in it, refresh BOTH reads afterwards (a tick changes a day
 * count and a streak), and say nothing it did not do — a blocked tick carries a
 * toast and no mutations at all.
 */
// The page pulls the ui barrels through its containers, which transitively import
// third-party components shipped as raw .vue files in node_modules (jest won't
// transform them). Stub them, plus the native sign-in plugins and the gitignored
// blob config the Log out path reads client ids from.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const fs = require('fs');
const path = require('path');

const GoalsTime = require('../GoalsTime.vue').default;

const {
  MILESTONES_ROUTE, YEAR_GOAL_ROUTE, GOALS_ROUTE, POP_MS,
} = require('../GoalsTime.vue');

const { computed, methods } = GoalsTime;

const page = (overrides = {}) => {
  const pushed = [];
  const refreshed = { cascade: 0, calendar: 0 };
  const ticked = [];
  const removed = [];
  const confirmed = [];
  const tracked = [];
  const vm = {
    tab: 'day',
    today: '12-09-2026',
    selectedDate: '12-09-2026',
    canAdd: true,
    monthDate: '12-09-2026',
    switcherOpen: false,
    sheetOpen: false,
    sheetPeriod: 'day',
    editorOpen: false,
    editItem: null,
    pop: [],
    popTimer: null,
    toast: {
      title: '', sub: '', icon: 'check_circle', color: '#81c784', seq: 0,
    },
    isDesktop: false,
    shell: 'phone',
    // MeasurementMixin — the page's only analytics surface.
    trackPageView: (name, props) => tracked.push(['page', name, props]),
    trackUserInteraction: (action, element, props) => tracked.push([action, element, props]),
    trackBusinessEvent: (name, props) => tracked.push([name, props]),
    $route: { path: GOALS_ROUTE },
    $router: { push: (route) => { pushed.push(route); return Promise.resolve(); } },
    $refs: {
      cascade: { refresh: () => { refreshed.cascade += 1; } },
      calendar: { refresh: () => { refreshed.calendar += 1; } },
      tick: { tick: (ticks) => { ticked.push(ticks); return Promise.resolve([]); } },
      remove: { remove: (target) => { removed.push(target); return Promise.resolve({}); } },
      deleteConfirm: { open: (target) => { confirmed.push(target); } },
    },
    ...overrides,
  };
  // Bind every method onto the fake instance so one can call another.
  Object.keys(methods).forEach((name) => { vm[name] = methods[name].bind(vm); });
  return {
    vm, pushed, refreshed, ticked, removed, confirmed, tracked,
  };
};

/** The complete goal item a cascade row resolves back to. */
const ITEM = {
  id: 'd2',
  body: 'Ship dashboard PR',
  period: 'day',
  date: '12-09-2026',
  taskRef: 'sw',
  goalRef: 'wg1',
  isMilestone: true,
  tags: ['area:product'],
  subTasks: [{ id: 's1', body: 'Fix offsets', isComplete: false }],
};

describe('GoalsTime — the shell', () => {
  const shellFor = (breakpoint) => computed.shell.call({ $vuetify: { breakpoint } });

  it('uses the one breakpoint rule, not a second scheme', () => {
    expect(shellFor({ xsOnly: true, width: 412 })).toBe('phone');
    expect(shellFor({ xsOnly: false, width: 1133 })).toBe('tablet');
    expect(shellFor({ xsOnly: false, width: 1264 })).toBe('desktop');
  });

  it('falls back to the phone when there is no Vuetify at all', () => {
    expect(computed.shell.call({})).toBe('phone');
  });

  it('labels the header actions everywhere but the phone, where there is no room', () => {
    expect(computed.labelledActions.call({ isPhone: true })).toBe(false);
    expect(computed.labelledActions.call({ isPhone: false })).toBe(true);
  });

  it('subtitles the shell with today, not with the selected day', () => {
    expect(computed.dateLabel.call({ today: '12-09-2026' })).toBe('Saturday, 12 September');
  });
});

describe('GoalsTime — the ladder is the navigation', () => {
  it('swaps the list below without touching the route', () => {
    const { vm, pushed } = page();
    vm.selectStep('month');
    expect(vm.tab).toBe('month');
    expect(pushed).toEqual([]);
  });

  it('ignores a level nobody defined', () => {
    const { vm } = page();
    vm.selectStep('fortnight');
    expect(vm.tab).toBe('day');
  });
});

describe('GoalsTime — the calendar selects a day', () => {
  it('loads that day and follows it back to the Today step', () => {
    const { vm } = page({ tab: 'month' });
    vm.selectDay('08-09-2026');
    expect(vm.selectedDate).toBe('08-09-2026');
    expect(vm.tab).toBe('day');
  });

  it('ignores a cell with no date', () => {
    const { vm } = page();
    vm.selectDay('');
    expect(vm.selectedDate).toBe('12-09-2026');
  });
});

describe('GoalsTime — stepping the calendar month', () => {
  /**
   * The two-read split: the calendar's month read is keyed on `monthDate` and
   * the cascade's on `selectedDate`. Only the first may move, because the
   * cascade's resolver WRITES (`autoCheckTaskPeriod`) — browsing three months
   * back must not auto-tick three days nobody chose.
   */
  it('moves the month in view and leaves the selected day alone', () => {
    const { vm } = page();
    vm.shiftMonth(-1);
    expect(vm.monthDate).toBe('01-08-2026');
    expect(vm.selectedDate).toBe('12-09-2026');
    vm.shiftMonth(1);
    vm.shiftMonth(1);
    expect(vm.monthDate).toBe('01-10-2026');
    expect(vm.selectedDate).toBe('12-09-2026');
  });

  it('does not change which ladder step is showing', () => {
    const { vm } = page({ tab: 'week' });
    vm.shiftMonth(-1);
    expect(vm.tab).toBe('week');
  });

  it('crosses a year boundary without landing on a 31st that does not exist', () => {
    const { vm } = page({ monthDate: '31-01-2027' });
    vm.shiftMonth(1);
    expect(vm.monthDate).toBe('01-02-2027');
    const back = page({ monthDate: '15-01-2027' });
    back.vm.shiftMonth(-1);
    expect(back.vm.monthDate).toBe('01-12-2026');
  });

  it('re-reads nothing by itself — the container owns that query’s variables', () => {
    const { vm, refreshed } = page();
    vm.shiftMonth(1);
    expect(refreshed).toEqual({ cascade: 0, calendar: 0 });
  });

  it('keeps the grid and the selection on one month once a day is picked', () => {
    const { vm } = page();
    vm.shiftMonth(-1);
    vm.selectDay('08-08-2026');
    expect(vm.monthDate).toBe('08-08-2026');
    expect(vm.selectedDate).toBe('08-08-2026');
  });
});

describe('GoalsTime — where a tap goes', () => {
  it('opens the real Milestones route, which the mock only toasts about', () => {
    const { vm, pushed } = page();
    vm.openMilestones();
    expect(pushed).toEqual([MILESTONES_ROUTE]);
  });

  it('opens a year goal on its own page', () => {
    const { vm, pushed } = page({ switcherOpen: true });
    vm.openYear('y1');
    expect(pushed).toEqual([`${YEAR_GOAL_ROUTE}/y1`]);
    expect(vm.switcherOpen).toBe(false);
  });

  it('does nothing for a year goal with no id', () => {
    const { vm, pushed } = page();
    vm.openYear('');
    expect(pushed).toEqual([]);
  });

  it('routes a nav item normally', () => {
    const { vm, pushed } = page();
    vm.onNavigate('progress', { route: '/progress' });
    expect(pushed).toEqual(['/progress']);
  });

  it('never re-pushes the route already showing', () => {
    const { vm, pushed } = page();
    vm.onNavigate('priority', { route: GOALS_ROUTE });
    expect(pushed).toEqual([]);
  });

  it('opens the year-goal switcher when the Goals tab is tapped again', () => {
    const { vm, pushed } = page();
    vm.onNavigate('goals', { route: GOALS_ROUTE });
    expect(vm.switcherOpen).toBe(true);
    expect(pushed).toEqual([]);
    vm.onNavigate('goals', { route: GOALS_ROUTE });
    expect(vm.switcherOpen).toBe(false);
  });

  it('needs no switcher on desktop — the sidebar already lists them', () => {
    const { vm } = page({ isDesktop: true });
    vm.onNavigate('goals', { route: GOALS_ROUTE });
    expect(vm.switcherOpen).toBe(false);
  });

  it('signs out instead of routing for Log out', () => {
    const signedOut = [];
    const { vm, pushed } = page();
    vm.onSignOut = () => signedOut.push(true);
    vm.onNavigate('logout', { route: '' });
    expect(signedOut).toEqual([true]);
    expect(pushed).toEqual([]);
  });
});

describe('GoalsTime — the tick, orchestrated', () => {
  const plan = (overrides = {}) => ({
    ticks: [], toast: null, pop: [], blocked: false, navigate: '', ...overrides,
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends every mutation the plan carries, parents included', async () => {
    const { vm, ticked } = page();
    const ticks = [
      { id: 'd1', period: 'day' },
      { id: 'w1', period: 'week' },
    ];
    vm.onTick(plan({ ticks }));
    await Promise.resolve();
    expect(ticked).toEqual([ticks]);
  });

  it('refreshes BOTH reads after a tick — a day count and a streak both moved', async () => {
    const { vm, refreshed } = page();
    vm.onTick(plan({ ticks: [{ id: 'd1', period: 'day' }] }));
    await Promise.resolve();
    await Promise.resolve();
    expect(refreshed).toEqual({ cascade: 1, calendar: 1 });
  });

  it('says what the cascade did, title and consequence', () => {
    const { vm } = page();
    vm.onTick(plan({
      ticks: [{ id: 'w1', period: 'week' }],
      toast: {
        icon: 'event_available', color: '#81c784', title: '“Ship it” auto-ticked · 5/5 days', sub: 'September → 2/3 weeks',
      },
    }));
    expect(vm.toast.title).toBe('“Ship it” auto-ticked · 5/5 days');
    expect(vm.toast.sub).toBe('September → 2/3 weeks');
    expect(vm.toast.seq).toBe(1);
  });

  it('shows the blocked-tick toast and sends NOTHING', () => {
    const { vm, ticked } = page();
    vm.onTick(plan({
      blocked: true,
      toast: {
        icon: 'info', color: '#90caf9', title: 'Ticked automatically', sub: '5 of 5 day goals are done',
      },
    }));
    expect(vm.toast.title).toBe('Ticked automatically');
    expect(ticked).toEqual([]);
  });

  it('pops the steps the cascade closed, then stops', () => {
    jest.useFakeTimers();
    const { vm } = page();
    vm.onTick(plan({ ticks: [{ id: 'w1' }], pop: ['week', 'month'] }));
    expect(vm.pop).toEqual(['week', 'month']);
    jest.advanceTimersByTime(POP_MS);
    expect(vm.pop).toEqual([]);
  });

  it('restarts the pop rather than letting two cascades overlap', () => {
    jest.useFakeTimers();
    const { vm } = page();
    vm.onTick(plan({ ticks: [{ id: 'w1' }], pop: ['week'] }));
    jest.advanceTimersByTime(POP_MS - 100);
    vm.onTick(plan({ ticks: [{ id: 'm1' }], pop: ['month'] }));
    jest.advanceTimersByTime(100);
    expect(vm.pop).toEqual(['month']);
    jest.advanceTimersByTime(POP_MS);
    expect(vm.pop).toEqual([]);
  });

  it('re-reads and owns up when the write failed', async () => {
    const { vm, refreshed } = page();
    vm.$refs.tick.tick = () => Promise.reject(new Error('offline'));
    vm.onTick(plan({ ticks: [{ id: 'd1', period: 'day' }] }));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(vm.toast.title).toBe("Couldn't save that tick");
    expect(refreshed.cascade).toBe(1);
  });
});

describe('GoalsTime — adding a goal', () => {
  it('opens the sheet on the level the ladder is showing', () => {
    const { vm } = page({ tab: 'year' });
    vm.openSheet();
    expect(vm.sheetOpen).toBe(true);
    expect(vm.sheetPeriod).toBe('year');
  });

  it('opens nothing for a period that has ended', () => {
    const { vm } = page({ tab: 'month', canAdd: false });
    vm.openSheet();
    expect(vm.sheetOpen).toBe(false);
    expect(computed.canAdd.call({ tab: 'month', selectedDate: '15-08-2026', today: '12-09-2026' })).toBe(false);
    expect(computed.canAdd.call({ tab: 'month', selectedDate: '01-09-2026', today: '12-09-2026' })).toBe(true);
  });

  it('switches to the level the new goal landed on and re-reads', () => {
    const { vm, refreshed } = page();
    vm.onCreated({ period: 'month' });
    expect(vm.tab).toBe('month');
    expect(refreshed).toEqual({ cascade: 1, calendar: 1 });
  });

  it('owns up when the create failed instead of showing a goal that is not there', () => {
    const { vm } = page();
    vm.onCreateFailed();
    expect(vm.toast.title).toBe("Couldn't add that goal");
    expect(vm.toast.sub).toBe('It was not saved — try again');
  });
});

describe('GoalsTime — the editor dialog', () => {
  it('opens on the complete item a row resolved to', () => {
    const { vm } = page();
    vm.openEditor(ITEM);
    expect(vm.editorOpen).toBe(true);
    expect(vm.editItem).toBe(ITEM);
    // Handed down whole, so `goalRef`, tags and subtasks reach GoalCreation.
    expect(vm.editItem).toMatchObject({ goalRef: 'wg1', isMilestone: true });
  });

  it('opens blank on the ladder’s own period and date', () => {
    const { vm } = page({ tab: 'week' });
    vm.openEditor(null);
    expect(vm.editorOpen).toBe(true);
    expect(vm.editItem).toBeNull();
    // `goalDateFor('week', …)` — the week's Friday, the same rule the quick sheet uses.
    expect(computed.editorDate.call(vm)).toBe('11-09-2026');
  });

  it('seeds a lifetime draft with the no-date date', () => {
    const { vm } = page({ tab: 'lifetime' });
    expect(computed.editorDate.call(vm)).toBe('01-01-1970');
  });

  it('forgets the item it was editing when it closes', () => {
    const { vm } = page();
    vm.openEditor(ITEM);
    vm.closeEditor();
    expect(vm.editorOpen).toBe(false);
    expect(vm.editItem).toBeNull();
  });

  it('follows the goal to the level a save moved it to, and re-reads both', () => {
    const { vm, refreshed } = page();
    vm.onGoalSaved({ goalItem: { ...ITEM, period: 'month' }, created: false });
    expect(vm.tab).toBe('month');
    expect(refreshed).toEqual({ cascade: 1, calendar: 1 });
  });

  it('stays put when the save carried no period at all', () => {
    const { vm, refreshed } = page({ tab: 'week' });
    vm.onGoalSaved({ goalItem: null, created: false });
    expect(vm.tab).toBe('week');
    expect(refreshed).toEqual({ cascade: 1, calendar: 1 });
  });
});

/**
 * The correction: the editor is DashBoard's fullscreen dialog, and the delete is
 * on the cascade ROW — not in the editor's chrome, which is where the dashboard
 * does not put it either. Both are template wiring, which is the one thing the
 * method-level tests above cannot see.
 */
describe('GoalsTime — where the editor and the delete are mounted', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'GoalsTime.vue'), 'utf8');

  // The owner asked for one edit surface: Home's goal sheet, not the old
  // GoalCreation fullscreen dialog.
  it('mounts Home’s goal sheet, not the old GoalCreation dialog', () => {
    expect(source).toContain('<goal-edit-sheet-container');
    expect(source).not.toContain('goal-edit-dialog-container');
    expect(source).not.toContain('GoalEditDialogContainer.vue');
  });

  it('hands the sheet its shell, and runs its toggle through the cascade tick rule', () => {
    const mount = source.slice(source.indexOf('<goal-edit-sheet-container'));
    const tag = mount.slice(0, mount.indexOf('/>'));
    expect(tag).toContain(':shell="shell"');
    expect(tag).toContain('@toggle="$refs.cascade.toggleItem($event)"');
  });

  it('keeps the delete on the cascade row too', () => {
    const cascade = source.slice(source.indexOf('<goals-cascade-container'));
    expect(cascade.slice(0, cascade.indexOf('>'))).toContain('@delete="confirmDelete"');
  });
});

describe('GoalsTime — deleting a goal', () => {
  it('never deletes without the confirmation that names the cascade', () => {
    const { vm, confirmed, removed } = page();
    vm.confirmDelete({
      id: 'd2', period: 'day', date: '12-09-2026', body: 'Ship dashboard PR',
    });
    expect(confirmed.length).toBe(1);
    expect(confirmed[0]).toMatchObject({ id: 'd2', body: 'Ship dashboard PR' });
    expect(removed).toEqual([]);
  });

  it('asks for nothing when there is nothing addressed', () => {
    const { vm, confirmed } = page();
    vm.confirmDelete(null);
    expect(confirmed).toEqual([]);
  });

  it('runs the delete through the write unit once confirmed, then re-reads both', async () => {
    const { vm, removed, refreshed } = page({ editorOpen: true, editItem: ITEM });
    const target = { id: 'd2', period: 'day', date: '12-09-2026' };
    vm.removeGoalItem(target);
    expect(vm.editorOpen).toBe(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(removed).toEqual([target]);
    expect(refreshed).toEqual({ cascade: 1, calendar: 1 });
    expect(vm.toast.title).toBe('Goal deleted');
  });

  it('owns up when the delete failed, and re-reads so the item comes back', async () => {
    const { vm, refreshed } = page();
    vm.$refs.remove.remove = () => Promise.reject(new Error('offline'));
    vm.removeGoalItem({ id: 'd2', period: 'day', date: '12-09-2026' });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(vm.toast.title).toBe("Couldn't delete that goal");
    expect(refreshed.cascade).toBe(1);
  });
});

describe('GoalsTime — the analytics the other pages emit', () => {
  const named = (tracked, name) => tracked.filter(([first]) => first === name);

  it('posts the page view and the mount event the old page posted', () => {
    const { vm, tracked } = page();
    GoalsTime.mounted.call(vm);
    expect(named(tracked, 'page')[0]).toEqual(['page', 'goals', undefined]);
    expect(named(tracked, 'goals_page_mounted')[0][1]).toBe('lifecycle');
  });

  it('posts milestones_navigation before it routes', () => {
    const { vm, tracked, pushed } = page();
    vm.openMilestones();
    expect(named(tracked, 'milestones_navigation')[0][2])
      .toEqual({ from_page: 'goals', to_page: 'milestones' });
    expect(pushed).toEqual([MILESTONES_ROUTE]);
  });

  it('posts add_goal_dialog_open with the level the sheet opened on', () => {
    const { vm, tracked } = page({ tab: 'month' });
    vm.openSheet();
    expect(named(tracked, 'add_goal_dialog_open')[0][2])
      .toMatchObject({ from_page: 'goals', period: 'month' });
  });

  it('posts edit_goal_dialog_open with the item’s own level', () => {
    const { vm, tracked } = page({ tab: 'week' });
    vm.openEditor(ITEM);
    expect(named(tracked, 'edit_goal_dialog_open')[0][2])
      .toMatchObject({ from_page: 'goals', period: 'day', is_milestone: true });
  });

  it('posts goal_updated for an edit, with the fields the old page sent', () => {
    const { vm, tracked } = page();
    vm.onGoalSaved({ goalItem: ITEM, created: false });
    expect(named(tracked, 'goal_updated')[0][1]).toEqual({
      goal_id: 'd2',
      period: 'day',
      is_milestone: true,
      has_deadline: false,
      tags_count: 1,
    });
    expect(named(tracked, 'goal_created')).toEqual([]);
  });

  it('posts goal_created for a create, from either sheet', () => {
    const fromEditor = page();
    fromEditor.vm.onGoalSaved({
      goalItem: {
        id: 'n1', period: 'week', body: 'Ship it', tags: ['a', 'b'], deadline: '20-09-2026',
      },
      created: true,
    });
    expect(named(fromEditor.tracked, 'goal_created')[0][1]).toEqual({
      period: 'week',
      is_milestone: false,
      has_deadline: true,
      tags_count: 2,
      goal_length: 7,
    });

    const fromQuick = page();
    fromQuick.vm.onCreated({ period: 'day', body: 'Ship it' });
    expect(named(fromQuick.tracked, 'goal_created')[0][1]).toMatchObject({
      period: 'day', tags_count: 0, goal_length: 7,
    });
  });
});
