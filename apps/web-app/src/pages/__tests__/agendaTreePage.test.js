/* eslint-env jest */
/**
 * AgendaTreeTime — the month planner.
 *
 * The page's job is to lay one routine's month/week/day goals over a fixed
 * skeleton (1 month, 3 Mon-Fri weeks, 15 weekdays) and let a tap on an empty
 * node add the goal for that date. These cover the four things the redesign
 * changed behaviour on, each of which was a bug the old left-to-right tree hid:
 * the month picker that did nothing, the routine picker writing to a route
 * prop, a failed read that looked like an empty plan, and nodes that looked
 * tappable when they were not.
 */
// Same stubs the other page tests use: the ui barrels pull third-party .vue
// files out of node_modules, and the Log out path reads the gitignored blob
// config.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const AgendaTreeTime = require('../AgendaTreeTime.vue').default;

const { computed, methods, watch } = AgendaTreeTime;

/** A `this` with the skeleton already built for the given month. */
const planFor = (date) => {
  const vm = {
    date,
    agendaTreeGoals: [],
    monthGoals: [],
    monthGoalRef: '',
    selectedMonth: '',
    getDaysArray: methods.getDaysArray,
    buildCleanAgendaTreeGoals: methods.buildCleanAgendaTreeGoals,
    buildAgendaTreeGoals: methods.buildAgendaTreeGoals,
  };
  vm.buildCleanAgendaTreeGoals();
  return vm;
};

const nodeNames = (vm) => ({
  month: vm.agendaTreeGoals[0].name,
  weeks: vm.agendaTreeGoals[0].milestones.map((w) => w.name),
  days: vm.agendaTreeGoals[0].milestones.map((w) => w.milestones.map((d) => d.name)),
});

describe('AgendaTreeTime — the shell', () => {
  const shellFor = (breakpoint) => computed.shell.call({ $vuetify: { breakpoint } });

  it('uses the one breakpoint rule, not a second scheme', () => {
    expect(shellFor({ xsOnly: true, width: 412 })).toBe('phone');
    expect(shellFor({ xsOnly: false, width: 1133 })).toBe('tablet');
    expect(shellFor({ xsOnly: false, width: 1264 })).toBe('desktop');
  });

  it('falls back to the phone when there is no Vuetify at all', () => {
    expect(computed.shell.call({})).toBe('phone');
  });

  it('keeps the worded header button off the phone, where it has no room', () => {
    expect(computed.labelledActions.call({ isPhone: true })).toBe(false);
    expect(computed.labelledActions.call({ isPhone: false })).toBe(true);
  });
});

describe('AgendaTreeTime — the skeleton', () => {
  it('starts at the first MONDAY, so a month opening on a weekend is not short', () => {
    // 1 August 2026 is a Saturday; the first full week starts on the 3rd.
    const vm = planFor('15-08-2026');
    expect(nodeNames(vm).days[0].length).toBe(5);
    expect(vm.agendaTreeGoals[0].milestones.map((w) => w.date))
      .toEqual(['7-8-2026', '14-8-2026', '21-8-2026']);
    expect(vm.agendaTreeGoals[0].milestones[0].milestones.map((d) => d.date))
      .toEqual(['3-8-2026', '4-8-2026', '5-8-2026', '6-8-2026', '7-8-2026']);
  });

  it('is always one month, three weeks and fifteen weekdays', () => {
    ['15-02-2026', '15-08-2026', '15-10-2026'].forEach((date) => {
      const vm = planFor(date);
      const weeks = vm.agendaTreeGoals[0].milestones;
      expect(weeks).toHaveLength(3);
      expect(weeks.reduce((n, w) => n + w.milestones.length, 0)).toBe(15);
    });
  });

  /* The month node's date is zero-padded and the week/day ones are not — both
     go through moment before they are compared or sent, so the skew is
     harmless, but it is why that normalising step cannot be dropped. */
  it('dates the month node at the first of the month', () => {
    expect(planFor('15-10-2026').agendaTreeGoals[0].date).toBe('01-10-2026');
    expect(planFor('15-10-2026').agendaTreeGoals[0].milestones[0].date).toBe('9-10-2026');
  });
});

describe('AgendaTreeTime — laying goals over the skeleton', () => {
  /* One month goal with a week goal under it and a day goal under that. The
     server's dates are zero-padded; the skeleton's are not, which is why the
     match normalises before comparing. */
  const payload = [
    { period: 'month', date: '01-10-2026', goalItems: [{ id: 'm1', body: 'Ship the dashboard' }] },
    {
      period: 'week',
      date: '09-10-2026',
      goalItems: [{ id: 'w1', body: 'Wire the charts', goalRef: 'm1' }],
    },
    {
      period: 'day',
      date: '06-10-2026',
      goalItems: [{ id: 'd1', body: 'Pick a chart library', goalRef: 'w1' }],
    },
  ];

  it('fills the month, its week and that week’s day', () => {
    const vm = planFor('15-10-2026');
    vm.buildAgendaTreeGoals(payload);
    const names = nodeNames(vm);
    expect(names.month).toBe('Ship the dashboard');
    expect(names.weeks).toEqual(['Wire the charts', '', '']);
    expect(names.days[0]).toEqual(['', 'Pick a chart library', '', '', '']);
  });

  it('shows only the week goals under the SELECTED month goal', () => {
    const twoGoals = [
      {
        period: 'month',
        date: '01-10-2026',
        goalItems: [{ id: 'm1', body: 'Ship the dashboard' }, { id: 'm2', body: 'Hire a designer' }],
      },
      {
        period: 'week',
        date: '09-10-2026',
        goalItems: [
          { id: 'w1', body: 'Wire the charts', goalRef: 'm1' },
          { id: 'w2', body: 'Write the brief', goalRef: 'm2' },
        ],
      },
    ];

    const first = planFor('15-10-2026');
    first.buildAgendaTreeGoals(twoGoals);
    expect(first.monthGoalRef).toBe('m1');
    expect(nodeNames(first).weeks[0]).toBe('Wire the charts');

    const second = planFor('15-10-2026');
    second.monthGoalRef = 'm2';
    second.buildAgendaTreeGoals(twoGoals);
    expect(nodeNames(second).month).toBe('Hire a designer');
    expect(nodeNames(second).weeks[0]).toBe('Write the brief');
  });

  it('leaves a day goal blank when it hangs off a week goal that is not shown', () => {
    const vm = planFor('15-10-2026');
    vm.monthGoalRef = 'm1';
    vm.buildAgendaTreeGoals([
      ...payload,
      {
        period: 'day',
        date: '07-10-2026',
        goalItems: [{ id: 'd2', body: 'Someone else’s goal', goalRef: 'other-week' }],
      },
    ]);
    expect(nodeNames(vm).days[0][2]).toBe('');
  });

  it('offers every month goal to the picker', () => {
    const vm = planFor('15-10-2026');
    vm.buildAgendaTreeGoals(payload);
    expect(vm.monthGoals).toEqual([{ id: 'm1', name: 'Ship the dashboard' }]);
  });

  it('builds the empty skeleton when the routine has no goals at all', () => {
    const vm = planFor('15-10-2026');
    vm.buildAgendaTreeGoals([]);
    const names = nodeNames(vm);
    expect(names.month).toBe('');
    expect(names.weeks).toEqual(['', '', '']);
  });
});

describe('AgendaTreeTime — the month picker, which used to do nothing', () => {
  it('moves the date to the new month so the tree is rebuilt', () => {
    const vm = { date: '15-10-2026', monthGoalRef: 'm1' };
    watch.selectedMonth.call(vm, '1', '9');
    expect(vm.date).toBe('01-02-2026');
  });

  it('drops the selected month goal, whose id belonged to the old month', () => {
    const vm = { date: '15-10-2026', monthGoalRef: 'm1' };
    watch.selectedMonth.call(vm, '1', '9');
    expect(vm.monthGoalRef).toBe('');
  });

  it('ignores the write `buildCleanAgendaTreeGoals` makes on first build', () => {
    const vm = { date: '15-10-2026', monthGoalRef: 'm1' };
    watch.selectedMonth.call(vm, '9', '');
    expect(vm.date).toBe('15-10-2026');
    expect(vm.monthGoalRef).toBe('m1');
  });

  it('reloads BOTH reads when the date moves — the routine and the goals', () => {
    const calls = [];
    const vm = { reload: () => calls.push('reload') };
    watch.date.call(vm, '01-02-2026', '15-10-2026');
    expect(calls).toEqual(['reload']);
  });
});

describe('AgendaTreeTime — the routine picker is local state, not the route prop', () => {
  it('seeds the selection from the route param', () => {
    const vm = AgendaTreeTime.data.call({ selectedTaskRef: 'abc123' });
    expect(vm.taskRef).toBe('abc123');
  });

  it('follows the route when Progress deep-links at a different routine', () => {
    const vm = { taskRef: 'abc123' };
    watch.selectedTaskRef.call(vm, 'def456');
    expect(vm.taskRef).toBe('def456');
  });

  it('reloads this routine’s goals, and forgets the other routine’s month goal', () => {
    const calls = [];
    const vm = { monthGoalRef: 'm1', fetchMonthTaskGoalsData: () => calls.push('goals') };
    watch.taskRef.call(vm, 'def456', 'abc123');
    expect(calls).toEqual(['goals']);
    expect(vm.monthGoalRef).toBe('');
  });
});

describe('AgendaTreeTime — reading the goals', () => {
  const vmFor = (overrides = {}) => ({
    date: '15-10-2026',
    taskRef: 'abc123',
    isLoading: false,
    loadError: false,
    monthTaskGoals: [],
    built: [],
    buildAgendaTreeGoals(goals) { this.built.push(goals); },
    buildCleanAgendaTreeGoals() { this.built.push('clean'); },
    ...overrides,
  });

  it('surfaces a failed read instead of leaving an empty-looking plan', async () => {
    const vm = vmFor({ $goals: { fetchMonthTaskGoals: () => Promise.reject(new Error('502')) } });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await methods.fetchMonthTaskGoalsData.call(vm);
    expect(vm.loadError).toBe(true);
    expect(vm.isLoading).toBe(false);
    console.error.mockRestore();
  });

  it('clears a previous failure once a read lands', async () => {
    const vm = vmFor({
      loadError: true,
      $goals: { fetchMonthTaskGoals: () => Promise.resolve([{ period: 'month', goalItems: [] }]) },
    });
    await methods.fetchMonthTaskGoalsData.call(vm);
    expect(vm.loadError).toBe(false);
    expect(vm.built).toHaveLength(1);
  });

  it('shows the bare skeleton, and asks for nothing, with no routine chosen', async () => {
    const calls = [];
    const vm = vmFor({
      taskRef: '',
      $goals: { fetchMonthTaskGoals: () => { calls.push('asked'); return Promise.resolve([]); } },
    });
    await methods.fetchMonthTaskGoalsData.call(vm);
    expect(calls).toEqual([]);
    expect(vm.built).toEqual(['clean']);
  });
});

describe('AgendaTreeTime — adding a goal to a node', () => {
  const sheet = () => ({
    selectedDate: '',
    currentGoalPeriod: '',
    selectedBody: 'left over',
    goalDetailsDialog: false,
  });

  it('opens on an empty node, seeded with that node’s date and period', () => {
    const vm = sheet();
    methods.addFor.call(vm, { period: 'week', name: '', date: '9-10-2026' });
    expect(vm.goalDetailsDialog).toBe(true);
    expect(vm.currentGoalPeriod).toBe('week');
    // Zero-padded for the server, which is what the old `correctDate` was for.
    expect(vm.selectedDate).toBe('09-10-2026');
    expect(vm.selectedBody).toBe('');
  });

  it('does nothing on a node that already holds a goal', () => {
    const vm = sheet();
    methods.addFor.call(vm, { period: 'day', name: 'Pick a chart library', date: '6-10-2026' });
    expect(vm.goalDetailsDialog).toBe(false);
  });

  it('titles the sheet for the period being added', () => {
    expect(computed.addTitle.call({ currentGoalPeriod: 'month' })).toBe('Add a month goal');
    expect(computed.addTitle.call({ currentGoalPeriod: 'day' })).toBe('Add a day goal');
    expect(computed.addTitle.call({ currentGoalPeriod: '' })).toBe('Add a goal');
  });

  it('refetches on close so a just-added goal shows on its node', () => {
    const calls = [];
    const vm = { fetchMonthTaskGoalsData: () => calls.push('goals') };
    methods.toggleGoalDetailsDialog.call(vm, false);
    expect(vm.goalDetailsDialog).toBe(false);
    expect(calls).toEqual(['goals']);
  });

  it('does not refetch merely because the sheet opened', () => {
    const calls = [];
    const vm = { fetchMonthTaskGoalsData: () => calls.push('goals') };
    methods.toggleGoalDetailsDialog.call(vm, true);
    expect(calls).toEqual([]);
  });
});

describe('AgendaTreeTime — what the cards say', () => {
  const filled = (names) => {
    const vm = planFor('15-10-2026');
    vm.buildAgendaTreeGoals(names);
    const monthNode = computed.monthNode.call(vm);
    const weeks = computed.weeks.call({ monthNode });
    return computed.filledLabel.call({ allNodes: computed.allNodes.call({ monthNode, weeks }) });
  };

  it('counts how much of the plan is actually set', () => {
    expect(filled([])).toBe('0 of 19 set');
    expect(filled([
      { period: 'month', date: '01-10-2026', goalItems: [{ id: 'm1', body: 'Ship it' }] },
      {
        period: 'week',
        date: '09-10-2026',
        goalItems: [{ id: 'w1', body: 'Wire the charts', goalRef: 'm1' }],
      },
    ])).toBe('2 of 19 set');
  });

  it('says nothing at all before the skeleton exists', () => {
    expect(computed.filledLabel.call({ allNodes: [] })).toBe('');
  });

  it('labels a week by the days it actually holds, not by its Friday', () => {
    const week = {
      date: '9-10-2026',
      milestones: [{ date: '5-10-2026' }, { date: '6-10-2026' }, { date: '9-10-2026' }],
    };
    expect(methods.weekRange(week)).toBe('05 – 09 Oct');
  });

  it('falls back to the week date when a week somehow has no days', () => {
    expect(methods.weekRange({ date: '9-10-2026', milestones: [] })).toBe('09 Oct');
  });

  it('labels a day row with its weekday', () => {
    expect(methods.dayLabel('5-10-2026')).toBe('Mon 05');
  });

  it('subtitles the shell with the routine and month, and nothing on a phone', () => {
    const vm = {
      isPhone: false, routineName: 'Start Work', monthLabel: 'October 2026',
    };
    expect(computed.subLabel.call(vm)).toBe('Start Work · October 2026');
    expect(computed.subLabel.call({ ...vm, routineName: '' })).toBe('October 2026');
    expect(computed.subLabel.call({ ...vm, isPhone: true })).toBe('');
  });

  it('names the routine from the tasklist, and says nothing when it is not there', () => {
    const tasklist = [{ id: 'abc123', name: 'Start Work' }];
    expect(computed.routineName.call({ tasklist, taskRef: 'abc123' })).toBe('Start Work');
    expect(computed.routineName.call({ tasklist, taskRef: 'gone' })).toBe('');
  });
});
