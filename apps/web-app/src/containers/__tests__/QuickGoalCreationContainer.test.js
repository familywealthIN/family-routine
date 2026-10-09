/* eslint-env jest */
/**
 * Contract test for QuickGoalCreationContainer.addGoalItem.
 *
 * Both quick-modal buttons route through addGoalItem:
 *   - "Start Task"  → addGoalItem(item)                    (explicitAgent: false)
 *   - "Start Agent" → addGoalItem(item, {explicitAgent:true})
 *
 * Regression: "Start Task" must NOT fire the agent's start event — only the
 * explicit "Start Agent" press does. (Previously addGoalItem fired
 * fireStartEventIfPresent whenever an agent was assigned, so Start Task also
 * kicked off the agent.)
 */

// Keep the require light + deterministic: stub the presentational organism and
// the date helpers so we exercise only addGoalItem's own logic.
jest.mock(
  '@routine-notes/ui/organisms/QuickGoalCreation/QuickGoalCreation.vue',
  () => ({
    __esModule: true,
    default: {
      name: 'QuickGoalCreation',
      // Declared loosely on purpose: the point of the mount tests below is what
      // the container HANDS the organism, so every attribute has to arrive as a
      // prop rather than falling through to the DOM.
      props: {
        sheet: { type: Boolean, default: false },
        open: { type: Boolean, default: false },
        shell: { type: String, default: 'phone' },
        routineName: { type: String, default: '' },
        routineTime: { type: String, default: '' },
        routineEndTime: { type: String, default: '' },
        earnPoints: { type: Number, default: 0 },
        description: { type: String, default: '' },
        selectedTaskRef: { type: String, default: '' },
        selectedBody: { type: String, default: '' },
        agentState: { type: String, default: 'none' },
        goals: { type: Array, default: () => [] },
        date: { type: String, default: '' },
        period: { type: String, default: '' },
        tasklist: { type: Array, default: () => [] },
        goalDetailsDialog: { type: Boolean, default: false },
        goalItemsRef: { type: Array, default: () => [] },
        relatedTasks: { type: Array, default: () => [] },
        loading: { type: Boolean, default: false },
        buttonLoading: { type: Boolean, default: false },
        loadingAction: { type: String, default: '' },
        redeemCost: { type: Number, default: 0 },
        allowStartWithoutTask: { type: Boolean, default: false },
        openItemCount: { type: Number, default: -1 },
        lockedItem: { type: Object, default: null },
      },
      render(h) { return h('div'); },
    },
  }),
);
jest.mock('../../utils/getDates', () => ({
  periodGoalDates: (period, date) => date,
  stepupMilestonePeriodDate: (period, date) => ({ period, date }),
}));

const Vue = require('vue');

const Container = require('../QuickGoalCreationContainer.vue').default;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeCtx = (over = {}) => ({
  period: 'day',
  date: '24-07-2026',
  goals: [],
  tasklist: [{ id: 't1', name: 'Task 1' }],
  agentState: 'assigned',
  currentGoalRef: '',
  buttonLoading: false,
  loadingAction: '',
  addGoalItemWithTimeout: jest.fn(() => Promise.resolve({
    id: 'g-new', goalRef: 'ref1', taskRef: 't1', body: 'do it',
  })),
  getGoal: jest.fn(() => ({ goalItems: [] })),
  $emit: jest.fn(),
  $notify: jest.fn(),
  $agent: { fireStartEventIfPresent: jest.fn(() => Promise.resolve()) },
  ...over,
});

const payload = () => ({
  body: 'do it', taskRef: 't1', tags: [], goalRef: '',
});

describe('QuickGoalCreationContainer.addGoalItem', () => {
  it('Start Task (explicitAgent:false) creates the goal item but does NOT fire the agent start event', async () => {
    const ctx = makeCtx();
    await Container.methods.addGoalItem.call(ctx, payload(), { explicitAgent: false });
    await flush();

    expect(ctx.addGoalItemWithTimeout).toHaveBeenCalledTimes(1);
    // still starts the task (dashboard ticks it with fireAgent:false)
    expect(ctx.$emit).toHaveBeenCalledWith('start-quick-goal-task', expect.objectContaining({ id: 't1' }));
    // the bug: the start event must not fire on Start Task
    expect(ctx.$agent.fireStartEventIfPresent).not.toHaveBeenCalled();
  });

  it('Start Agent (explicitAgent:true) fires the agent start event with the fresh goal id', async () => {
    const ctx = makeCtx();
    await Container.methods.addGoalItem.call(ctx, payload(), { explicitAgent: true });
    await flush();

    expect(ctx.$agent.fireStartEventIfPresent).toHaveBeenCalledTimes(1);
    expect(ctx.$agent.fireStartEventIfPresent).toHaveBeenCalledWith(expect.objectContaining({
      taskRef: 't1', goalId: 'g-new', goalPeriod: 'day', implicit: false,
    }));
  });

  it('Start Task with no agent assigned also does not fire', async () => {
    const ctx = makeCtx({ agentState: 'none' });
    await Container.methods.addGoalItem.call(ctx, payload(), { explicitAgent: false });
    await flush();
    expect(ctx.$agent.fireStartEventIfPresent).not.toHaveBeenCalled();
  });
});

// D-03 recurrence: the Start sheet's typed-task path adds the goal item and
// fires the start event itself, so the page's zero-point guard never ran.
describe('QuickGoalCreationContainer.startAgent on a 0-point routine', () => {
  const ctxFor = (points) => makeCtx({
    selectedTaskRef: 't1',
    tasklist: [{ id: 't1', name: 'Task 1', points }],
    addGoalItem: jest.fn(() => Promise.resolve()),
  });

  it('refuses with the 0-point notice and writes nothing when a task is typed', async () => {
    const ctx = ctxFor(0);
    await Container.methods.startAgent.call(ctx, { body: 'Check card statement' });

    expect(ctx.$notify).toHaveBeenCalledWith(expect.objectContaining({
      title: 'This routine is worth 0 points', group: 'notify', type: 'warning',
    }));
    expect(ctx.addGoalItem).not.toHaveBeenCalled();
    expect(ctx.$emit).not.toHaveBeenCalledWith('start-agent', expect.anything());
  });

  it('refuses the empty-input path too, before handing off to the page', async () => {
    const ctx = ctxFor(0);
    ctx.goals = [{ period: 'day', date: '24-07-2026', goalItems: [{ taskRef: 't1' }] }];
    await Container.methods.startAgent.call(ctx, { body: '' });
    expect(ctx.$notify).toHaveBeenCalledTimes(1);
    expect(ctx.$emit).not.toHaveBeenCalled();
  });

  it('lets a routine worth any points through', async () => {
    const ctx = ctxFor(1);
    await Container.methods.startAgent.call(ctx, { body: 'Check card statement' });
    expect(ctx.$notify).not.toHaveBeenCalled();
    expect(ctx.addGoalItem).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'Check card statement', taskRef: 't1' }),
      { explicitAgent: true },
    );
  });
});

// ---------------------------------------------------------------------------
// The sheet presentation and the Build Agent handoff.
//
// The organism now presents itself as the chassis ResponsiveSheet when the host
// asks for it, so the container has to carry the presentation props through —
// and `build-agent` has to arrive at the page WITH the routine, because the page
// opens the Agents page's own AgentFormContainer pre-bound to it
// (`openNew(taskRef)`), which is the only way the Build Agent flow is reachable.
// ---------------------------------------------------------------------------
Vue.config.productionTip = false;
Vue.config.devtools = false;
// `agentState` asks the agent store whether this routine already has an agent —
// that answer is what flips the footer button between Build and Start.
Vue.prototype.$agent = { getByTaskRef: () => null };

const mount = (props = {}) => {
  const host = new Vue({
    render: (h) => h(Container, {
      props: {
        period: 'day', date: '', selectedTaskRef: 'r1', ...props,
      },
    }),
  }).$mount();
  const container = host.$children[0];
  const emitted = [];
  ['build-agent', 'start-agent', 'close', 'start-quick-goal-task'].forEach((name) => {
    container.$on(name, (arg) => emitted.push([name, arg]));
  });
  return { container, organism: container.$children[0], emitted };
};

describe('QuickGoalCreationContainer presentation', () => {
  it('hands the organism the sheet props the Routine Focus home passes it', () => {
    const { organism } = mount({
      sheet: true,
      open: true,
      shell: 'desktop',
      routineName: 'Start Work',
      routineTime: '09:00',
      routineEndTime: '12:30',
      earnPoints: 12,
      description: 'Deep work block.',
    });

    expect(organism.sheet).toBe(true);
    expect(organism.open).toBe(true);
    expect(organism.shell).toBe('desktop');
    expect(organism.routineName).toBe('Start Work');
    expect(organism.routineTime).toBe('09:00');
    expect(organism.routineEndTime).toBe('12:30');
    expect(organism.earnPoints).toBe(12);
    expect(organism.description).toBe('Deep work block.');
  });

  // The classic dashboard and QuickTaskModalContainer own their own v-dialog.
  it('defaults to the inline presentation, so the dialog hosts are untouched', () => {
    expect(Container.props.sheet.default).toBe(false);
    expect(mount().organism.sheet).toBe(false);
  });

  /**
   * The item the routine is already locked in on. Pure pass-through — the page
   * resolves it through the SAME `findFirstGoalIdForRoutine` the agent dispatch
   * reads, so the container must not have its own idea of which item that is.
   */
  it('passes the locked-in goal item straight through', () => {
    const lockedItem = { id: 'gi1', body: 'Ship the sheet' };
    expect(mount({ lockedItem }).organism.lockedItem).toBe(lockedItem);
    expect(mount().organism.lockedItem).toBeNull();
  });

  it('bubbles the backdrop dismissal', () => {
    const { organism, emitted } = mount({ sheet: true, open: true });
    organism.$emit('close');
    expect(emitted).toEqual([['close', undefined]]);
  });

  it('pre-binds the routine on Build Agent', () => {
    const { organism, emitted } = mount({ selectedTaskRef: 'r7' });
    organism.$emit('build-agent');
    expect(emitted).toEqual([['build-agent', 'r7']]);
  });
});
