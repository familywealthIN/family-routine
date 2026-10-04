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

describe('GoalItemSheet — Linked to', () => {
  it('renders the routine then the parent goal', () => {
    const { el } = render();
    expect(q(el, 'goal-sheet-routine').textContent).toContain('Start Work · 09:00');
    expect(q(el, 'goal-sheet-goal-ref').textContent).toContain('Ship the dashboard');
    expect(q(el, 'goal-sheet-no-goal-ref')).toBeNull();
  });

  it('says so when it rolls up into nothing', () => {
    const { el } = render({ goalRefLabel: '' });
    expect(q(el, 'goal-sheet-no-goal-ref').textContent.trim())
      .toBe('Not linked to a week goal');
    expect(q(el, 'goal-sheet-goal-ref')).toBeNull();
  });

  it('an item with no routine is labelled Inbox', () => {
    const { el } = render({ routineLabel: 'Inbox' });
    expect(q(el, 'goal-sheet-routine').textContent).toContain('Inbox');
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
