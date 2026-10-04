/* eslint-env jest */
/**
 * YearGoalsTime — what only the page can get wrong.
 *
 * It composes containers and owns three things: the route (which goal), the UI
 * state nobody's server holds (focused month, unfolded week, open sheet), and the
 * ORCHESTRATION of a tick that crosses domains. The cascade's arithmetic is
 * `utils/yearGoalModel`'s and is tested there; what is tested here is that the
 * page applies the whole plan through one write container, logs one chat event
 * per crossing, shows one toast, and then re-reads.
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

const YearGoalsTime = require('../YearGoalsTime.vue').default;
const YearGoalChatContainer = require('../../containers/YearGoalChatContainer.vue').default;
const YearGoalListContainer = require('../../containers/YearGoalListContainer.vue').default;
const { buildYearGoal, TH } = require('../../utils/yearGoalModel');
const {
  SEND_ROUTINE_CHAT_MUTATION,
  MARK_ROUTINE_CHAT_ADDED_MUTATION,
  POST_ROUTINE_CHAT_EVENT_MUTATION,
} = require('../../composables/graphql/chatQueries');

const { computed, methods, watch } = YearGoalsTime;

const TODAY = '12-09-2026';
const SEP = 8;

const dayGoal = (id, date, done, extra) => ({
  id, body: `Day ${id}`, period: 'day', date, isComplete: !!done, ...extra,
});

/** Markdown, so the test proves the editor gets the contribution intact. */
const CONTRIBUTION = ['## Why', 'It ships the week.'].join('\n');

/**
 * Everything a day goal carries that a ROW does not draw. d5 is the one the
 * editor tests open, so the fixture gives it a real body of work.
 */
const DAY_EXTRA = {
  body: 'Write release notes',
  contribution: CONTRIBUTION,
  tags: ['work', 'work/release'],
  subTasks: [{ id: 's1', body: 'Draft', isComplete: true }],
  deadline: '12-09-2026',
  reward: 'coffee',
  taskRef: 'r1',
  goalRef: 'wB',
  isMilestone: true,
  status: 'todo',
};

/**
 * September: the month goal, two finished weeks and a third at 4 of 5 days.
 * Four months already done. Ticking the fifth day crosses week, month and year.
 */
const fixture = (lastDayDone) => buildYearGoal({
  id: 'y1',
  body: 'Ship v2 of Routine Notes',
  period: 'year',
  date: '31-12-2026',
  milestones: [
    {
      id: 'mJan', period: 'month', date: '31-01-2026', isComplete: true,
    },
    {
      id: 'mFeb', period: 'month', date: '28-02-2026', isComplete: true,
    },
    {
      id: 'mMar', period: 'month', date: '31-03-2026', isComplete: true,
    },
    {
      id: 'mApr', period: 'month', date: '30-04-2026', isComplete: true,
    },
    {
      id: 'mSep',
      period: 'month',
      date: '30-09-2026',
      body: 'Launch mobile dashboard',
      milestones: [
        {
          id: 'wA', period: 'week', date: '04-09-2026', isComplete: true,
        },
        {
          id: 'wB',
          period: 'week',
          date: '11-09-2026',
          body: 'Ship the dashboard',
          milestones: [
            dayGoal('d1', '07-09-2026', true),
            dayGoal('d2', '08-09-2026', true),
            dayGoal('d3', '09-09-2026', true),
            dayGoal('d4', '10-09-2026', true),
            dayGoal('d5', '11-09-2026', !!lastDayDone, DAY_EXTRA),
          ],
        },
        {
          id: 'wC', period: 'week', date: '18-09-2026', isComplete: true,
        },
      ],
    },
  ],
}, TODAY);

/** wB at 4 of 5 days — one tick away from crossing week, month and year. */
const almostThere = () => fixture(false);
/** wB at 5 of 5 — it auto-ticked, so the hand tick must be refused. */
const fiveDaysDone = () => fixture(true);

/** A fake `this` with the page's data, its real computeds and spy refs. */
const page = (over = {}) => {
  const ticked = [];
  const events = [];
  const refetched = [];
  const pushed = [];
  const vm = {
    tree: almostThere(),
    today: TODAY,
    selectedMonth: SEP,
    openWeekId: '',
    aboutOpen: false,
    switcherOpen: false,
    goalQuery: '',
    goalSort: 'routine',
    goalIds: ['y1', 'y2', 'y3'],
    sheet: null,
    draft: null,
    draftText: '',
    menu: null,
    editorOpen: false,
    editItem: null,
    chatText: '',
    toast: {
      title: '', sub: '', icon: 'check_circle', color: '#4CAF50', seq: 0,
    },
    $route: { path: '/year-goals/y1', params: { id: 'y1' } },
    $router: {
      push: (r) => { pushed.push(['push', r]); return Promise.resolve(); },
      replace: (r) => { pushed.push(['replace', r]); return Promise.resolve(); },
    },
    $vuetify: { breakpoint: { xsOnly: true, width: 412 } },
    $refs: {
      tick: { tick: (ticks) => { ticked.push(ticks); return Promise.resolve(ticks); } },
      chat: { postEvent: (e) => { events.push(e); return Promise.resolve(); } },
      tree: { refetch: () => refetched.push(true) },
      create: {
        create: (d) => Promise.resolve({ id: 'new', body: d.body }),
        createMany: (drafts) => Promise.resolve(drafts.map((d, i) => ({ id: `n${i}`, ...d }))),
      },
      update: { rename: () => Promise.resolve({ id: 'w1' }) },
      remove: { remove: () => Promise.resolve({ id: 'w1' }) },
    },
    spies: {
      ticked, events, refetched, pushed,
    },
    ...over,
  };
  // Bind the real computeds so the test exercises the page's own derivations.
  Object.keys(computed).forEach((key) => {
    Object.defineProperty(vm, key, { get: () => computed[key].call(vm), configurable: true });
  });
  Object.keys(methods).forEach((key) => { vm[key] = methods[key].bind(vm); });
  return vm;
};

describe('YearGoalsTime — the shell', () => {
  const shellFor = (breakpoint) => computed.shell.call({ $vuetify: { breakpoint } });

  it('uses the one breakpoint rule, not a second scheme', () => {
    expect(shellFor({ xsOnly: true, width: 412 })).toBe('phone');
    expect(shellFor({ xsOnly: false, width: 1133 })).toBe('tablet');
    expect(shellFor({ xsOnly: false, width: 1264 })).toBe('desktop');
  });

  it('falls back to the phone when there is no Vuetify at all', () => {
    expect(computed.shell.call({})).toBe('phone');
  });

  it('titles the shell with the goal and subtitles it with the tally', () => {
    const vm = page();
    expect(vm.shellTitle).toBe('Ship v2 of Routine Notes');
    expect(vm.shellSubtitle).toBe('Year goal · 2026 · 4/6 months');
  });

  it('feeds the Goals nav ring the goal’s own percentage', () => {
    expect(page().yearAverage).toBe(67);
  });

  it('says "Year goals" and nothing else before a goal has loaded', () => {
    const vm = page({ tree: null });
    expect(vm.shellTitle).toBe('Year goals');
    expect(vm.shellSubtitle).toBe('');
    expect(vm.yearAverage).toBeNull();
  });
});

describe('YearGoalsTime — one tick, the whole cascade', () => {
  it('applies day, week and month through one write container', async () => {
    const vm = page();
    await vm.onTickDay({ day: { id: 'd5' } });
    expect(vm.spies.ticked).toHaveLength(1);
    expect(vm.spies.ticked[0].map((t) => t.id)).toEqual(['d5', 'wB', 'mSep']);
  });

  it('logs one chat event per crossing, in order', async () => {
    const vm = page();
    await vm.onTickDay({ day: { id: 'd5' } });
    expect(vm.spies.events.map((e) => e.text)).toEqual([
      'Ship the dashboard auto-ticked · 5/5 days',
      'September auto-ticked · 3/3 weeks',
      'Year at 83% · 5/6 months',
    ]);
  });

  it('shows one rollup toast for the whole gesture', async () => {
    const vm = page();
    await vm.onTickDay({ day: { id: 'd5' } });
    expect(vm.toast.title).toBe('Ship the dashboard auto-ticked · 5/5 days');
    expect(vm.toast.sub).toContain('Year at 83% · 5/6 months');
    expect(vm.toast.seq).toBe(1);
  });

  it('re-reads the tree once the writes land', async () => {
    const vm = page();
    await vm.onTickDay({ day: { id: 'd5' } });
    expect(vm.spies.refetched).toHaveLength(1);
  });

  it('refuses a hand tick the days already earned, and writes nothing', async () => {
    // Week wB with all five days done: it auto-ticked, so the hand tick is
    // refused with an explanation instead of silently doing nothing.
    const vm = page({ tree: fiveDaysDone() });
    await vm.onTickWeek({ id: 'wB' });
    expect(vm.spies.ticked).toHaveLength(0);
    expect(vm.spies.events).toHaveLength(0);
    expect(vm.toast.title).toBe('Ticked automatically');
    expect(vm.toast.sub).toBe(`5 of ${TH.week} day goals are done`);
  });

  it('tells the truth when the write fails, and re-reads rather than lying', async () => {
    const vm = page();
    vm.$refs.tick.tick = () => Promise.reject(new Error('offline'));
    await vm.onTickDay({ day: { id: 'd5' } });
    expect(vm.toast.title).toBe("That tick didn't save");
    expect(vm.toast.sub).toContain('Nothing was lost');
    expect(vm.spies.events).toHaveLength(0);
    expect(vm.spies.refetched).toHaveLength(1);
  });

  it('does nothing at all for a tick it cannot place', async () => {
    const vm = page();
    await vm.onTickDay({ day: { id: 'ghost' } });
    expect(vm.spies.ticked).toHaveLength(0);
    expect(vm.toast.title).toBe('');
  });
});

describe('YearGoalsTime — the create sheet locks the parent', () => {
  it('locks a month goal to the year goal', () => {
    const vm = page();
    vm.openCreate('month');
    expect(vm.sheet).toBe('create');
    expect(vm.draft.goalRef).toBe('y1');
    expect(vm.draft.parentLabel).toBe('Ship v2 of Routine Notes');
    expect(vm.draftText).toBe('');
  });

  it('locks a week goal to the focused month’s goal', () => {
    const vm = page();
    vm.openCreate('week');
    expect(vm.draft.goalRef).toBe('mSep');
    expect(vm.draft.parentLabel).toBe('Launch mobile dashboard');
  });

  it('locks a day goal to the week it was opened from', () => {
    const vm = page();
    vm.onAddDay({ id: 'wB' });
    expect(vm.draft.goalRef).toBe('wB');
    expect(vm.draft.parentLabel).toBe('Ship the dashboard');
  });

  it('asks for the month goal first instead of offering an unparented week', () => {
    // December has no month goal in the fixture, so there is nothing to lock to.
    const vm = page({ selectedMonth: 11 });
    vm.openCreate('week');
    expect(vm.sheet).toBeNull();
    expect(vm.toast.title).toBe('Set the month goal first');
  });

  it('says the month is fully planned instead of filing a next-month week under it', () => {
    // September's last week is 25-09 (27 Sep – 3 Oct); the next would be 4 – 10 Oct.
    const tree = buildYearGoal({
      id: 'y1',
      body: 'Year',
      period: 'year',
      date: '31-12-2026',
      milestones: [{
        id: 'mSep',
        period: 'month',
        date: '30-09-2026',
        body: 'Month',
        milestones: [{
          id: 'wZ', period: 'week', date: '02-10-2026', body: 'Last',
        }],
      }],
    }, TODAY);
    const vm = page({ tree });
    vm.openCreate('week');
    expect(vm.sheet).toBeNull();
    expect(vm.draft).toBeNull();
    expect(vm.toast.title).toBe('September is fully planned');
  });

  it('opens the shared create sheet locked to the draft — period, date and parent', () => {
    const vm = page();
    vm.onAddDay({ id: 'wB' });
    expect(vm.sheet).toBe('create');
    expect(vm.createDraftFor).toBe(vm.draft);
    expect(vm.createDraftFor).toMatchObject({ period: 'day', goalRef: 'wB' });
    expect(YearGoalsTime.components.GoalItemCreateContainer).toBeTruthy();
  });

  it('a created day goal unfolds its week, toasts and refetches', async () => {
    const vm = page();
    vm.onAddDay({ id: 'wB' });
    // The create container reports `created` BEFORE it closes the sheet.
    await vm.onDraftCreated({ body: 'Write release notes' });
    vm.closeSheet();
    expect(vm.openWeekId).toBe('wB');
    expect(vm.sheet).toBeNull();
    expect(vm.toast.title).toBe('Day goal added');
    expect(vm.spies.refetched).toHaveLength(1);
  });

  it('the rename form never creates — a create draft belongs to the sheet', async () => {
    const vm = page();
    vm.openCreate('month');
    vm.draftText = 'Retention push';
    await vm.submitDraft();
    expect(vm.sheet).toBe('create');
    expect(vm.spies.refetched).toHaveLength(0);
  });
});

describe('YearGoalsTime — edit and delete live behind the ⋮', () => {
  it('opens the week menu with edit, add and delete', () => {
    const vm = page();
    vm.openMenu({ kind: 'week', week: vm.tree.months[SEP].weeks[1] });
    expect(vm.sheet).toBe('menu');
    expect(vm.menuItems.map((i) => i.key)).toEqual(['edit', 'add', 'delete']);
    expect(vm.menuItems[2].color).toBe('#d32f2f');
  });

  it('turns Edit into the same sheet, pre-filled and still parent-locked', () => {
    const vm = page();
    vm.openMenu({ kind: 'week', week: vm.tree.months[SEP].weeks[1] });
    vm.onMenuSelect('edit');
    expect(vm.sheet).toBe('create');
    expect(vm.draft.edit).toBe('wB');
    expect(vm.draftText).toBe('Ship the dashboard');
    expect(vm.draft.parentLabel).toBe('Launch mobile dashboard');
  });

  it('renames from the COMPLETE record, so tags, contribution, reward and deadline survive', async () => {
    const STORED = {
      tags: ['priority:plan'], contribution: 'Why it matters', reward: 'cake', deadline: '30-10-2026',
    };
    const tree = buildYearGoal({
      id: 'y1',
      body: 'Year',
      period: 'year',
      date: '31-12-2026',
      milestones: [{
        id: 'mSep',
        period: 'month',
        date: '30-09-2026',
        body: 'Month',
        ...STORED,
        milestones: [{
          id: 'wB', period: 'week', date: '11-09-2026', body: 'Week', goalRef: 'mSep', ...STORED,
        }],
      }],
    }, TODAY);
    const renamed = [];
    const vm = page({ tree });
    vm.$refs.update.rename = (item, body) => {
      renamed.push({ item, body });
      return Promise.resolve({ id: item.id });
    };

    vm.openMenu({ kind: 'month', month: vm.tree.months[SEP] });
    vm.onMenuSelect('edit');
    vm.draftText = 'Month renamed';
    await vm.submitDraft();

    vm.openMenu({ kind: 'week', week: vm.tree.months[SEP].weeks[0] });
    vm.onMenuSelect('edit');
    vm.draftText = 'Week renamed';
    await vm.submitDraft();

    expect(renamed.map((r) => r.item.id)).toEqual(['mSep', 'wB']);
    renamed.forEach(({ item }) => expect(item).toMatchObject(STORED));
    expect(renamed[0].item).toMatchObject({ period: 'month', date: '30-09-2026' });
    expect(renamed[1].item).toMatchObject({ period: 'week', date: '11-09-2026', goalRef: 'mSep' });
  });

  it('confirms a delete and says what else goes with it', () => {
    const vm = page();
    vm.openMenu({ kind: 'month', month: vm.tree.months[SEP] });
    vm.onMenuSelect('delete');
    expect(vm.sheet).toBe('confirm');
    expect(vm.menuTitle).toContain('Its week and day goals go too.');
    expect(vm.menuItems.map((i) => i.key)).toEqual(['confirm-delete', 'cancel']);
  });

  it('keeps the goal when the confirmation is declined', () => {
    const vm = page();
    vm.openMenu({ kind: 'week', week: vm.tree.months[SEP].weeks[1] });
    vm.onMenuSelect('delete');
    vm.onMenuSelect('cancel');
    expect(vm.sheet).toBeNull();
    expect(vm.menu).toBeNull();
  });

  it('deletes only after the confirmation', async () => {
    const vm = page();
    const removed = [];
    vm.$refs.remove.remove = (item) => {
      removed.push(item.id);
      return Promise.resolve({ id: item.id });
    };
    vm.openMenu({ kind: 'week', week: vm.tree.months[SEP].weeks[1] });
    vm.onMenuSelect('delete');
    expect(removed).toEqual([]);
    await vm.onMenuSelect('confirm-delete');
    expect(removed).toEqual(['wB']);
    expect(vm.toast.title).toBe('Deleted');
  });
});

describe('YearGoalsTime — getting to another goal', () => {
  it('numbers the goal you are on', () => {
    expect(page().indexLabel).toBe('1 of 3');
    expect(page({ goalIds: ['y1'] }).indexLabel).toBe('');
  });

  it('steps with ‹ › and stops at both ends', () => {
    const first = page();
    expect(first.hasPrev).toBe(false);
    expect(first.hasNext).toBe(true);
    first.stepGoal(-1);
    expect(first.spies.pushed).toEqual([]);
    first.stepGoal(1);
    expect(first.spies.pushed).toEqual([['push', '/year-goals/y2']]);
  });

  it('routes a goal switch instead of swapping local state', () => {
    const vm = page();
    vm.switchGoal('y3');
    expect(vm.spies.pushed).toEqual([['push', '/year-goals/y3']]);
    expect(vm.switcherOpen).toBe(false);
  });

  it('does not re-push the goal already open', () => {
    const vm = page();
    vm.switchGoal('y1');
    expect(vm.spies.pushed).toEqual([]);
  });

  it('opens the switcher when Goals is tapped on a phone, instead of leaving', () => {
    const vm = page();
    vm.onNavigate('goals', { route: '/goals' });
    expect(vm.switcherOpen).toBe(true);
    expect(vm.spies.pushed).toEqual([]);
    vm.onNavigate('goals', { route: '/goals' });
    expect(vm.switcherOpen).toBe(false);
  });

  it('navigates to Goals on the desktop, where the sidebar already lists them', () => {
    const vm = page({ $vuetify: { breakpoint: { xsOnly: false, width: 1440 } } });
    vm.onNavigate('goals', { route: '/goals' });
    expect(vm.switcherOpen).toBe(false);
    expect(vm.spies.pushed).toEqual([['push', '/goals']]);
  });

  it('lands on the first goal when the route carries none', () => {
    const vm = page({ $route: { path: '/year-goals', params: {} }, goalIds: [] });
    vm.onGoalIds(['yA', 'yB']);
    expect(vm.spies.pushed).toEqual([['replace', '/year-goals/yA']]);
  });

  it('does not redirect when the route already names a goal', () => {
    const vm = page();
    vm.onGoalIds(['y9']);
    expect(vm.spies.pushed).toEqual([]);
  });

  it('resets the view on a switch — month, week, sheets — but not the thread', () => {
    const vm = page({ selectedMonth: 2, openWeekId: 'wB', aboutOpen: true });
    vm.sheet = 'menu';
    watch.goalId.call(vm);
    expect(vm.selectedMonth).toBe(SEP);
    expect(vm.openWeekId).toBe('');
    expect(vm.aboutOpen).toBe(false);
    expect(vm.sheet).toBeNull();
    // Nothing here touches the chat: the thread is keyed by the goal, not held
    // on the page, so switching back finds it where it was left.
    expect(Object.keys(vm)).not.toContain('chatMessages');
  });

  it('forgets the focused week when a different month is focused', () => {
    const vm = page({ openWeekId: 'wB' });
    vm.selectMonth(3);
    expect(vm.selectedMonth).toBe(3);
    expect(vm.openWeekId).toBe('');
  });

  it('unfolds and refolds one week at a time', () => {
    const vm = page();
    vm.toggleWeek({ id: 'wB' });
    expect(vm.openWeekId).toBe('wB');
    vm.toggleWeek({ id: 'wC' });
    expect(vm.openWeekId).toBe('wC');
    vm.toggleWeek({ id: 'wC' });
    expect(vm.openWeekId).toBe('');
  });
});

describe('YearGoalsTime — the chat is per goal', () => {
  const chat = (goal, month) => {
    const vm = { goal, month, $listeners: {} };
    Object.keys(YearGoalChatContainer.computed).forEach((key) => {
      Object.defineProperty(vm, key, {
        get: () => YearGoalChatContainer.computed[key].call(vm),
        configurable: true,
      });
    });
    return vm;
  };

  it('keys the thread on the goal itself, not on today', () => {
    const tree = almostThere();
    const vm = chat(tree, tree.months[SEP]);
    expect(vm.threadRef).toBe('y1');
    // The year goal's own date — so the thread is one conversation, not 365.
    expect(vm.threadDate).toBe('31-12-2026');
    expect(vm.threadDate).not.toBe(TODAY);
  });

  it('gives two goals two different thread keys, so neither overwrites the other', () => {
    const a = almostThere();
    const b = { ...almostThere(), id: 'y2', date: '31-12-2026' };
    expect(chat(a, a.months[SEP]).threadRef).not.toBe(chat(b, b.months[SEP]).threadRef);
  });

  it('skips the read entirely until a goal is in hand', () => {
    const vm = chat(null, null);
    vm.$root = { $data: { email: 'a@b.c' } };
    expect(YearGoalChatContainer.apollo.chatMessages.skip.call(vm)).toBe(true);
  });

  it('opens with live counts rather than a stored greeting', () => {
    const tree = almostThere();
    const vm = chat(tree, tree.months[SEP]);
    expect(vm.greeting.text)
      .toBe('4 of 6 months done. September (“Launch mobile dashboard”) has 2 of 3 weeks.'
        + ' What should we plan?');
    expect(vm.greeting.id).toBe('greeting');
  });

  it('offers the month-goal chip when the month is empty, and week chips when it is not', () => {
    const tree = almostThere();
    expect(chat(tree, tree.months[SEP]).quickReplies).toContain('Add a week goal');
    expect(chat(tree, tree.months[11]).quickReplies)
      .toEqual(['How am I doing?', 'Set month goal']);
  });

  it('tells the model about the goal, and leaves routine-only fields unset', () => {
    const tree = almostThere();
    const ctx = chat(tree, tree.months[SEP]).chatContext;
    expect(ctx.routineName).toBe('Ship v2 of Routine Notes');
    expect(ctx.routineStatus).toContain('Year goal 4/6 months (67%)');
    expect(ctx.doneCount).toBe(4);
    expect(ctx.totalCount).toBe(TH.year);
    expect(ctx.items.map((i) => i.id)).toEqual(['wA', 'wB', 'wC']);
    // No invented clock, stimulus or points for something that has none.
    expect(ctx.routineTime).toBeUndefined();
    expect(ctx.stimulus).toBeUndefined();
    expect(ctx.points).toBeUndefined();
    expect(ctx.ticked).toBeUndefined();
  });

  it('names the bulk accept after what it will create', () => {
    const tree = almostThere();
    const vm = chat(tree, tree.months[SEP]);
    vm.chatMessages = [{ id: 'm1', from: 'goal', proposals: ['a', 'b', 'c'] }];
    const bubble = vm.displayMessages[vm.displayMessages.length - 1];
    expect(bubble.addAllLabel).toBe('Add 3 week goals');
  });

  it('numbers chat-proposed week goals onto consecutive free weeks', async () => {
    const vm = page();
    const seen = [];
    vm.$refs.create.createMany = (drafts) => {
      seen.push(...drafts);
      return Promise.resolve(drafts.map((d, i) => ({ id: `n${i}`, ...d })));
    };
    const ids = [];
    await vm.onCreateWeeksFromChat({
      bodies: ['Fix top 10 beta bugs', 'Beta feedback triage'],
      done: (made) => ids.push(...made),
    });
    expect(ids).toEqual(['n0', 'n1']);
    // September's last planned week is 18-09, so the two new ones follow it and
    // never collide — the page is the only place that can know that.
    expect(seen.map((d) => d.date)).toEqual(['25-09-2026', '02-10-2026']);
    expect(seen.every((d) => d.goalRef === 'mSep' && d.period === 'week')).toBe(true);
  });

  it('creates only the chat-proposed weeks that still fit in the month', async () => {
    const vm = page();
    const seen = [];
    vm.$refs.create.createMany = (drafts) => {
      seen.push(...drafts);
      return Promise.resolve(drafts.map((d, i) => ({ id: `n${i}`, ...d })));
    };
    const ids = [];
    await vm.onCreateWeeksFromChat({
      bodies: ['One', 'Two', 'Three'],
      done: (made) => ids.push(...made),
    });
    // 25-09 and 02-10 (27 Sep – 3 Oct) are September's; 09-10 is October's.
    expect(seen.map((d) => d.date)).toEqual(['25-09-2026', '02-10-2026']);
    expect(ids).toEqual(['n0', 'n1']);
    expect(vm.toast.title).toBe('September is fully planned');
  });

  it('declines to invent weeks under a month with no goal', async () => {
    const vm = page({ selectedMonth: 11 });
    const ids = [];
    await vm.onCreateWeeksFromChat({ bodies: ['anything'], done: (made) => ids.push(...made) });
    expect(ids).toEqual([]);
  });
});

/**
 * The day goal is the one level of this ladder that is a whole goal item, so it
 * is the one level that opens the full editor — the dashboard's, not a second
 * one. Month and week genuinely are their title here, and they stay on the
 * title-only sheet. What is pinned: which form each level gets, that the editor
 * is handed the COMPLETE record at the Goal document's own address, and that a
 * save re-reads the tree so the counts above the row move.
 */
describe('YearGoalsTime — a day goal opens the real editor', () => {
  /** The row the board actually emits — a view-model, not a record. */
  const dayRow = (vm) => vm.tree.months[SEP].weeks[1].days[4];

  it('opens the dialog from the day row’s edit glyph', () => {
    const vm = page();
    vm.onEditDay({ day: dayRow(vm), week: vm.tree.months[SEP].weeks[1] });
    expect(vm.editorOpen).toBe(true);
    // The title-only sheet is NOT what opened.
    expect(vm.sheet).toBeNull();
    expect(vm.draft).toBeNull();
  });

  it('hands it the complete record, not the row', () => {
    const vm = page();
    const row = dayRow(vm);
    expect(row.contribution).toBeUndefined();
    expect(row.subTasks).toBeUndefined();

    vm.onEditDay({ day: row });
    expect(vm.editItem.id).toBe('d5');
    expect(vm.editItem.contribution).toBe(CONTRIBUTION);
    expect(vm.editItem.tags).toEqual(['work', 'work/release']);
    expect(vm.editItem.subTasks).toEqual([{ id: 's1', body: 'Draft', isComplete: true }]);
    expect(vm.editItem.deadline).toBe('12-09-2026');
    expect(vm.editItem.reward).toBe('coffee');
    expect(vm.editItem.goalRef).toBe('wB');
  });

  it('stamps the owning Goal document’s period and date — the mutation address', () => {
    const vm = page();
    vm.onEditDay({ day: dayRow(vm) });
    expect(vm.editItem.period).toBe('day');
    expect(vm.editItem.date).toBe('11-09-2026');
    expect(vm.editorPeriod).toBe('day');
    expect(vm.editorDate).toBe('11-09-2026');
  });

  it('routes the ⋮’s Edit for a day goal to the same dialog', () => {
    const vm = page();
    vm.menu = { kind: 'day', item: dayRow(vm) };
    vm.onMenuSelect('edit');
    expect(vm.editorOpen).toBe(true);
    expect(vm.editItem.id).toBe('d5');
    expect(vm.sheet).toBeNull();
  });

  it('keeps month and week goals on the title-only sheet', () => {
    const vm = page();
    vm.openMenu({ kind: 'week', week: vm.tree.months[SEP].weeks[1] });
    vm.onMenuSelect('edit');
    expect(vm.sheet).toBe('create');
    expect(vm.draft.edit).toBe('wB');
    expect(vm.editorOpen).toBe(false);

    const other = page();
    other.openMenu({ kind: 'month', month: other.tree.months[SEP] });
    other.onMenuSelect('edit');
    expect(other.sheet).toBe('create');
    expect(other.draft.edit).toBe('mSep');
    expect(other.editorOpen).toBe(false);
  });

  it('creating a day goal still goes through the parent-locked sheet', () => {
    const vm = page();
    vm.onAddDay({ id: 'wB' });
    expect(vm.sheet).toBe('create');
    expect(vm.editorOpen).toBe(false);
    // Stamped so it still rolls up into its week.
    expect(vm.draft).toMatchObject({ period: 'day', date: '12-09-2026', goalRef: 'wB' });
  });

  it('opens nothing for a row it cannot place', () => {
    const vm = page();
    vm.onEditDay({ day: { id: 'ghost', period: 'day' } });
    vm.onEditDay(null);
    expect(vm.editorOpen).toBe(false);
    expect(vm.editItem).toBeNull();
  });

  it('re-reads the tree after a save, so the week, month and year counts move', () => {
    const vm = page();
    vm.onEditDay({ day: dayRow(vm) });
    vm.onGoalSaved({ goalItem: { id: 'd5', period: 'day', body: 'Write release notes' }, created: false });
    expect(vm.spies.refetched).toHaveLength(1);
    expect(vm.toast.title).toBe('Saved');
    expect(vm.toast.sub).toBe('Write release notes');
  });

  it('moves the week, month and year counts once the re-read lands', () => {
    const vm = page();
    expect(vm.tree.months[SEP].weeks[1].doneDays).toBe(4);
    expect(vm.shellSubtitle).toBe('Year goal · 2026 · 4/6 months');
    expect(vm.yearAverage).toBe(67);

    vm.onEditDay({ day: dayRow(vm) });
    vm.onGoalSaved({ goalItem: { id: 'd5', period: 'day', body: 'Write release notes' } });
    expect(vm.spies.refetched).toHaveLength(1);

    // What the re-read republishes: every tally on this page is derived from the
    // milestone TREE, so the week's 5/5, September's 3/3 and the year's 83% all
    // follow the one refetch — there is no second count to keep in step.
    vm.tree = fiveDaysDone();
    expect(vm.tree.months[SEP].weeks[1].doneDays).toBe(TH.week);
    expect(vm.tree.months[SEP].weeksDone).toBe(TH.month);
    expect(vm.shellSubtitle).toBe('Year goal · 2026 · 5/6 months');
    expect(vm.yearAverage).toBe(83);
  });

  it('follows a day goal that was re-parented onto another week', () => {
    const vm = page();
    vm.onEditDay({ day: dayRow(vm) });
    vm.onGoalSaved({
      goalItem: {
        id: 'd5', period: 'day', goalRef: 'wC', body: 'Moved',
      },
    });
    expect(vm.openWeekId).toBe('wC');
    expect(vm.spies.refetched).toHaveLength(1);
  });

  it('closes on the dialog’s own close, and on a goal switch', () => {
    const vm = page();
    vm.onEditDay({ day: dayRow(vm) });
    vm.closeEditor();
    expect(vm.editorOpen).toBe(false);
    expect(vm.editItem).toBeNull();

    vm.onEditDay({ day: dayRow(vm) });
    watch.goalId.call(vm);
    expect(vm.editorOpen).toBe(false);
    expect(vm.editItem).toBeNull();
  });

  it('falls back to the day in view for a blank editor, never to no address', () => {
    const vm = page();
    expect(vm.editorPeriod).toBe('day');
    expect(vm.editorDate).toBe(TODAY);
  });
});

/**
 * Template wiring, which the method tests above cannot see: WHERE the editor is
 * mounted and that the page added no second mutation path to feed it.
 */
describe('YearGoalsTime — the editor is the dashboard’s, not a fork', () => {
  const dir = path.join(__dirname, '..');
  const source = fs.readFileSync(path.join(dir, 'YearGoalsTime.vue'), 'utf8');
  const dialog = fs.readFileSync(
    path.join(dir, '..', 'containers', 'GoalEditDialogContainer.vue'), 'utf8',
  );

  it('mounts the shared dialog container', () => {
    expect(source).toContain('<goal-edit-dialog-container');
    expect(source).toContain("import GoalEditDialogContainer from '../containers/GoalEditDialogContainer.vue'");
  });

  it('hands it no `shell` — a fullscreen dialog has no per-shell geometry', () => {
    const mount = source.slice(source.indexOf('<goal-edit-dialog-container'));
    expect(mount.slice(0, mount.indexOf('/>'))).not.toContain(':shell');
  });

  it('takes the day row’s edit glyph off the read container, beside the tick', () => {
    const tree = source.slice(source.indexOf('<year-goal-container'));
    const tag = tree.slice(0, tree.indexOf('>'));
    expect(tag).toContain('@edit-day="onEditDay"');
    // The gesture the glyph must not have taken over is still wired too.
    expect(tag).toContain('@tick-day="onTickDay"');
  });

  it('ticks a week from a checkbox inside a chat bubble, like the board row', () => {
    const chatTag = source.slice(source.indexOf('<year-goal-chat-container'));
    expect(chatTag.slice(0, chatTag.indexOf('/>'))).toContain('@toggle-item="onTickWeek"');
  });

  it('retries the goal list together with the card', () => {
    const tree = source.slice(source.indexOf('<year-goal-container'));
    expect(tree.slice(0, tree.indexOf('>'))).toContain('@retry="refetchGoalList"');
  });

  it('keeps the delete behind the ⋮ and its confirmation, never in the editor', () => {
    const mount = source.slice(source.indexOf('<goal-edit-dialog-container'));
    expect(mount.slice(0, mount.indexOf('/>'))).not.toContain('@delete');
    expect(source).toContain("if (key === 'confirm-delete') return this.removeGoal(item)");
  });

  it('keeps GoalPeriodForm for the month and week goals it still owns', () => {
    expect(source).toContain('<goal-period-form');
    expect(source).toContain("import GoalPeriodForm from '@routine-notes/ui/molecules/GoalPeriodForm/GoalPeriodForm.vue'");
  });

  it('adds no mutation of its own — the save is GoalCreationContainer’s', () => {
    // Same path as DashBoard and the Goals page: the dialog mounts the dashboard's
    // own GoalCreationContainer, which calls `$goals`. The page declares neither.
    expect(dialog).toContain("import GoalCreation from './GoalCreationContainer.vue'");
    expect(source).not.toContain('this.$goals');
    expect(source).not.toContain('gql`');
    expect(source).not.toContain('this.$apollo');
  });
});

describe('YearGoalsTime — a chat checkbox ticks its week', () => {
  it('runs the same cascade as the board for the item the bubble emits', async () => {
    const vm = page();
    await vm.onTickWeek({ id: 'wB', body: 'Ship the dashboard', isComplete: false });
    expect(vm.spies.ticked[0].map((t) => t.id)).toContain('wB');
  });
});

describe('YearGoalsTime — the card Retry re-reads the goal list too', () => {
  it('refetches the list container', () => {
    const calls = [];
    const vm = page();
    vm.$refs.list = { refetch: () => calls.push('list') };
    vm.refetchGoalList();
    expect(calls).toEqual(['list']);
  });
});

describe('YearGoalListContainer — search narrows the sheet, never the steppers', () => {
  const list = (props) => {
    const vm = {
      yearGoals: [{
        date: '31-12-2026',
        goalItems: [
          { id: 'yA', body: 'Alpha', routine: { name: 'A' } },
          { id: 'yB', body: 'Beta', routine: { name: 'B' } },
        ],
      }],
      activeId: 'yA',
      sort: 'routine',
      query: '',
      today: TODAY,
      ...props,
    };
    Object.keys(YearGoalListContainer.computed).forEach((key) => {
      Object.defineProperty(vm, key, {
        get: () => YearGoalListContainer.computed[key].call(vm),
        configurable: true,
      });
    });
    return vm;
  };

  it('keeps every id for ‹ › and "n of N" while a query filters the rows', () => {
    const vm = list({ query: 'zzzz-nomatch' });
    expect(vm.rows.filter((r) => !r.header)).toEqual([]);
    expect(vm.ids).toEqual(['yA', 'yB']);
  });

  it('marks a failed read so the switcher does not say "No year goals yet."', () => {
    const vm = { failed: false };
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
    YearGoalListContainer.apollo.yearGoals.error.call(vm, new Error('offline'));
    quiet.mockRestore();
    expect(vm.failed).toBe(true);
    YearGoalListContainer.apollo.yearGoals.update.call(vm, { currentYearGoals: [] });
    expect(vm.failed).toBe(false);
  });
});

/**
 * Owner decision: the year-goal chat PROPOSES week goals and creates them only
 * when "Add N week goals" is tapped — the same propose→add split as Home's
 * routine chat. Nothing is created on the reply, so the bubble never shows each
 * week twice (once as checkboxes, once as "added" proposals).
 */
describe('YearGoalChatContainer — propose, then add on tap', () => {
  const host = (reply, created = ['w1', 'w2', 'w3']) => {
    const tree = almostThere();
    const mutations = [];
    const creates = [];
    const vm = {
      goal: tree,
      month: tree.months[SEP],
      sending: false,
      typing: false,
      adding: {},
      mutations,
      creates,
      refetch: jest.fn(),
      $notify: jest.fn(),
      $emit: jest.fn((name, payload) => {
        if (name === 'create-weeks') {
          creates.push(payload.bodies);
          payload.done(created.slice(0, payload.bodies.length));
        }
      }),
      $listeners: { 'create-weeks': () => {} },
      $apollo: {
        mutate: jest.fn((options) => {
          mutations.push(options);
          if (options.mutation === SEND_ROUTINE_CHAT_MUTATION) {
            return Promise.resolve({ data: { sendRoutineChat: reply } });
          }
          return Promise.resolve({ data: {} });
        }),
      },
    };
    Object.keys(YearGoalChatContainer.computed).forEach((key) => {
      Object.defineProperty(vm, key, {
        get: () => YearGoalChatContainer.computed[key].call(vm),
        configurable: true,
      });
    });
    Object.keys(YearGoalChatContainer.methods).forEach((key) => {
      if (!vm[key]) vm[key] = YearGoalChatContainer.methods[key].bind(vm);
    });
    return vm;
  };
  const marked = (vm) => vm.mutations.filter((m) => m.mutation === MARK_ROUTINE_CHAT_ADDED_MUTATION);
  const events = (vm) => vm.mutations.filter((m) => m.mutation === POST_ROUTINE_CHAT_EVENT_MUTATION);

  it('creates nothing when the reply is a "Plan the weeks" break-down', async () => {
    const vm = host({
      intent: 'break_down',
      tasks: ['A', 'B', 'C'],
      replyMessage: { id: 'r1' },
    });
    await vm.send('Plan the weeks');
    expect(vm.creates).toEqual([]);
    expect(marked(vm)).toHaveLength(0);
  });

  it('still creates straight away when the user explicitly asks to add (as Home does)', async () => {
    const vm = host({
      intent: 'add_tasks',
      tasks: ['Launch week'],
      replyMessage: { id: 'r2' },
    });
    await vm.send('add a week goal: Launch week');
    expect(vm.creates).toEqual([['Launch week']]);
    expect(marked(vm)[0].variables).toEqual({ id: 'r2', items: ['w1'] });
  });

  it('creates the proposals on "Add all", attaches them and logs one event', async () => {
    const vm = host(null);
    await vm.onAddProposals({ id: 'r1', proposals: ['A', 'B', 'C'] });
    expect(vm.creates).toEqual([['A', 'B', 'C']]);
    expect(marked(vm)[0].variables).toEqual({ id: 'r1', items: ['w1', 'w2', 'w3'] });
    expect(events(vm)[0].variables.text).toBe('3 week goals added to September');
  });

  it('attaches only the weeks that fit the month (the page drops the rest)', async () => {
    const vm = host(null, ['w1']);
    await vm.onAddProposals({ id: 'r1', proposals: ['A', 'B', 'C'] });
    expect(marked(vm)[0].variables.items).toEqual(['w1']);
    expect(events(vm)[0].variables.text).toBe('1 week goal added to September');
  });

  it('leaves the bubble proposed when the month has no room for any of them', async () => {
    const vm = host(null, []);
    await vm.onAddProposals({ id: 'r1', proposals: ['A'] });
    expect(marked(vm)).toHaveLength(0);
    expect(events(vm)).toHaveLength(0);
  });

  it('ignores a second tap while the first is still adding, and an accepted bubble', async () => {
    const vm = host(null);
    vm.adding = { r1: true };
    await vm.onAddProposals({ id: 'r1', proposals: ['A'] });
    await vm.onAddProposals({ id: 'r2', proposals: ['A'], added: true });
    expect(vm.creates).toEqual([]);
  });

  it('resolves attached weeks from every month, so a reload on another month keeps the checkboxes', () => {
    const vm = host(null);
    const allWeekIds = vm.goal.months.flatMap((m) => m.weeks.map((w) => String(w.id)));
    expect(vm.threadItems.map((w) => String(w.id))).toEqual(allWeekIds);
    // Focus a month with no weeks: the bubble's ids still resolve.
    vm.month = vm.goal.months.find((m) => m.index === 11);
    expect(vm.weekGoals).toEqual([]);
    expect(vm.threadItems.map((w) => String(w.id))).toEqual(allWeekIds);
  });

  it('asks the shared thread to replace accepted proposals with their checkboxes', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../containers/YearGoalChatContainer.vue'), 'utf8',
    );
    const tag = source.slice(source.indexOf('<routine-chat-thread'));
    expect(tag.slice(0, tag.indexOf('/>'))).toContain('replace-added-proposals');
    expect(tag.slice(0, tag.indexOf('/>'))).toContain(':goal-items="threadItems"');
  });
});
