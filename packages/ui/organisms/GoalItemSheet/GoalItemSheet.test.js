/* eslint-env jest */
/**
 * GoalItemSheet — the goal-item page.
 *
 * What is pinned here:
 *
 *   1. the **three** status labels. They are not a binary, and "Ready · agent
 *      target" is the one the user cannot set — getting it wrong would promise a
 *      run that is not coming.
 *   2. a **past date locks the Date row**. `updateGoalItem`'s move path rewrites
 *      the owning day document; offering pills that then refuse is worse than
 *      saying so.
 *   3. the agent transcript is rendered as **text**. The sheet must never put
 *      third-party webhook HTML into the app's DOM — that is what the sandboxed
 *      iframe behind "Full transcript" is for.
 *
 * `MarkdownField` is stubbed: EasyMDE is tested where it lives, and loading it
 * here would drag CodeMirror into every assertion.
 */
jest.mock(
  '../../molecules/MarkdownField/MarkdownField.vue',
  () => ({
    __esModule: true,
    default: {
      name: 'MarkdownField',
      props: ['value', 'editorKey'],
      methods: { flush() { this.$emit('commit', this.value); } },
      render(h) {
        return h('div', { attrs: { 'data-testid': 'stub-markdown' } }, this.value);
      },
    },
  }),
);

/*
 * The Linked to / date pickers are the AI search toolbar's Vuetify molecules,
 * tested where they live. Stubs that expose their value and re-emit `input`
 * (and the date one's `update:period`) are all this sheet needs of them.
 */
const pickerStub = (name, testid) => ({
  __esModule: true,
  default: {
    name,
    props: ['value', 'items', 'period', 'taskMode', 'label'],
    render(h) {
      return h('div', { attrs: { 'data-testid': testid, 'data-value': this.value || '' } });
    },
  },
});
jest.mock('../../molecules/DateSelector/DateSelector.vue', () => pickerStub('MoleculeDateSelector', 'goal-sheet-date-picker'));
jest.mock('../../molecules/GoalTaskSelector/GoalTaskSelector.vue', () => pickerStub('GoalTaskSelector', 'goal-sheet-routine-picker'));
jest.mock('../../molecules/GoalRefSelector/GoalRefSelector.vue', () => pickerStub('GoalRefSelector', 'goal-sheet-goal-ref-picker'));

const Vue = require('vue');

const GoalItemSheet = require('./GoalItemSheet.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const ITEM = {
  id: 'g1',
  body: 'Ship dashboard PR',
  contribution: 'Closes the last blocker.',
  isComplete: false,
  ready: false,
  reward: '',
  goalRef: 'wg1',
  taskRef: 'sw',
  tags: ['project:dashboard'],
  subTasks: [{ id: 's1', body: 'Fix offsets', isComplete: false }],
};

const EVENTS = [
  'close', 'toggle-status', 'delete', 'update-title', 'commit-contribution',
  'update-tags', 'pick-date', 'open-transcript', 'reward-seen',
  'add-subtask', 'toggle-subtask', 'rename-subtask', 'move-subtask-up', 'remove-subtask',
];

const render = (props = {}) => {
  const vm = new Vue({
    render(h) {
      return h(GoalItemSheet, {
        props: {
          open: true,
          item: ITEM,
          periodLabel: 'Day goal · 12 Sep 2026',
          routineLabel: 'Start Work · 09:00',
          goalRefLabel: 'Ship the dashboard',
          dateLabel: 'Today · Sat 12 Sep',
          dateOptions: [
            { key: 'today', label: 'Today', active: true, date: '12-09-2026' },
            { key: 'tomorrow', label: 'Tomorrow', active: false, date: '13-09-2026' },
          ],
          ...props,
        },
      });
    },
  }).$mount();
  const sheet = vm.$children[0];
  const events = {};
  EVENTS.forEach((name) => {
    events[name] = [];
    sheet.$on(name, (payload) => events[name].push(payload));
  });
  return { vm, el: vm.$el, sheet, events };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);

/** A descendant component by name — the pickers sit inside ResponsiveSheet's slot. */
const findByName = (vm, name) => {
  const stack = [...vm.$children];
  while (stack.length) {
    const next = stack.shift();
    if (next.$options.name === name) return next;
    stack.push(...next.$children);
  }
  return null;
};

describe('GoalItemSheet — the three status labels', () => {
  it('Open for an item nothing is waiting on', () => {
    const { el } = render();
    expect(q(el, 'goal-sheet-status').textContent.trim()).toBe('Open');
  });

  it('Ready · agent target when an agent will be dispatched against it', () => {
    const { el } = render({ item: { ...ITEM, ready: true } });
    expect(q(el, 'goal-sheet-status').textContent.trim()).toBe('Ready · agent target');
  });

  it('Complete once it is done, and complete beats ready', () => {
    const { el } = render({ item: { ...ITEM, isComplete: true, ready: true } });
    expect(q(el, 'goal-sheet-status').textContent.trim()).toBe('Complete');
  });

  it('the pill is the toggle', () => {
    const { el, events } = render();
    q(el, 'goal-sheet-status').click();
    expect(events['toggle-status']).toEqual([ITEM]);
  });
});

describe('GoalItemSheet — header', () => {
  it('shows the period label and emits delete / close', () => {
    const { el, events } = render();
    expect(q(el, 'goal-sheet-period').textContent).toBe('Day goal · 12 Sep 2026');
    q(el, 'goal-sheet-delete').click();
    expect(events.delete).toEqual([ITEM]);
    q(el, 'goal-sheet-close').click();
    expect(events.close).toHaveLength(1);
  });

  it('closing commits an open contribution rather than dropping it', () => {
    const { el, events } = render();
    q(el, 'goal-sheet-close').click();
    expect(events['commit-contribution']).toEqual([
      { item: ITEM, contribution: 'Closes the last blocker.' },
    ]);
  });
});

describe('GoalItemSheet — title', () => {
  it('emits the trimmed body on change', () => {
    const { el, events } = render();
    const title = q(el, 'goal-sheet-title');
    title.value = '  Ship the dashboard PR  ';
    title.dispatchEvent(new Event('change'));
    expect(events['update-title']).toEqual([
      { item: ITEM, body: 'Ship the dashboard PR' },
    ]);
  });

  it('never writes an empty title', () => {
    const { el, events } = render();
    const title = q(el, 'goal-sheet-title');
    title.value = '   ';
    title.dispatchEvent(new Event('change'));
    expect(events['update-title']).toEqual([]);
  });
});

describe('GoalItemSheet — Date row', () => {
  it('offers the quick-picks and emits the one that is picked', () => {
    const { el, events } = render();
    expect(q(el, 'goal-sheet-date').textContent).toBe('Today · Sat 12 Sep');
    q(el, 'goal-sheet-date-tomorrow').click();
    expect(events['pick-date']).toEqual([
      { item: ITEM, option: { key: 'tomorrow', label: 'Tomorrow', active: false, date: '13-09-2026' } },
    ]);
  });

  it('ignores a pick that is already the current date', () => {
    const { el, events } = render();
    q(el, 'goal-sheet-date-today').click();
    expect(events['pick-date']).toEqual([]);
  });

  it('a past date locks the row — no pills, and it says why', () => {
    const { el } = render({ dateLocked: true, dateLabel: '11 Sep 2026' });
    expect(q(el, 'goal-sheet-date-locked').textContent)
      .toContain('past dates can’t change');
    expect(q(el, 'goal-sheet-date-today')).toBeNull();
    expect(q(el, 'goal-sheet-date-tomorrow')).toBeNull();
  });
});

describe('GoalItemSheet — Linked to, locked', () => {
  it('renders the routine then the parent goal', () => {
    const { el } = render({ linkLocked: true });
    expect(q(el, 'goal-sheet-routine').textContent).toContain('Start Work · 09:00');
    expect(q(el, 'goal-sheet-goal-ref').textContent).toContain('Ship the dashboard');
    expect(q(el, 'goal-sheet-no-goal-ref')).toBeNull();
    expect(q(el, 'goal-sheet-routine-picker')).toBeNull();
  });

  it('says so when it rolls up into nothing', () => {
    const { el } = render({ linkLocked: true, goalRefLabel: '' });
    expect(q(el, 'goal-sheet-no-goal-ref').textContent.trim())
      .toBe('Not linked to a week goal');
    expect(q(el, 'goal-sheet-goal-ref')).toBeNull();
  });

  it('an item with no routine is labelled Inbox', () => {
    const { el } = render({ linkLocked: true, routineLabel: 'Inbox' });
    expect(q(el, 'goal-sheet-routine').textContent).toContain('Inbox');
  });

  it('drops the routine chip when there is no routine label (Year Goals)', () => {
    const { el } = render({ linkLocked: true, routineLabel: '' });
    expect(q(el, 'goal-sheet-routine')).toBeNull();
    expect(q(el, 'goal-sheet-goal-ref').textContent).toContain('Ship the dashboard');
  });
});

/*
 * Editing a saved item (Home's host, and the only one that opens the sheet this
 * way) shows Linked to as chips, never pickers: re-pointing a saved goal at a
 * different routine or parent re-parents a node mid-cascade and moves the
 * roll-up counts on both sides, with no confirm and no undo.
 */
describe('GoalItemSheet — Linked to while EDITING is read-only', () => {
  it('shows the chips, not the pickers', () => {
    const { el } = render();
    expect(q(el, 'goal-sheet-routine-picker')).toBeNull();
    expect(q(el, 'goal-sheet-goal-ref-picker')).toBeNull();
    expect(q(el, 'goal-sheet-routine').textContent).toContain('Start Work · 09:00');
    expect(q(el, 'goal-sheet-goal-ref').textContent).toContain('Ship the dashboard');
  });

  it('offers no way to emit a link change at all', () => {
    const { sheet } = render();
    expect(findByName(sheet, 'GoalTaskSelector')).toBeNull();
    expect(findByName(sheet, 'GoalRefSelector')).toBeNull();
  });
});

describe('GoalItemSheet — Linked to while ADDING', () => {
  const adding = (props = {}) => render({
    mode: 'create',
    seed: { period: 'day', date: '12-09-2026', taskRef: 'sw', goalRef: 'wg1' },
    ...props,
  });

  const pickers = (sheet) => ({
    routine: findByName(sheet, 'GoalTaskSelector'),
    goalRef: findByName(sheet, 'GoalRefSelector'),
  });

  it('shows the routine and parent-goal pickers on the draft’s link', () => {
    const { el } = adding();
    expect(q(el, 'goal-sheet-routine-picker').getAttribute('data-value')).toBe('sw');
    expect(q(el, 'goal-sheet-goal-ref-picker').getAttribute('data-value')).toBe('wg1');
    expect(q(el, 'goal-sheet-routine')).toBeNull();
  });

  it('writes the pick into the draft rather than emitting a save', () => {
    const { sheet } = adding();
    const links = [];
    sheet.$on('update-link', (payload) => links.push(payload));
    pickers(sheet).goalRef.$emit('input', 'wg2');
    pickers(sheet).routine.$emit('input', 'eve');
    expect(sheet.form.goalRef).toBe('wg2');
    expect(sheet.form.taskRef).toBe('eve');
    expect(links).toEqual([]);
  });

  it('clearing a pick empties the draft’s ref', () => {
    const { sheet } = adding();
    pickers(sheet).goalRef.$emit('input', null);
    expect(sheet.form.goalRef).toBe('');
  });

  it('labels the parent picker one period up', () => {
    const { sheet } = adding({ seed: { period: 'week', date: '12-09-2026' } });
    expect(pickers(sheet).goalRef.label).toBe('Rolls up into a month goal');
  });

  it('keeps the routine picker but locks the parent when the caller fixes it (Year Goals)', () => {
    const { el } = adding({ linkLocked: true });
    expect(q(el, 'goal-sheet-routine-picker').getAttribute('data-value')).toBe('sw');
    expect(q(el, 'goal-sheet-goal-ref-picker')).toBeNull();
    expect(q(el, 'goal-sheet-goal-ref').textContent).toContain('Ship the dashboard');
  });
});

describe('GoalItemSheet — create mode', () => {
  const SEED = {
    period: 'day', date: '12-09-2026', taskRef: 'sw', goalRef: '',
  };
  const create = (props = {}) => {
    const out = render({
      mode: 'create', item: null, seed: SEED, periodLabel: 'New task', ...props,
    });
    out.created = [];
    out.contexts = [];
    out.sheet.$on('create', (payload) => out.created.push(payload));
    out.sheet.$on('link-context', (payload) => out.contexts.push(payload));
    return out;
  };
  const type = (el, text) => {
    const title = q(el, 'goal-sheet-title');
    title.value = text;
    title.dispatchEvent(new Event('input'));
  };
  const child = findByName;

  it('swaps the status pill and delete for an Add button', () => {
    const { el } = create();
    expect(q(el, 'goal-sheet-create')).not.toBeNull();
    expect(q(el, 'goal-sheet-status')).toBeNull();
    expect(q(el, 'goal-sheet-delete')).toBeNull();
    expect(q(el, 'goal-sheet-date-picker')).not.toBeNull();
  });

  it('cannot add without a title', () => {
    const { el } = create();
    expect(q(el, 'goal-sheet-create').disabled).toBe(true);
  });

  it('emits one create with the whole draft', async () => {
    const { el, sheet, created } = create();
    type(el, '  Write the release notes  ');
    child(sheet, 'GoalRefSelector').$emit('input', 'wg1');
    sheet.onTagsInput(['project:beta']);
    sheet.onContributionInput('Unblocks the launch.');
    await Vue.nextTick();
    q(el, 'goal-sheet-create').click();
    expect(created).toEqual([{
      body: 'Write the release notes',
      contribution: 'Unblocks the launch.',
      tags: ['project:beta'],
      period: 'day',
      date: '12-09-2026',
      taskRef: 'sw',
      goalRef: 'wg1',
    }]);
  });

  it('Enter in the title adds', () => {
    const { el, created } = create();
    type(el, 'Quick one');
    q(el, 'goal-sheet-title').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(created.map((d) => d.body)).toEqual(['Quick one']);
  });

  it("a new period drops the date and the parent, and asks for that period's parents", () => {
    const { el, sheet, contexts } = create({ seed: { ...SEED, goalRef: 'wg1' } });
    child(sheet, 'MoleculeDateSelector').$emit('update:period', 'week');
    expect(sheet.form).toMatchObject({ period: 'week', date: '', goalRef: '' });
    expect(contexts[contexts.length - 1]).toEqual({ period: 'week', date: '' });
    type(el, 'Plan the week');
    expect(sheet.canCreate).toBe(false);
  });

  it('a lifetime goal gets the one lifetime date', () => {
    const { sheet } = create();
    child(sheet, 'MoleculeDateSelector').$emit('update:period', 'lifetime');
    expect(sheet.form.date).toBe('01-01-1970');
  });

  it('a new date asks for the parents of that date', () => {
    const { sheet, contexts } = create();
    child(sheet, 'MoleculeDateSelector').$emit('input', '13-09-2026');
    expect(contexts[contexts.length - 1]).toEqual({ period: 'day', date: '13-09-2026' });
  });

  it('locked (Year Goals): read-only date and link, and still adds', async () => {
    const { el, created } = create({
      seed: { ...SEED, goalRef: 'wg1' },
      dateLocked: true,
      linkLocked: true,
      dateLabel: 'Week 37',
      routineLabel: '',
      goalRefLabel: 'Ship the dashboard',
    });
    expect(q(el, 'goal-sheet-date-picker')).toBeNull();
    expect(q(el, 'goal-sheet-goal-ref-picker')).toBeNull();
    expect(q(el, 'goal-sheet-routine-picker')).not.toBeNull();
    expect(q(el, 'goal-sheet-date').textContent).toContain('Week 37');
    type(el, 'Day goal');
    await Vue.nextTick();
    q(el, 'goal-sheet-create').click();
    expect(created[0]).toMatchObject({ goalRef: 'wg1', date: '12-09-2026', period: 'day' });
  });

  it('never sends a contribution commit or a title write while drafting', () => {
    const { sheet, events } = create();
    sheet.onCommitContribution('draft text');
    expect(events['commit-contribution']).toEqual([]);
    expect(events['update-title']).toEqual([]);
  });

  it('starts blank on every open', async () => {
    const host = new Vue({
      data: () => ({ open: true }),
      render(h) {
        return h(GoalItemSheet, { props: { open: this.open, mode: 'create', seed: SEED } });
      },
    }).$mount();
    const sheet = host.$children[0];
    sheet.form.body = 'left over';
    host.open = false;
    await Vue.nextTick();
    host.open = true;
    await Vue.nextTick();
    expect(sheet.form.body).toBe('');
  });
});

describe('GoalItemSheet — agent result', () => {
  const REWARD = {
    ...ITEM,
    reward: '<p><b>PR #482</b></p><ul><li>41 tests passed</li></ul><script>alert(1)</script>',
  };

  it('is absent until the end event saved a transcript', () => {
    const { el } = render();
    expect(q(el, 'goal-sheet-reward')).toBeNull();
  });

  it('renders the transcript as TEXT, with the script gone', () => {
    const { el } = render({ item: REWARD, rewardMeta: 'Updated by PR Summarizer · end event · 11:42' });
    const body = q(el, 'goal-sheet-reward-body');
    expect(body.textContent).toBe('PR #482\n41 tests passed');
    expect(body.innerHTML).not.toContain('<b>');
    expect(body.innerHTML).not.toContain('script');
    expect(q(el, 'goal-sheet-reward').textContent)
      .toContain('Updated by PR Summarizer · end event · 11:42');
  });

  it('clamps until Show more, then says Show less', async () => {
    const { el } = render({ item: REWARD });
    expect(q(el, 'goal-sheet-reward-body').className)
      .toContain('rn-gis__reward-body--clamped');
    expect(q(el, 'goal-sheet-reward-more').textContent).toContain('Show more');

    q(el, 'goal-sheet-reward-more').click();
    await Vue.nextTick();
    expect(q(el, 'goal-sheet-reward-body').className)
      .not.toContain('rn-gis__reward-body--clamped');
    expect(q(el, 'goal-sheet-reward-more').textContent).toContain('Show less');
  });

  it('shows the NEW pill while unseen and reports it read on first expand', async () => {
    const { el, events } = render({ item: REWARD, rewardNew: true });
    expect(q(el, 'goal-sheet-reward-new')).toBeTruthy();
    q(el, 'goal-sheet-reward-more').click();
    await Vue.nextTick();
    expect(events['reward-seen']).toEqual([REWARD]);
  });

  it('hands the real document to the sandbox via Full transcript', () => {
    const { el, events } = render({ item: REWARD });
    q(el, 'goal-sheet-transcript').click();
    expect(events['open-transcript']).toEqual([REWARD]);
  });

  it('a fresh item starts with the transcript collapsed again', async () => {
    const host = new Vue({
      data: () => ({ item: REWARD }),
      render(h) {
        return h(GoalItemSheet, { props: { open: true, item: this.item } });
      },
    }).$mount();
    const sheet = host.$children[0];
    sheet.toggleReward();
    expect(sheet.rewardOpen).toBe(true);
    host.item = { ...REWARD, id: 'g2' };
    await Vue.nextTick();
    expect(sheet.rewardOpen).toBe(false);
  });
});

/** Depth-first search for a mounted child by component name. */
const findChild = (vm, name) => {
  if (!vm) return null;
  const queue = [...(vm.$children || [])];
  while (queue.length) {
    const next = queue.shift();
    if (next.$options.name === name) return next;
    queue.push(...(next.$children || []));
  }
  return null;
};

describe('GoalItemSheet — subtasks and tags pass through', () => {
  it('re-emits a subtask gesture with the parent item attached', () => {
    const { sheet, events } = render();
    const editor = findChild(sheet, 'MoleculeSubtaskEditor');
    expect(editor).toBeTruthy();
    expect(editor.subtasks).toEqual(ITEM.subTasks);

    editor.$emit('add', 'Write release notes');
    expect(events['add-subtask']).toEqual([{ item: ITEM, body: 'Write release notes' }]);

    editor.$emit('rename', { subtask: ITEM.subTasks[0], body: 'Fix the ring offsets' });
    expect(events['rename-subtask']).toEqual([
      { item: ITEM, subtask: ITEM.subTasks[0], body: 'Fix the ring offsets' },
    ]);

    editor.$emit('move-up', ITEM.subTasks[0]);
    expect(events['move-subtask-up']).toEqual([{ item: ITEM, subtask: ITEM.subTasks[0] }]);
  });

  it('gives the tag input the universe and the current tags', () => {
    const { sheet, events } = render({ tagUniverse: ['area:work', 'project:dashboard'] });
    const tagInput = findChild(sheet, 'MoleculeHierarchicalTagInput');
    expect(tagInput.value).toEqual(['project:dashboard']);
    expect(tagInput.universe).toEqual(['area:work', 'project:dashboard']);

    tagInput.$emit('input', ['project:dashboard', 'area:work']);
    expect(events['update-tags']).toEqual([
      { item: ITEM, tags: ['project:dashboard', 'area:work'] },
    ]);
  });
});

describe('GoalItemSheet — closed', () => {
  it('renders nothing while closed', () => {
    const { el } = render({ open: false });
    expect(el.nodeType).toBe(8);
  });
});

describe('GoalItemSheet — view only', () => {
  it('is the same sheet with every input disabled, no toggle and no delete', () => {
    const { el, events } = render({ readonly: true, readonlyNote: 'View only · August is over' });
    expect(q(el, 'goal-sheet-readonly').textContent).toContain('August is over');
    expect(q(el, 'goal-sheet-title').disabled).toBe(true);
    expect(q(el, 'goal-sheet-delete')).toBeNull();
    expect(q(el, 'goal-sheet-date-today')).toBeNull();
    const locked = el.querySelectorAll('.rn-gis__lockable');
    expect(locked.length).toBeGreaterThanOrEqual(3);
    locked.forEach((node) => expect(node.hasAttribute('inert')).toBe(true));
    q(el, 'goal-sheet-status').click();
    expect(events['toggle-status']).toHaveLength(0);
  });

  it('names the parent noun by period when nothing is linked', () => {
    const { el } = render({ period: 'week', goalRefLabel: '', linkLocked: true });
    expect(q(el, 'goal-sheet-no-goal-ref').textContent.trim()).toBe('Not linked to a month goal');
  });
});
