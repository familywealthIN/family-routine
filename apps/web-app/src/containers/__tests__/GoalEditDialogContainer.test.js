/* eslint-env jest */
/**
 * GoalEditDialogContainer — the Goals page's editor.
 *
 * It is `DashBoard`'s goal-display dialog, mounted a second time: the SAME
 * fullscreen `atom-dialog`, the SAME close-only white toolbar, and the SAME
 * `GoalCreationContainer` inside. Nothing about the editor is re-presented, so
 * the things pinned here are:
 *
 *   1. **The chrome is the dashboard's.** Fullscreen, overlay hidden, bottom
 *      transition, and a toolbar whose only control is close — no title, and no
 *      delete. Delete lives on the cascade row (GoalCascade), exactly as the
 *      dashboard puts it on its goal lists.
 *   2. **The draft is a safe, complete copy.** `GoalCreation` edits
 *      `newGoalItem` IN PLACE, and the item handed in is a shallow copy of
 *      Apollo's normalized record — writing into its `tags` / `subTasks` would
 *      mutate the cache behind Apollo's back (ARCHITECTURE § 3.1).
 *   3. **`goalRef`, `taskRef`, `isMilestone`, `tags` and `subTasks` survive**
 *      from the row into the mutation. That is the capability, and a dropped
 *      `goalRef` would silently unroot a milestone.
 *   4. **Parity with the dashboard path**: the same container, so the same
 *      `$goals.updateGoalItem` / `addGoalItem` with the same arguments.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

// Mounted below only to prove the dialog chrome is wired; the editor itself is
// `GoalCreationContainer`, which is exercised through its own methods further
// down (and in GoalCreationContainer.test.js).
jest.mock(
  '../GoalCreationContainer.vue',
  () => ({
    __esModule: true,
    default: {
      name: 'GoalCreationContainer',
      props: { newGoalItem: { type: Object, required: true } },
      render(h) {
        return h('div', { attrs: { 'data-testid': 'stub-editor' } }, this.newGoalItem.body || '');
      },
    },
  }),
);

const Vue = require('vue');
const Vuetify = require('vuetify');

const Container = require('../GoalEditDialogContainer.vue').default;
const { draftFrom } = require('../GoalEditDialogContainer.vue');
/** The REAL dashboard container, for the parity block at the bottom. */
const GoalCreationContainer = jest.requireActual('../GoalCreationContainer.vue').default;
/** The dashboard's own mount of the same dialog, for the chrome comparison. */
const DashboardDialog = require('../GoalDisplayModalContainer.vue').default;

Vue.use(Vuetify);
Vue.config.productionTip = false;
Vue.config.devtools = false;

/**
 * Mount the dialog with the editor stubbed, to check the chrome only. Wrapped in
 * a host element because Vuetify's dialog keeps its content in place when there
 * is no `[data-app]` to detach into, and a root node cannot be found by
 * `querySelector` on itself.
 */
const mount = (props = {}) => {
  const events = { close: 0, saved: [] };
  const vm = new Vue({
    render: (h) => h('div', [h(Container, {
      props: { open: true, ...props },
      on: {
        close: () => { events.close += 1; },
        saved: (payload) => events.saved.push(payload),
      },
    })]),
  }).$mount();
  return { el: vm.$el, vm, events };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A goal item exactly as `goalCascade.itemsFor` hands it up from the read. */
const ROW_ITEM = {
  id: 'g1',
  body: 'Ship dashboard PR',
  contribution: 'Closes the last blocker.',
  reward: '',
  isComplete: false,
  isMilestone: true,
  taskRef: 'sw',
  goalRef: 'wg1',
  tags: ['project:dashboard', 'area:product'],
  status: 'todo',
  progress: 2,
  subTasks: [{ id: 's1', body: 'Fix offsets', isComplete: false }],
  period: 'day',
  date: '12-09-2026',
};

const ctx = (over = {}) => {
  const emitted = [];
  const base = {
    item: ROW_ITEM,
    period: 'day',
    date: '12-09-2026',
    draft: draftFrom(ROW_ITEM),
    editorKey: 0,
    $emit: (evt, ...args) => emitted.push({ evt, args }),
    ...over,
  };
  base.emitted = emitted;
  base.isNew = Container.computed.isNew.call(base);
  base.resetDraft = () => Container.methods.resetDraft.call(base);
  return base;
};

describe('the draft handed to GoalCreation', () => {
  it('carries every field the editor binds, filled from defaults where the read had none', () => {
    const draft = draftFrom(ROW_ITEM);
    expect(draft).toMatchObject({
      id: 'g1',
      body: 'Ship dashboard PR',
      period: 'day',
      date: '12-09-2026',
      taskRef: 'sw',
      goalRef: 'wg1',
      isMilestone: true,
    });
    // `deadline` is never selected by the cascade read, but the form binds it.
    expect(Object.prototype.hasOwnProperty.call(draft, 'deadline')).toBe(true);
    expect(draft.tags).toEqual(['project:dashboard', 'area:product']);
    expect(draft.subTasks).toEqual([{ id: 's1', body: 'Fix offsets', isComplete: false }]);
  });

  it('copies the arrays, so editing them cannot write into Apollo record', () => {
    const draft = draftFrom(ROW_ITEM);
    draft.tags.push('new');
    draft.subTasks[0].body = 'edited';
    expect(ROW_ITEM.tags).toEqual(['project:dashboard', 'area:product']);
    expect(ROW_ITEM.subTasks[0].body).toBe('Fix offsets');
  });

  it('starts blank on the ladder period and date when there is no item', () => {
    const draft = draftFrom(null, { period: 'week', date: '11-09-2026' });
    expect(draft.id).toBeUndefined();
    expect(draft).toMatchObject({ body: '', period: 'week', date: '11-09-2026' });
    expect(draft.tags).toEqual([]);
    expect(draft.subTasks).toEqual([]);
  });

  it('rebuilds on open, and remounts the markdown editor with it', () => {
    const context = ctx();
    Container.watch.open.handler.call(context, true);
    expect(context.draft.id).toBe(ROW_ITEM.id);
    expect(context.editorKey).toBe(1);
  });

  it('rebuilds when a DIFFERENT item is opened', () => {
    const next = { ...ROW_ITEM, id: 'g2', body: 'Other' };
    // Vue updates the prop before the watcher runs, and `resetDraft` reads it.
    const context = ctx({ item: next });
    Container.watch.item.call(context, next, ROW_ITEM);
    expect(context.draft.id).toBe('g2');
    expect(context.editorKey).toBe(1);
  });

  // The regression this guards: `GoalsCascadeContainer` resolves the record from
  // its own read, so a `cache-and-network` refetch republishes the SAME item as a
  // new object mid-edit. Rebuilding then discarded what the user had typed and
  // remounted `GoalCreation`, whose `beforeDestroy` clears its pending 2-second
  // contribution auto-save — so a background refetch silently dropped the
  // contribution. Watching `item` by object identity is what caused it.
  it('does NOT rebuild when the same item is republished mid-edit', () => {
    const context = ctx();
    context.draft.contribution = 'half a sentence the user is still typing';
    Container.watch.item.call(context, { ...ROW_ITEM }, ROW_ITEM);
    expect(context.editorKey).toBe(0);
    expect(context.draft.contribution).toBe('half a sentence the user is still typing');
  });

  it('does not rebuild while the dialog is closing', () => {
    const context = ctx();
    Container.watch.open.handler.call(context, false);
    expect(context.editorKey).toBe(0);
  });
});

/**
 * The correction this file exists for: the editor is NOT a chassis sheet with a
 * header of its own. It is the dashboard's dialog.
 */
describe('the chrome is DashBoard dialog, not a sheet of its own', () => {
  it('mounts the same atoms the dashboard goal dialog mounts', () => {
    ['AtomDialog', 'AtomCard', 'AtomCardText', 'AtomToolbar', 'AtomSpacer', 'AtomButton', 'AtomIcon']
      .forEach((atom) => {
        expect(Container.components[atom]).toBe(DashboardDialog.components[atom]);
      });
    expect(Container.components.GoalCreation.name).toBe('GoalCreationContainer');
  });

  it('is fullscreen, with the overlay hidden and the bottom transition', () => {
    const { el } = mount({ item: ROW_ITEM });
    const dialog = el.querySelector('.v-dialog');
    expect(dialog).not.toBeNull();
    expect(dialog.className).toContain('v-dialog--fullscreen');
    // `hide-overlay` — nothing dims the page behind a fullscreen editor.
    expect(el.querySelector('.v-overlay')).toBeNull();
  });

  it('carries a white toolbar whose only control is close', () => {
    const { el } = mount({ item: ROW_ITEM });
    const toolbar = el.querySelector('.v-toolbar');
    expect(toolbar).not.toBeNull();
    expect(toolbar.className).toContain('white');
    expect(toolbar.querySelectorAll('button').length).toBe(1);
    expect(q(el, 'goal-edit-close')).not.toBeNull();
    expect(q(el, 'goal-edit-close').textContent.trim()).toBe('close');
  });

  it('has no title and no delete in the editor chrome at all', () => {
    const { el } = mount({ item: ROW_ITEM });
    expect(q(el, 'goal-edit-title')).toBeNull();
    expect(q(el, 'goal-edit-delete')).toBeNull();
    expect(el.textContent).not.toContain('Edit goal');
    expect(el.textContent).not.toContain('Delete');
    // The sheet chassis is gone with it.
    expect(el.querySelector('.rn-rsheet')).toBeNull();
    expect(Container.components.ResponsiveSheet).toBeUndefined();
    // And so are the CSS overrides that only existed to squeeze the form into it.
    expect(Container.methods.requestDelete).toBeUndefined();
  });

  it('takes no shell prop, because a fullscreen dialog has no per-shell geometry', () => {
    expect(Container.props.shell).toBeUndefined();
  });

  it('asks the page to close rather than closing itself', () => {
    const { el, events } = mount({ item: ROW_ITEM });
    q(el, 'goal-edit-close').click();
    expect(events.close).toBe(1);
  });

  it('forwards Escape — the dialog own close — as the same request', () => {
    const context = ctx();
    Container.methods.onDialogInput.call(context, false);
    expect(context.emitted).toEqual([{ evt: 'close', args: [] }]);
    const stillOpen = ctx();
    Container.methods.onDialogInput.call(stillOpen, true);
    expect(stillOpen.emitted).toEqual([]);
  });

  it('renders the draft, not Apollo record, into the editor', () => {
    const { el } = mount({ item: ROW_ITEM });
    expect(q(el, 'stub-editor').textContent).toBe('Ship dashboard PR');
  });
});

describe('a save closes the dialog and tells the page which write it was', () => {
  it('reports an edit', () => {
    const context = ctx();
    Container.methods.onSaved.call(context, { ...ROW_ITEM }, false);
    expect(context.emitted.map(({ evt }) => evt)).toEqual(['saved', 'close']);
    expect(context.emitted[0].args[0]).toMatchObject({ created: false });
    expect(context.emitted[0].args[0].goalItem.id).toBe('g1');
  });

  it('reports a create, because the draft it opened with had no id', () => {
    const context = ctx({ item: null, draft: draftFrom(null, { period: 'week', date: '11-09-2026' }) });
    Container.methods.onSaved.call(context, { id: 'new1', period: 'week', body: 'Ship it' }, false);
    expect(context.emitted[0].args[0]).toMatchObject({ created: true });
  });

  it('stays open when the inner container says so', () => {
    const context = ctx();
    Container.methods.onSaved.call(context, { ...ROW_ITEM }, true);
    expect(context.emitted).toEqual([]);
  });
});

/**
 * The point of mounting `GoalCreationContainer` rather than writing a second
 * editor: the mutation, its arguments and its cache update are the dashboard's.
 * These drive the REAL container methods with the draft this dialog builds.
 */
describe('parity with the DashBoard path', () => {
  const creationCtx = (over = {}) => {
    const emitted = [];
    return {
      buttonLoading: false,
      savedPeriod: 'day',
      $goals: {
        updateGoalItem: jest.fn(() => Promise.resolve({ id: 'g1' })),
        addGoalItem: jest.fn(() => Promise.resolve({ id: 'new1' })),
      },
      $notify: jest.fn(),
      $emit: (evt, payload) => emitted.push({ evt, payload }),
      emitted,
      ...over,
    };
  };

  it('persists an edited body, tags, milestone flag and goalRef through updateGoalItem', async () => {
    const draft = draftFrom(ROW_ITEM);
    // What the editor's fields do: retitle it, retag it, keep it a milestone.
    draft.body = 'Ship dashboard PR v2';
    draft.tags = ['project:dashboard', 'area:product', 'focus'];
    draft.contribution = 'Shipped behind the flag.';

    const context = creationCtx();
    GoalCreationContainer.methods.handleUpdateGoalItem.call(context, { ...draft });
    await flush();

    expect(context.$goals.updateGoalItem).toHaveBeenCalledWith(expect.objectContaining({
      id: 'g1',
      body: 'Ship dashboard PR v2',
      period: 'day',
      date: '12-09-2026',
      taskRef: 'sw',
      // The milestone's parent link, inherited from the row and not re-derived.
      goalRef: 'wg1',
      isMilestone: true,
      tags: ['project:dashboard', 'area:product', 'focus'],
      contribution: 'Shipped behind the flag.',
    }));
  });

  it('creates through the same addGoalItem a dashboard quick-add uses', async () => {
    const draft = draftFrom(null, { period: 'week', date: '11-09-2026' });
    draft.body = 'Clear the backlog';
    draft.taskRef = 'sw';
    draft.goalRef = 'mg1';
    draft.isMilestone = true;
    draft.tags = ['area:product'];

    const context = creationCtx();
    GoalCreationContainer.methods.handleAddGoalItem.call(context, { ...draft });
    await flush();

    expect(context.$goals.addGoalItem).toHaveBeenCalledWith(expect.objectContaining({
      body: 'Clear the backlog',
      period: 'week',
      date: '11-09-2026',
      taskRef: 'sw',
      goalRef: 'mg1',
      isMilestone: true,
      tags: ['area:product'],
    }));
  });

  it('keeps the subtask gestures on the dashboard mutations', async () => {
    const context = creationCtx({
      $goals: {
        addSubTaskItem: jest.fn(() => Promise.resolve({ id: 's2' })),
        completeSubTaskItem: jest.fn(() => Promise.resolve({})),
        deleteSubTaskItem: jest.fn(() => Promise.resolve({})),
      },
    });
    const payload = {
      taskId: 'g1', body: 'Add tests', period: 'day', date: '12-09-2026', isComplete: false,
    };
    GoalCreationContainer.methods.handleAddSubTaskItem.call(context, payload);
    GoalCreationContainer.methods.handleCompleteSubTaskItem.call(context, { ...payload, id: 's1', isComplete: true });
    GoalCreationContainer.methods.handleDeleteSubTaskItem.call(context, { ...payload, id: 's1' });
    await flush();

    expect(context.$goals.addSubTaskItem).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'g1', body: 'Add tests' }));
    expect(context.$goals.completeSubTaskItem).toHaveBeenCalledWith(expect.objectContaining({ id: 's1', isComplete: true }));
    expect(context.$goals.deleteSubTaskItem).toHaveBeenCalledWith(expect.objectContaining({ id: 's1', taskId: 'g1' }));
  });
});
