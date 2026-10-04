/* eslint-env jest */
/**
 * RoutineFocus page decisions, exercised against a minimal vm-like context (no
 * mount), matching the page test convention.
 *
 * What is covered here is the behaviour that only the page can get wrong:
 * which shell it picks, how it derives the agent's `firing` stage, that a
 * duplicated tasklist id cannot render twice, and that the ticked ring does NOT
 * try to untick (the XP ledger has already banked the day's points).
 */
// The page pulls the ui barrels, which transitively import third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in these decisions.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
// Same for the native sign-in plugins, which ship untranspiled ESM, and the
// gitignored blob config the drawer's Log out path reads client ids from.
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const fs = require('fs');
const path = require('path');
const Vue = require('vue');
const moment = require('moment');

// eslint-disable-next-line import/no-extraneous-dependencies
const { FOCUS_VARIANTS } = require('@routine-notes/ui/constants/routineFocus');

const RoutineFocus = require('../RoutineFocus.vue').default;

const { computed, methods } = RoutineFocus;

const call = (name, ctx) => computed[name].call(ctx);

describe('RoutineFocus shell selection', () => {
  const shellFor = (breakpoint) => call('shell', { $vuetify: { breakpoint } });

  it('is the phone below 600', () => {
    expect(shellFor({ xsOnly: true, width: 412 })).toBe('phone');
  });

  // iPad mini landscape is 1133 — the side-by-side pane layout, not desktop.
  it('is the tablet between 600 and 1263', () => {
    expect(shellFor({ xsOnly: false, width: 1133 })).toBe('tablet');
    expect(shellFor({ xsOnly: false, width: 600 })).toBe('tablet');
    expect(shellFor({ xsOnly: false, width: 1263 })).toBe('tablet');
  });

  it('is the desktop from 1264 up', () => {
    expect(shellFor({ xsOnly: false, width: 1264 })).toBe('desktop');
    expect(shellFor({ xsOnly: false, width: 1440 })).toBe('desktop');
  });
});

describe('RoutineFocus tasklist', () => {
  // A routineDate.tasklist can repeat a task _id, which gives duplicate v-for
  // keys and two cards rendering the same routine.
  it('drops a repeated task id and anything without one', () => {
    const list = call('tasklist', {
      routineDate: {
        tasklist: [
          { id: 'a', name: 'First' },
          { id: 'a', name: 'First again' },
          { id: null, name: 'No id' },
          { id: 'b', name: 'Second' },
        ],
      },
    });
    expect(list.map((t) => t.id)).toEqual(['a', 'b']);
    expect(list[0].name).toBe('First');
  });

  it('is empty before the routine loads', () => {
    expect(call('tasklist', { routineDate: null })).toEqual([]);
  });
});

describe('RoutineFocus pass/wait guard', () => {
  // Pass/wait decides "passed" from the time of day, so it may only write to
  // TODAY's document; another day's stale doc/id stamped tomorrow "Missed".
  const ctx = (over) => ({
    isToday: true,
    todayDate: '04-10-2026',
    did: 'today-doc',
    routineDate: { id: 'today-doc', date: '04-10-2026' },
    ...over,
  });

  it("runs when the loaded document is today's", () => {
    expect(call('canMaintainPassWait', ctx())).toBe(true);
  });

  it("refuses another day's document even when the selected date is today", () => {
    expect(call('canMaintainPassWait', ctx({
      routineDate: { id: 'tomorrow-doc', date: '05-10-2026' },
    }))).toBe(false);
  });

  it('refuses a stale did left over from another day', () => {
    expect(call('canMaintainPassWait', ctx({ did: 'tomorrow-doc' }))).toBe(false);
  });

  it('refuses when the viewed day is not today or nothing has loaded', () => {
    expect(call('canMaintainPassWait', ctx({ isToday: false }))).toBe(false);
    expect(call('canMaintainPassWait', ctx({ routineDate: null }))).toBe(false);
    expect(call('canMaintainPassWait', ctx({ did: '' }))).toBe(false);
  });
});

describe('RoutineFocus agent stage', () => {
  const ctx = (over = {}) => ({
    resolvedFocusId: 'sw',
    endEventFiring: {},
    effectiveAgentStatus: () => '',
    ...over,
  });

  it('is none without a focused routine', () => {
    expect(call('agentStage', ctx({ resolvedFocusId: '' }))).toBe('none');
  });

  it('reports the store status when nothing is firing', () => {
    expect(call('agentStage', ctx({ effectiveAgentStatus: () => 'listening' })))
      .toBe('listening');
  });

  // The store has no end-event status of its own — it shows 'running' for both
  // dispatches — so `firing` is derived from the end event THIS page sent.
  it('reports firing while the page has an end event on the wire', () => {
    const vm = ctx({
      endEventFiring: { sw: true },
      effectiveAgentStatus: () => 'running',
    });
    expect(call('agentStage', vm)).toBe('firing');
  });

  it('only fires for the routine whose end event is out', () => {
    const vm = ctx({
      endEventFiring: { other: true },
      effectiveAgentStatus: () => 'running',
    });
    expect(call('agentStage', vm)).toBe('running');
  });

  it('treats a live stage as live and a settled one as not', () => {
    const live = (stage) => call('agentLive', { agentStage: stage });
    expect(live('waiting')).toBe(true);
    expect(live('running')).toBe(true);
    expect(live('listening')).toBe(true);
    expect(live('firing')).toBe(true);
    expect(live('finished')).toBe(false);
    expect(live('failed')).toBe(false);
    expect(live('none')).toBe(false);
  });
});

describe('RoutineFocus effectiveAgentStatus', () => {
  const vm = (status, items) => ({
    $agent: { statusByRoutineId: { sw: status } },
    dayGoalItems: items,
    taskAgentEndEventDone: methods.taskAgentEndEventDone,
  });

  // A late start-event dispatch resolving after the end event already saved a
  // transcript must not leave the badge stuck on 'listening'.
  it('promotes listening to finished once a transcript is saved', () => {
    const ctx = vm('listening', [{ taskRef: 'sw', reward: '<p>done</p>' }]);
    ctx.taskAgentEndEventDone = methods.taskAgentEndEventDone.bind(ctx);
    expect(methods.effectiveAgentStatus.call(ctx, 'sw')).toBe('finished');
  });

  it('leaves listening alone while no transcript exists', () => {
    const ctx = vm('listening', [{ taskRef: 'sw', reward: null }]);
    ctx.taskAgentEndEventDone = methods.taskAgentEndEventDone.bind(ctx);
    expect(methods.effectiveAgentStatus.call(ctx, 'sw')).toBe('listening');
  });
});

describe('RoutineFocus ring action', () => {
  const ctx = (focusRow, over = {}) => ({
    focusRow,
    actionSheetOpen: false,
    onMiniClick: jest.fn(),
    tickRoutine: jest.fn(),
    // The real guard, with the day not skipped — so these cases exercise the
    // ring, and the skip-day block gets its own describe below.
    isSkippedDay: false,
    $notify: jest.fn(),
    blockedBySkip: methods.blockedBySkip,
    ...over,
  });

  // Starting an agent happens from the sheet, so the current routine's ring
  // must open it rather than ticking straight through.
  it('opens the action sheet on the current unticked routine', () => {
    const vm = ctx({ id: 'sw', isCurrent: true, ticked: false });
    methods.onRingAction.call(vm);
    expect(vm.actionSheetOpen).toBe(true);
    expect(vm.tickRoutine).not.toHaveBeenCalled();
  });

  it('opens the action sheet on a redeemable routine, so the price is shown', () => {
    const vm = ctx({
      id: 'wo', isCurrent: false, ticked: false, redeemable: true,
    });
    methods.onRingAction.call(vm);
    expect(vm.actionSheetOpen).toBe(true);
  });

  it('ticks a plain upcoming routine directly', () => {
    const row = {
      id: 'lw', isCurrent: false, ticked: false, redeemable: false,
    };
    const vm = ctx(row);
    methods.onRingAction.call(vm);
    expect(vm.tickRoutine).toHaveBeenCalledWith(row);
    expect(vm.actionSheetOpen).toBe(false);
  });

  it('does nothing without a focused routine', () => {
    const vm = ctx(null);
    methods.onRingAction.call(vm);
    expect(vm.tickRoutine).not.toHaveBeenCalled();
    expect(vm.onMiniClick).not.toHaveBeenCalled();
  });
});

describe('RoutineFocus ticked-ring gesture', () => {
  const ctx = (over = {}) => ({
    agentLive: false,
    agentFinished: false,
    resolvedFocusId: 'sw',
    openAgentResult: jest.fn(),
    $notify: jest.fn(),
    ...over,
  });

  it('opens the agent result when one is waiting', () => {
    const vm = ctx({ agentFinished: true });
    methods.onMiniClick.call(vm);
    expect(vm.openAgentResult).toHaveBeenCalled();
    expect(vm.$notify).not.toHaveBeenCalled();
  });

  /**
   * `tickRoutineItem` refuses to act on an already-ticked task and the XP
   * ledger settles a day's stimuli once, so reverting a tick would credit
   * points the server has banked. The gesture must say so, not silently fail.
   */
  it('explains that a tick is final instead of attempting an untick', () => {
    const vm = ctx();
    methods.onMiniClick.call(vm);
    expect(vm.$notify).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Already ticked',
    }));
    expect(vm.openAgentResult).not.toHaveBeenCalled();
  });

  it('ignores the tap entirely while the agent is still working', () => {
    const vm = ctx({ agentLive: true, agentFinished: true });
    methods.onMiniClick.call(vm);
    expect(vm.openAgentResult).not.toHaveBeenCalled();
    expect(vm.$notify).not.toHaveBeenCalled();
  });
});

describe('RoutineFocus redeem price', () => {
  const costFor = (task, xpBalance) => methods.redeemCostForTask.call(
    { xpBalance, getRedeemCost: methods.getRedeemCost },
    task,
  );

  it('charges the frozen price a passed task snapshotted', () => {
    expect(costFor({ redeemable: true, passedPoints: 12, points: 20 }, null)).toBe(12);
  });

  it('falls back to live points for a task passed before the snapshot', () => {
    expect(costFor({ redeemable: true, points: 20 }, null)).toBe(20);
  });

  it('is free for a subscriber and for anything not redeemable', () => {
    expect(costFor({ redeemable: true, passedPoints: 12 }, { entitled: true })).toBe(0);
    expect(costFor({ redeemable: false, passedPoints: 12 }, null)).toBe(0);
    expect(costFor(null, null)).toBe(0);
  });
});

describe('RoutineFocus slot counters (the agent end-event rule)', () => {
  // D-20: the counter is points-derived slots from the routine's time gap, not
  // a checkbox count — and it is what gates the agent's end event.
  const task = (dSplit, kSplit, points, kEarned) => ({
    points,
    stimuli: [
      { name: 'D', splitRate: dSplit, earned: 0 },
      { name: 'K', splitRate: kSplit, earned: kEarned },
    ],
  });

  it('derives the total from the D/K split rates', () => {
    expect(methods.countTaskTotal(task(6, 1, 12, 0))).toBe(6);
    expect(methods.countTaskTotal(task(4, 1, 10, 0))).toBe(4);
  });

  it('derives the completed count from K earned over the task points', () => {
    const ctx = { countTaskTotal: methods.countTaskTotal };
    expect(methods.countTaskCompleted.call(ctx, task(6, 1, 12, 6))).toBe(3);
    expect(methods.countTaskCompleted.call(ctx, task(6, 1, 12, 12))).toBe(6);
    expect(methods.countTaskCompleted.call(ctx, task(6, 1, 12, 0))).toBe(0);
  });

  it('is zero rather than NaN for a task with no stimuli', () => {
    const ctx = { countTaskTotal: methods.countTaskTotal };
    expect(methods.countTaskTotal({ stimuli: [] })).toBe(0);
    expect(methods.countTaskCompleted.call(ctx, { stimuli: [] })).toBe(0);
  });
});

describe('RoutineFocus computed graph', () => {
  const split = (d, k, g, dEarned = 0) => {
    const stimuli = [
      { name: 'D', splitRate: d, earned: dEarned },
      { name: 'K', splitRate: k, earned: 0 },
    ];
    if (g) stimuli.push({ name: 'G', splitRate: g, earned: 0 });
    return stimuli;
  };

  const TASKS = [
    {
      id: 'mp',
      name: 'Morning Pages',
      time: '06:30',
      points: 10,
      ticked: true,
      passed: true,
      stimuli: split(4, 1, 0, 10),
    },
    {
      id: 'sw',
      name: 'Start Work',
      time: '09:00',
      points: 12,
      ticked: false,
      passed: false,
      stimuli: split(6, 1, 3),
    },
    {
      id: 'lw',
      name: 'Lunch Walk',
      time: '12:30',
      points: 8,
      ticked: false,
      passed: false,
      stimuli: split(4, 1, 0),
    },
  ];

  /**
   * `rows` is built WITH `resolvedFocusId`, so resolving the focus through a row
   * would make rows -> resolvedFocusId -> rows a circular computed — which Vue
   * only reveals when the graph is actually evaluated.
   */
  const TODAY = moment().format('DD-MM-YYYY');
  const YESTERDAY = moment().subtract(1, 'day').format('DD-MM-YYYY');
  const AT_0930 = () => moment().startOf('day').add(9, 'hours').add(30, 'minutes');

  const graph = (over = {}) => {
    const vm = new Vue({
      computed: RoutineFocus.computed,
      data() {
        return {
          date: TODAY,
          todayDate: TODAY,
          now: AT_0930(),
          routineDate: { id: 'r1', tasklist: TASKS },
          goals: [{
            id: 'd1',
            period: 'day',
            date: TODAY,
            goalItems: [
              {
                id: 'g1', body: 'Ship dashboard PR', isComplete: true, taskRef: 'sw', subTasks: [],
              },
              {
                id: 'g2', body: 'Reply to Ana', isComplete: false, taskRef: 'sw', subTasks: [],
              },
            ],
          }],
          xpBalance: {
            available: 120, pendingToday: 0, entitled: false, used: 0, earned: 120,
          },
          cascadeChildren: [],
          focusRoutineId: '',
          period: 'day',
          checklistOpen: true,
          weekStripOpen: false,
          fly: null,
          endEventFiring: {},
          goalsFirstLoad: false,
          routineFirstLoad: false,
          loadError: false,
          ...over,
        };
      },
      methods: {
        decorateItem: RoutineFocus.methods.decorateItem,
        isAgentTargetItem: () => false,
        countTotal: RoutineFocus.methods.countTotal,
        weekOfMonth: RoutineFocus.methods.weekOfMonth,
        effectiveAgentStatus: () => '',
        redeemCostForTask: () => 0,
        findFirstGoalIdForRoutine: () => null,
      },
      render: () => null,
    });
    vm.$vuetify = { breakpoint: { xsOnly: true, width: 412 } };
    vm.$route = { path: '/home', params: {}, meta: {} };
    vm.$agent = { statusByRoutineId: {}, getByTaskRef: () => null };
    vm.$apollo = { queries: {} };
    return vm;
  };

  it('resolves rows and the focus without recursing', () => {
    const vm = graph();
    expect(vm.rows.map((r) => r.id)).toEqual(['mp', 'sw', 'lw']);
    expect(vm.currentRoutineId).toBe('sw');
    expect(vm.resolvedFocusId).toBe('sw');
    expect(vm.focusIndex).toBe(1);
    expect(vm.focusRow.isFocus).toBe(true);
    expect(vm.currentRow.id).toBe('sw');
  });

  it('attaches each routine’s own checklist to it', () => {
    const vm = graph();
    expect(vm.focusItems.map((i) => i.id)).toEqual(['g1', 'g2']);
    expect(vm.focusRow.doneCount).toBe(1);
    expect(vm.focusRow.totalCount).toBe(2);
    expect(vm.dayDoneCount).toBe(1);
    expect(vm.dayTotalCount).toBe(2);
  });

  it('reports the focused routine’s window and the deck counters', () => {
    const vm = graph();
    expect(vm.focusWindowInfo.endTime).toBe('12:30');
    expect(vm.focusWindowInfo.statusLabel).toBe('In progress');
    expect(vm.tickedCount).toBe(1);
    expect(vm.routinesLeft).toBe(2);
    expect(vm.deckPeeks.map((p) => p.id)).toEqual(['lw']);
    expect(vm.showBackToNow).toBe(false);
  });

  it('follows an explicit focus and offers Back to now', () => {
    const vm = graph({ focusRoutineId: 'lw' });
    expect(vm.resolvedFocusId).toBe('lw');
    expect(vm.showBackToNow).toBe(true);
    expect(vm.deckPeeks).toEqual([]);
  });

  // A focus held on a routine that is gone (edited away, or a day switch) must
  // fall back to the clock rather than blanking the screen.
  it('ignores a focus the day no longer holds', () => {
    const vm = graph({ focusRoutineId: 'deleted' });
    expect(vm.resolvedFocusId).toBe('sw');
  });

  it('falls back to the first routine outside today', () => {
    const vm = graph({ date: YESTERDAY });
    expect(vm.isToday).toBe(false);
    expect(vm.currentRoutineId).toBe('');
    expect(vm.resolvedFocusId).toBe('mp');
  });

  it('builds the card and chat props the children expect', () => {
    const vm = graph();
    expect(vm.cardProps.variant).toBe('phone');
    expect(vm.cardProps.period).toBe('day');
    expect(vm.cardProps.items).toHaveLength(2);
    expect(vm.chatProps.routine.id).toBe('sw');
    expect(vm.chatProps.scores).toEqual(vm.stimulusTotals);
    expect(vm.composerPlaceholder).toBe('Message Start Work…');
  });

  it('has nothing to render for a day with no routine', () => {
    const vm = graph({ routineDate: { id: 'r1', tasklist: [] } });
    expect(vm.rows).toEqual([]);
    expect(vm.focusRow).toBeNull();
    expect(vm.resolvedFocusId).toBe('');
    expect(vm.emptyMessage).toContain('No routine items yet');
  });
});

// The action sheet is the ONLY way to start a routine on this screen, so it has
// to carry the quick-task form — type the task, pick the parent goal it rolls
// up into — not just a button row. Without it a routine with no checklist could
// not be given one, and an agent has nothing to run against until it has one.
describe('RoutineFocus action sheet', () => {
  const { watch } = RoutineFocus;

  it('registers the quick-task form, which brings the parent goal selector', () => {
    expect(RoutineFocus.components.QuickGoalCreation).toBeTruthy();
  });

  it('closes the sheet and ticks the routine on Start Task', () => {
    const vm = { actionSheetOpen: true, focusRow: { id: 'sw' }, tickRoutine: jest.fn() };
    methods.onStartTask.call(vm);
    expect(vm.tickRoutine).toHaveBeenCalledWith({ id: 'sw' }, { fireAgent: false });
    expect(vm.actionSheetOpen).toBe(false);
  });

  // The container creates the goal item, then emits the routine task it was
  // filed against. The sheet ticks its OWN focused row either way — that row
  // carries `redeemable`, which the raw tasklist entry does not.
  it('ticks the focused row, not whatever the form hands back', () => {
    const focusRow = { id: 'sw', redeemable: true };
    const vm = { actionSheetOpen: true, focusRow, tickRoutine: jest.fn() };
    methods.onStartTask.call(vm, { id: 'sw', name: 'Wake Up' });
    expect(vm.tickRoutine).toHaveBeenCalledWith(focusRow, { fireAgent: false });
  });

  // The form caches the Goal Task dropdown and its own loading state, so a
  // stale mount would offer last week's parent goals and a dead spinner.
  it('remounts the form each time the sheet opens', () => {
    const vm = { actionSheetKey: 0 };
    watch.actionSheetOpen.call(vm, true);
    expect(vm.actionSheetKey).toBe(1);
    watch.actionSheetOpen.call(vm, false);
    expect(vm.actionSheetKey).toBe(1);
  });

  it('hands the form an array even before the day goals load', () => {
    expect(call('displayGoals', { goals: null })).toEqual([]);
    const goals = [{ id: 'g1' }];
    expect(call('displayGoals', { goals })).toBe(goals);
  });
});

// ---------------------------------------------------------------------------
// Skip day
// ---------------------------------------------------------------------------
// `/home/classic` already owned this as a header switch; on the focus screen the
// header has no room for one, so the gesture is a long press on today's cell in
// the week strip. The mutation is the same `skipRoutine` the dashboard calls.
describe('RoutineFocus skip day', () => {
  const ctx = (over = {}) => ({
    isSkippedDay: true,
    todayDate: '12-09-2026',
    date: '12-09-2026',
    skipSheetOpen: false,
    $notify: jest.fn(),
    handleDateSelected: jest.fn(),
    blockedBySkip: methods.blockedBySkip,
    ...over,
  });

  it('a long press on today opens the skip sheet', () => {
    const vm = ctx();
    methods.onDayLongPress.call(vm, '12-09-2026');
    expect(vm.skipSheetOpen).toBe(true);
  });

  it('a long press on another day is ignored — only today can be skipped', () => {
    const vm = ctx();
    methods.onDayLongPress.call(vm, '11-09-2026');
    expect(vm.skipSheetOpen).toBe(false);
  });

  // The strip can be showing another day. Skipping is about today, so the
  // gesture brings the screen back to today before asking.
  it('selects today first when the screen is showing another day', () => {
    const vm = ctx({ date: '10-09-2026' });
    methods.onDayLongPress.call(vm, '12-09-2026');
    expect(vm.handleDateSelected).toHaveBeenCalledWith('12-09-2026');
    expect(vm.skipSheetOpen).toBe(true);
  });

  it('a skipped day blocks the ring and says why', () => {
    const vm = {
      focusRow: { id: 'sw', isCurrent: true, ticked: false },
      actionSheetOpen: false,
      onMiniClick: jest.fn(),
      tickRoutine: jest.fn(),
      isSkippedDay: true,
      $notify: jest.fn(),
      blockedBySkip: methods.blockedBySkip,
    };
    methods.onRingAction.call(vm);
    expect(vm.actionSheetOpen).toBe(false);
    expect(vm.tickRoutine).not.toHaveBeenCalled();
    expect(vm.$notify).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Today is skipped',
    }));
  });

  // A ticked ring still opens the agent result — that gesture reads state, it
  // does not bank anything, so a skipped day has no reason to refuse it.
  it('still lets a ticked ring open the agent result', () => {
    const vm = {
      focusRow: { id: 'sw', ticked: true },
      onMiniClick: jest.fn(),
      tickRoutine: jest.fn(),
      isSkippedDay: true,
      $notify: jest.fn(),
      blockedBySkip: methods.blockedBySkip,
    };
    methods.onRingAction.call(vm);
    expect(vm.onMiniClick).toHaveBeenCalled();
  });

  it('a skipped day blocks tickRoutine itself, not just the ring', async () => {
    const vm = {
      isSkippedDay: true,
      $notify: jest.fn(),
      blockedBySkip: methods.blockedBySkip,
      trackTaskEvent: jest.fn(),
    };
    await methods.tickRoutine.call(vm, { id: 'sw', name: 'Start Work' });
    expect(vm.trackTaskEvent).not.toHaveBeenCalled();
  });

  it('is nothing but a pass-through when the day is not skipped', () => {
    const vm = { isSkippedDay: false, $notify: jest.fn() };
    expect(methods.blockedBySkip.call(vm)).toBe(false);
    expect(vm.$notify).not.toHaveBeenCalled();
  });

  it('exposes the skipped day to the strip and the card', () => {
    expect(call('isSkippedDay', { routineDate: { skip: true } })).toBe(true);
    expect(call('isSkippedDay', { routineDate: { skip: false } })).toBe(false);
    expect(call('isSkippedDay', { routineDate: null })).toBe(false);
    expect(call('skippedDates', { isSkippedDay: true, date: '12-09-2026' }))
      .toEqual(['12-09-2026']);
    expect(call('skippedDates', { isSkippedDay: false, date: '12-09-2026' })).toEqual([]);
  });

  // `skipRoutine` has no `reason` argument and `Routine` has no field for one,
  // so the reason is kept where the day's other events are: the routine thread.
  it('records the reason as a chat event and refetches the day', () => {
    const vm = {
      $apollo: { queries: { routineDate: { refetch: jest.fn() } } },
      postChatEvent: jest.fn(),
      $notify: jest.fn(),
      resolvedFocusId: 'sw',
    };
    methods.onSkipChanged.call(vm, { skip: true, reason: 'travel' });
    expect(vm.$apollo.queries.routineDate.refetch).toHaveBeenCalled();
    expect(vm.postChatEvent).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Day skipped · travel',
      taskRef: 'sw',
    }));
  });

  it('says the other thing on an undo', () => {
    const vm = {
      $apollo: { queries: {} },
      postChatEvent: jest.fn(),
      $notify: jest.fn(),
      resolvedFocusId: 'sw',
    };
    methods.onSkipChanged.call(vm, { skip: false, reason: '' });
    expect(vm.postChatEvent).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Skip undone — routines are back on',
    }));
    expect(vm.$notify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Skip undone' }));
  });
});

// ---------------------------------------------------------------------------
// The goal-item page
// ---------------------------------------------------------------------------
describe('RoutineFocus goal-item page', () => {
  const ITEM = {
    id: 'g1',
    body: 'Ship dashboard PR',
    taskRef: 'sw',
    goalRef: 'wg1',
    isComplete: false,
    reward: '',
    tags: ['project:dashboard'],
    subTasks: [],
  };
  const ctx = (over = {}) => ({
    openGoalItemId: 'g1',
    dayGoalItems: [ITEM],
    goals: [
      {
        id: 'd1', period: 'day', date: '12-09-2026', goalItems: [ITEM],
      },
      {
        id: 'w1',
        period: 'week',
        date: '12-09-2026',
        goalItems: [{ id: 'wg1', body: 'Ship the dashboard' }],
      },
    ],
    rows: [{ id: 'sw', name: 'Start Work', time: '09:00' }],
    tasklist: [{ id: 'sw', name: 'Start Work', tags: ['area:work'] }],
    date: '12-09-2026',
    todayDate: '12-09-2026',
    rewardSeen: {},
    decorateItem: (item) => ({ ...item, ready: false }),
    $agent: { getByTaskRef: () => null },
    ...over,
  });
  /**
   * The sheet's labels all read `openGoalItem` / `openGoalItemDate`, which are
   * themselves computeds. Resolve those first so each label is tested against the
   * same graph the page builds.
   */
  const resolved = (over = {}) => {
    const vm = ctx(over);
    vm.openGoalItem = call('openGoalItem', vm);
    vm.openGoalItemDate = call('openGoalItemDate', vm);
    return vm;
  };

  // Held by id, not by object: the sheet edits the item, and a captured object
  // would keep rendering the values from the moment the row was tapped.
  it('resolves the open item from the live list', () => {
    const vm = ctx();
    expect(call('openGoalItem', vm).id).toBe('g1');
    expect(call('openGoalItem', ctx({ openGoalItemId: '' }))).toBeNull();
    expect(call('openGoalItem', ctx({ openGoalItemId: 'gone' }))).toBeNull();
  });

  it('finds the day document the item lives in — the mutation’s date', () => {
    expect(call('openGoalItemDate', ctx())).toBe('12-09-2026');
    expect(call('openGoalItemDate', ctx({ openGoalItemId: 'nope' }))).toBe('12-09-2026');
  });

  it('labels the routine, falling back to Inbox with no taskRef', () => {
    expect(call('goalSheetRoutineLabel', resolved())).toBe('Start Work · 09:00');
    const noRoutine = resolved({ dayGoalItems: [{ ...ITEM, taskRef: '' }] });
    expect(call('goalSheetRoutineLabel', noRoutine)).toBe('Inbox');
    const unknown = resolved({ dayGoalItems: [{ ...ITEM, taskRef: 'gone' }] });
    expect(call('goalSheetRoutineLabel', unknown)).toBe('Inbox');
  });

  it('names the period and the day the item belongs to', () => {
    expect(call('goalSheetPeriodLabel', resolved())).toBe('Day goal · 12 Sep 2026');
    expect(call('goalSheetDateLabel', resolved())).toBe('Today · Sat 12 Sep');
  });

  // goalRef holds an id. If the parent is not in the day read the row says "not
  // linked" rather than printing a Mongo id at the user.
  it('resolves the parent goal to its words, or to nothing', () => {
    expect(call('goalSheetGoalRefLabel', resolved())).toBe('Ship the dashboard');
    expect(call('goalSheetGoalRefLabel', resolved({
      dayGoalItems: [{ ...ITEM, goalRef: 'missing' }],
    }))).toBe('');
    expect(call('goalSheetGoalRefLabel', resolved({
      dayGoalItems: [{ ...ITEM, goalRef: '' }],
    }))).toBe('');
  });

  it('offers today, tomorrow and the coming Monday, with today marked', () => {
    const options = call('goalSheetDateOptions', resolved());
    expect(options.map((o) => o.key)).toEqual(['today', 'tomorrow', 'monday']);
    expect(options[0].active).toBe(true);
    expect(options[1].active).toBe(false);
    expect(options[1].date)
      .toBe(moment('12-09-2026', 'DD-MM-YYYY').add(1, 'days').format('DD-MM-YYYY'));
    expect(options[2].date)
      .toBe(moment('12-09-2026', 'DD-MM-YYYY').add(1, 'week').startOf('isoWeek')
        .format('DD-MM-YYYY'));
  });

  it('builds the tag universe from the day, the routines and what was typed before', () => {
    const universe = call('tagUniverse', ctx());
    expect(universe).toContain('project:dashboard');
    expect(universe).toContain('area:work');
    // buildTagUniverse adds every ancestor, so `area:` can be drilled into.
    expect(universe).toContain('area');
    expect(universe).toContain('project');
  });

  it('counts tag usage across the day', () => {
    const vm = ctx({
      dayGoalItems: [ITEM, { ...ITEM, id: 'g2', tags: ['project:dashboard', 'area:work'] }],
    });
    expect(call('tagUsage', vm)).toEqual({ 'project:dashboard': 2, 'area:work': 1 });
  });

  it('shows NEW only for an unread transcript', () => {
    const withReward = resolved({ dayGoalItems: [{ ...ITEM, reward: '<p>done</p>' }] });
    expect(call('goalSheetRewardNew', withReward)).toBe(true);
    expect(call('goalSheetRewardNew', resolved())).toBe(false);
    const seen = resolved({
      dayGoalItems: [{ ...ITEM, reward: '<p>done</p>' }],
      rewardSeen: { g1: true },
    });
    expect(call('goalSheetRewardNew', seen)).toBe(false);
  });

  it('names the agent and when it ran, and says nothing without a transcript', () => {
    const vm = resolved({
      dayGoalItems: [{ ...ITEM, reward: '<p>done</p>' }],
      $agent: { getByTaskRef: () => ({ name: 'PR Summarizer', lastRunAt: '' }) },
    });
    expect(call('goalSheetRewardMeta', vm))
      .toBe('Updated by PR Summarizer · end event · end event');
    expect(call('goalSheetRewardMeta', resolved())).toBe('');
  });

  it('opening a row holds its id; closing clears it', () => {
    const vm = { openGoalItemId: '' };
    methods.openItem.call(vm, { id: 'g9' });
    expect(vm.openGoalItemId).toBe('g9');
    methods.openItem.call(vm, null);
    expect(vm.openGoalItemId).toBe('g9');
    methods.closeGoalItem.call(vm);
    expect(vm.openGoalItemId).toBe('');
  });

  // The pill is the item's state made visible, so the useful thing is to watch
  // it change — closing would hide the only confirmation the gesture has.
  it('the status pill toggles the item and leaves the sheet open', () => {
    const vm = { openGoalItemId: 'g1', toggleItem: jest.fn() };
    methods.toggleOpenGoalItem.call(vm, ITEM);
    expect(vm.toggleItem).toHaveBeenCalledWith(ITEM);
    expect(vm.openGoalItemId).toBe('g1');
  });

  // Apollo normalizes an entity-level change out of the mutation result, so a
  // refetch after a title or tag edit is a round trip for nothing. Only list
  // membership needs one.
  it('refetches only for the changes that move an item in or out of a list', () => {
    const refetching = () => ({ refetchGoals: jest.fn() });
    ['delete', 'move-date', 'add-subtask', 'delete-subtask'].forEach((op) => {
      const vm = refetching();
      methods.onGoalItemChanged.call(vm, { op });
      expect(vm.refetchGoals).toHaveBeenCalled();
    });
    ['update-failed', 'rename-subtask', 'reorder-subtasks', 'complete-subtask'].forEach((op) => {
      const vm = refetching();
      methods.onGoalItemChanged.call(vm, { op });
      expect(vm.refetchGoals).not.toHaveBeenCalled();
    });
  });

  // The NEW pill is about the user, not about this page load, so the ids go to
  // localStorage. A storage that refuses the write costs the pill its memory and
  // nothing else — it must not throw into the click handler.
  it('remembers a read transcript, and survives a storage that refuses', () => {
    window.localStorage.removeItem('rn-reward-seen');
    const vm = { rewardSeen: {} };
    methods.markRewardSeen.call(vm, ITEM);
    expect(vm.rewardSeen).toEqual({ g1: true });
    expect(JSON.parse(window.localStorage.getItem('rn-reward-seen'))).toEqual(['g1']);

    // Already seen — no second write, no second object.
    const before = vm.rewardSeen;
    methods.markRewardSeen.call(vm, ITEM);
    expect(vm.rewardSeen).toBe(before);
    methods.markRewardSeen.call(vm, null);
    expect(vm.rewardSeen).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// The Inbox
// ---------------------------------------------------------------------------
// The focus card groups the day's checklist by routine, so an item created
// without one was invisible on this screen. The Inbox is exactly the set the
// card drops — derived from the page's own read, not a second query.
describe('RoutineFocus inbox', () => {
  const ctx = (over = {}) => ({
    dayGoalItems: [
      {
        id: 'g1', body: 'Ship PR', taskRef: 'sw', goalRef: 'wg_sw', isComplete: false,
      },
      {
        id: 'i1', body: 'Renew passport', taskRef: '', isComplete: false,
      },
      {
        id: 'i2', body: 'Call plumber', taskRef: null, isComplete: false,
      },
      {
        id: 'i3', body: 'Done already', taskRef: '', isComplete: true,
      },
    ],
    rows: [
      { id: 'mp', name: 'Morning Pages', time: '06:30' },
      { id: 'sw', name: 'Start Work', time: '09:00' },
    ],
    currentRow: { id: 'sw', name: 'Start Work', time: '09:00' },
    focusRow: { id: 'sw', name: 'Start Work', time: '09:00' },
    ...over,
  });
  const withHelpers = (over = {}) => {
    const vm = ctx(over);
    vm.goalRefForRoutine = (id) => methods.goalRefForRoutine.call(vm, id);
    return vm;
  };

  it('holds exactly the items with no routine, and not the finished ones', () => {
    const items = call('inboxItems', ctx());
    expect(items.map((i) => i.id)).toEqual(['i1', 'i2']);
  });

  it('badges the count', () => {
    expect(call('inboxCount', { inboxItems: [{ id: 'i1' }, { id: 'i2' }] })).toBe(2);
    expect(call('inboxCount', { inboxItems: [] })).toBe(0);
  });

  it('gives every routine the goalRef an item will inherit when it lands', () => {
    const vm = withHelpers();
    expect(call('inboxRoutines', vm)).toEqual([
      {
        id: 'mp', name: 'Morning Pages', time: '06:30', goalRef: '',
      },
      {
        id: 'sw', name: 'Start Work', time: '09:00', goalRef: 'wg_sw',
      },
    ]);
  });

  it('Do now targets the clock’s routine, falling back to the focused one', () => {
    const vm = withHelpers();
    expect(call('inboxTargetRoutine', vm).id).toBe('sw');
    const noCurrent = withHelpers({ currentRow: null });
    expect(call('inboxTargetRoutine', noCurrent).id).toBe('sw');
    const nothing = withHelpers({ currentRow: null, focusRow: null });
    expect(call('inboxTargetRoutine', nothing)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------
// Home used to mount `AgentEditModal` — a second agent form with its own save
// path and its own idea of which routines are free. It now drives the Agents
// page's container, the same way SettingsTime does.
describe('RoutineFocus agent form', () => {
  it('registers the shared container and not the old modal', () => {
    expect(RoutineFocus.components.AgentFormContainer).toBeTruthy();
    expect(RoutineFocus.components.AgentEditModal).toBeUndefined();
  });

  it('opens a new agent for a routine that has none', () => {
    const openNew = jest.fn();
    const vm = {
      actionSheetOpen: true,
      focusRow: { id: 'sw' },
      $refs: { agentForm: { openNew, openEdit: jest.fn() } },
      $agent: { getByTaskRef: () => null },
    };
    methods.onBuildAgent.call(vm);
    expect(openNew).toHaveBeenCalledWith('sw');
    expect(vm.actionSheetOpen).toBe(false);
  });

  it('edits the existing one rather than offering a duplicate', () => {
    const openEdit = jest.fn();
    const agent = { id: 'a1', name: 'PR Summarizer' };
    const vm = {
      actionSheetOpen: true,
      focusRow: { id: 'sw' },
      $refs: { agentForm: { openNew: jest.fn(), openEdit } },
      $agent: { getByTaskRef: () => agent },
    };
    methods.onBuildAgent.call(vm);
    expect(openEdit).toHaveBeenCalledWith(agent);
  });

  it('does nothing without a focused routine', () => {
    const vm = {
      actionSheetOpen: true,
      focusRow: null,
      $refs: { agentForm: { openNew: jest.fn(), openEdit: jest.fn() } },
      $agent: { getByTaskRef: () => null },
    };
    methods.onBuildAgent.call(vm);
    expect(vm.$refs.agentForm.openNew).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The capture sheet decision
// ---------------------------------------------------------------------------
// The design draws a Task/Goal capture sheet. The app already has one: the
// global `AiSearchModal`, with the same Task/Goal modes, the same free-text
// input and the same date / routine / parent-goal pickers, opened from this
// screen through the OPEN_AI_SEARCH bus (docs/routine-focus-home.md departure 3).
// Shipping a second one would be two ways to add a task, so there is one — and
// this test exists so a future change cannot quietly add the second.
describe('RoutineFocus capture', () => {
  it('routes every add-task affordance to the existing AI Search modal', () => {
    const vm = {};
    methods.openAiSearch.call(vm);
    // No capture sheet of its own — the modal is opened through the event bus.
    expect(RoutineFocus.components.AiSearchModal).toBeUndefined();
    expect(RoutineFocus.components.CaptureSheet).toBeUndefined();
    // Both affordances that add a task on this screen go through one method.
    expect(call('cardHandlers', {
      onRingAction: 1,
      toggleItem: 1,
      openItem: 1,
      openAiSearch: methods.openAiSearch,
      setPeriod: 1,
      toggleChecklist: 1,
      openAgentResult: 1,
      openTranscript: 1,
    })['add-task']).toBe(methods.openAiSearch);
  });

  it('the Inbox quick-add is the only other way in, and it needs no routine', () => {
    expect(RoutineFocus.components.InboxSheetContainer).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Shell geometry — the numbers the design draws
// ---------------------------------------------------------------------------
/*
 * This screen was built from `packages/design/Routine Notes Final.dc.html` but
 * never rendered against it, and a browser diff at all three viewports found
 * the shell measuring something else. These tests hold the page to the design's
 * own figures (frame 6a, iPad mini 1133x744; frame 6b, desktop 1440x900).
 *
 * They read the SFC's `<style>` text, which is the only place these values live
 * — the page has no scoped styles and vue-jest does not hand the compiled CSS
 * back (the GoalsTime.vue / AppShell.vue suites read source the same way).
 */
describe('RoutineFocus shell geometry', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'RoutineFocus.vue'), 'utf8');
  const css = source.slice(source.lastIndexOf('<style>'));

  /** The declarations of the first rule whose selector list mentions `selector`. */
  const declarations = (selector) => {
    const at = css.indexOf(selector);
    if (at < 0) throw new Error(`no rule mentions ${selector}`);
    const open = css.indexOf('{', at);
    return css.slice(open + 1, css.indexOf('}', open));
  };
  const value = (selector, property) => {
    const match = declarations(selector)
      .match(new RegExp(`(^|;)\\s*${property}\\s*:([^;]+)`));
    return match ? match[2].trim() : null;
  };
  const px = (selector, property) => parseFloat(value(selector, property));
  /** The horizontal half of a `padding` shorthand, from CSS or from a token. */
  const shorthandX = (padding) => {
    const parts = String(padding).trim().split(/\s+/);
    return parseFloat(parts.length > 1 ? parts[1] : parts[0]);
  };
  const paddingX = (selector) => shorthandX(value(selector, 'padding'));
  const grow = (selector) => parseFloat(value(selector, 'flex').split(/\s+/)[0]);

  // --- 1. the checklist / chat split ---------------------------------------
  /*
   * Measured 484 / 420 — a 1.15:1 that only held at one width, because the chat
   * pane was 420px FIXED (400 on tablet) and the checklist absorbed every pixel
   * of the difference. The design makes both panes flex from a 0 basis, so the
   * ratio is the only thing deciding the split and it survives a resize.
   */
  it('splits the panes 3:2, with neither one fixed', () => {
    expect(value('.rn-home__content > .rn-focus-card', 'flex')).toBe('3 1 0');
    expect(value('.rn-home__chat-pane', 'flex')).toBe('2 1 0');
    // A width or a frozen basis on either pane is the defect coming back.
    expect(value('.rn-home__chat-pane', 'width')).toBeNull();
    expect(value('.rn-home__chat-pane', 'flex-shrink')).toBeNull();
    expect(css).not.toMatch(/\.rn-home--tablet \.rn-home__chat-pane/);
    expect(css).not.toMatch(/flex:\s*1\.15/);
  });

  /**
   * The design's measured widths, re-derived from the CSS rather than asserted
   * as bare numbers: the column minus its content padding, minus the one gap,
   * minus whatever horizontal padding the CARD contributes to its own flex base
   * size — then shared out by the two grow factors.
   *
   * That last term is the entire defect. `flex-basis: 0` on a
   * `box-sizing: border-box` item cannot resolve below the item's own padding,
   * so a padded card floors its base size at that padding, takes it off the top,
   * and only the remainder is split 3:2. This helper used to leave the term out,
   * which is how the suite read a clean 547 / 365 while the browser measured
   * 563.2 / 348.8 against a card carrying `16px 20px 0`.
   */
  const splitWith = (columnWidth, contentSelector, cardPadX) => {
    const inner = columnWidth - paddingX(contentSelector) * 2 - px('.rn-home__content', 'gap');
    const free = inner - cardPadX;
    const a = grow('.rn-home__content > .rn-focus-card');
    const b = grow('.rn-home__chat-pane');
    return [cardPadX + (free * a) / (a + b), (free * b) / (a + b)];
  };
  /** The live split: the card's own horizontal padding, straight off the token. */
  const split = (columnWidth, contentSelector, variant) => splitWith(
    columnWidth, contentSelector, shorthandX(FOCUS_VARIANTS[variant].pad) * 2,
  );

  it('keeps the flex item itself padding-free, with the inset on an inner child', () => {
    ['tablet', 'desktop'].forEach((variant) => {
      // `pad` is the card's own padding and is vertical-only; `padX` is the
      // inset `RoutineFocusCard` moves onto `.rn-focus-card__body`.
      expect(shorthandX(FOCUS_VARIANTS[variant].pad)).toBe(0);
      expect(FOCUS_VARIANTS[variant].padX).toBe(20);
    });
  });

  it('lands on the design 547.2 / 364.8 at the desktop 980px column', () => {
    // `.rn-home--desktop .rn-home__main` caps the column at 980px, so the
    // content box is 924 and the split shares 912 of it exactly 3:2.
    // Previously asserted as a rounded 547 / 365 — the rounding, and the
    // missing card-padding term, are what let the real 563.2 / 348.8 through.
    expect(value('.rn-home--desktop .rn-home__main', 'max-width')).toBe('980px');
    expect(split(980, '.rn-home__content', 'desktop')).toEqual([547.2, 364.8]);
  });

  it('reproduces the measured 563.2 / 348.8 if the card takes its padding back', () => {
    // 40px of horizontal padding on the flex item floors its base size at 40;
    // the card takes that off the top and only 872 of the 912 is split 3:2.
    expect(splitWith(980, '.rn-home__content', 40)).toEqual([563.2, 348.8]);
  });

  it('still holds at the iPad, where there is no column cap', () => {
    // Tablet overrides the padding only.
    expect(value('.rn-home--tablet .rn-home__content', 'padding')).toBe('0 20px 20px');
    // The design's iPad frame (6a): a 1133 viewport less a 77px rail — 76px of
    // rail plus the 1px rule that frame draws OUTSIDE it (content-box) — so a
    // 1056px main, 1016 inner, and the design's own 602.4 / 401.6.
    expect(split(1056, '.rn-home--tablet .rn-home__content', 'tablet'))
      .toEqual([602.4, 401.6]);
    // This box is border-box, so the rail must be 77px for the page's main to be
    // the design's 1056 — at 76px it would swallow the 1px rule and hand the
    // panes an extra pixel, leaving a 0.6px residue against the figures above.
    expect(px('.rn-home__side', 'width')).toBe(77);
    const inner = 1133 - px('.rn-home__side', 'width');
    expect(inner).toBe(1056);
    expect(split(inner, '.rn-home--tablet .rn-home__content', 'tablet'))
      .toEqual([602.4, 401.6]);
    // The defect, for the record: counting the card's 40px padding into the
    // basis gave 618.4 / 385.6 here.
    expect(splitWith(inner, '.rn-home--tablet .rn-home__content', 40))
      .toEqual([618.4, 385.6]);
  });

  // --- 2. pane gap ---------------------------------------------------------
  it('runs a 12px gap between the panes on both shells', () => {
    // Previously 20px on desktop; the tablet override already said 12.
    expect(px('.rn-home__content', 'gap')).toBe(12);
    expect(value('.rn-home--tablet .rn-home__content', 'gap')).toBeNull();
  });

  // --- 3. header date ------------------------------------------------------
  it('sets the header date at 20px/700 on both large shells', () => {
    // Desktop used to be 26px — the outlier. Both design frames draw 20/700.
    expect(px('.rn-home__date', 'font-size')).toBe(20);
    expect(value('.rn-home__date', 'font-weight')).toBe('700');
    // No per-shell override left for them to drift apart again.
    expect(css).not.toMatch(/\.rn-home--(tablet|desktop) \.rn-home__date/);
  });

  // --- 4. shadows ----------------------------------------------------------
  it('gives both panes the flatter tablet/desktop card shadow', () => {
    const shadow = '0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05)';
    // One declaration for both, so a third variant cannot creep back in.
    expect(value('.rn-home__content > .rn-focus-card,', 'box-shadow')).toBe(shadow);
    // The chat pane's own alpha .1/.06 variant is gone.
    expect(css).not.toContain('rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06)');
    // The phone card is not inside .rn-home__content, so the deck shadow stays.
    expect(css).not.toContain('0 10px 15px -3px');
  });

  // --- 5 / 6. week-strip day cells ----------------------------------------
  it('asks for one 28px ring on tablet AND desktop', () => {
    // Was `shell === 'tablet' ? 28 : 36` — desktop was wearing the phone ring.
    // The iPad frame draws the same ringed 38px cell as the desktop frame; the
    // iPad's pill chips are the ROUTINE rail (RoutineRail layout="chips"), which
    // this page already mounts, not the week strip.
    expect(RoutineFocus.computed.headerRingSize.call({})).toBe(28);
    const mount = source.slice(source.indexOf('<div class="rn-home__header-week">'));
    expect(mount.slice(0, mount.indexOf('/>'))).toContain(':ring-size="headerRingSize"');
    expect(source).not.toContain("shell === 'tablet' ? 28 : 36");
  });

  it('lets the strip size itself to its seven 38px cells', () => {
    // A 360px box (280 on tablet) stretched each cell to 50.3px.
    expect(value('.rn-home__header-week', 'width')).toBeNull();
    expect(css).not.toMatch(/\.rn-home--tablet \.rn-home__header-week/);
    // 7 cells of 38 at the design's 40px pitch — what the compact strip draws.
    expect(7 * 38 + 6 * 2).toBe(278);
  });

  // --- 7. phone details ----------------------------------------------------
  it('opens the phone week strip to the design 80px', () => {
    // Measured 73px: `max-height` alone left the cells deciding the height.
    const open = call('weekStripStyle', { weekStripOpen: true });
    expect(open.height).toBe('80px');
    expect(open.maxHeight).toBe('80px');
    expect(call('weekStripStyle', { weekStripOpen: false }).height).toBe('0px');
  });

  it('draws the phone header avatar at 40px', () => {
    // The rule lives in RoutineTopBar.vue — this page is its only consumer, and
    // the design's phone header fills the 40px tap target with the image instead
    // of insetting a 32px one inside a 36px button.
    const topbar = fs.readFileSync(path.join(
      __dirname, '..', '..', '..', '..', '..',
      'packages', 'ui', 'organisms', 'RoutineTopBar', 'RoutineTopBar.vue',
    ), 'utf8');
    const button = topbar.slice(topbar.indexOf('.rn-topbar__avatar-btn'));
    expect(button.slice(0, button.indexOf('}'))).toContain('width: 40px');
    const image = button.slice(button.indexOf('.rn-topbar__avatar {'));
    expect(image.slice(0, image.indexOf('}'))).toContain('width: 40px');
  });
});
