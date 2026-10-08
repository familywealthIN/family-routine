/* eslint-env jest */
/**
 * Contract tests for RoutineChatContainer.
 *
 * The reply comes from a free OpenRouter model server-side, so the container's
 * job is to act on the INTENT that comes back — create checklist items, tick one
 * off, or do nothing — and to attach the ids it created onto the reply bubble so
 * that bubble can render them as live checkboxes.
 *
 * Methods are called directly against a stub context: the Apollo smart query and
 * the presentational thread are not what is under test here.
 */
jest.mock(
  '@routine-notes/ui/organisms/RoutineChatThread/RoutineChatThread.vue',
  () => ({ __esModule: true, default: { name: 'RoutineChatThread', render() {} } }),
);

// The on-demand context run itself is covered in
// composables/__tests__/useDashboardCaching.test.js. Here it is mocked so the
// container's own half — when it asks, how it de-duplicates, and what the card
// shows while it waits — can be driven directly.
jest.mock('../../composables/useDashboardCaching', () => ({
  ensureTagContext: jest.fn(() => Promise.resolve(true)),
}));

const fs = require('fs');
const path = require('path');
const Vue = require('vue');

const { CACHE_KEY_PREFIX } = require('@routine-notes/ui/utils/dashboardCache');
const { ensureTagContext } = require('../../composables/useDashboardCaching');
const Container = require('../RoutineChatContainer.vue').default;
const {
  SEND_ROUTINE_CHAT_MUTATION,
  MARK_ROUTINE_CHAT_ADDED_MUTATION,
  POST_ROUTINE_CHAT_EVENT_MUTATION,
  ROUTINE_INSIGHT_MUTATION,
} = require('../../composables/graphql/chatQueries');

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const ITEMS = [
  {
    id: 'g1', body: 'Ship dashboard PR', isComplete: false, goalRef: 'wg_sw',
  },
  {
    id: 'g2', body: 'Reply to Ana', isComplete: true, goalRef: 'wg_sw',
  },
];

const makeCtx = (sendResult, over = {}) => {
  const ctx = {
    date: '12-09-2026',
    taskRef: 'sw',
    goalItems: ITEMS,
    chatContext: { routineName: 'Start Work' },
    sending: false,
    typing: false,
    mutations: [],
    refetch: jest.fn(),
    $emit: jest.fn(),
    $notify: jest.fn(),
    $goals: {
      addGoalItem: jest.fn((input) => Promise.resolve({ id: `new-${input.body}`, ...input })),
    },
    $apollo: {
      mutate: jest.fn((options) => {
        ctx.mutations.push(options);
        if (options.mutation === SEND_ROUTINE_CHAT_MUTATION) {
          return Promise.resolve({ data: { sendRoutineChat: sendResult } });
        }
        return Promise.resolve({ data: {} });
      }),
    },
    ...over,
  };
  // The real methods call each other (send -> createItems -> attachItems), so
  // bind the whole method bag to this context.
  Object.keys(Container.methods).forEach((name) => {
    if (!ctx[name]) ctx[name] = Container.methods[name].bind(ctx);
  });
  return ctx;
};

const sent = (ctx) => ctx.mutations.find((m) => m.mutation === SEND_ROUTINE_CHAT_MUTATION);
const marked = (ctx) => ctx.mutations.filter((m) => m.mutation === MARK_ROUTINE_CHAT_ADDED_MUTATION);
const events = (ctx) => ctx.mutations.filter((m) => m.mutation === POST_ROUTINE_CHAT_EVENT_MUTATION);

/**
 * Chips are questions the model answers — except one.
 *
 * "Add a task" is an affordance, and sending it as a message asked the model to
 * add a task the user had not named. It obliged: it either invented one or, having
 * read the thread's own convention, created an item whose whole body was a test
 * prefix. It belongs to the capture sheet, where the composer's + button goes.
 */
describe('RoutineChatContainer quick replies', () => {
  it('opens the capture sheet for "Add a task" instead of asking the model', () => {
    const ctx = makeCtx({ intent: 'chat', reply: 'x' });
    Container.methods.onQuickReply.call(ctx, 'Add a task');
    expect(ctx.$emit).toHaveBeenCalledWith('add-task');
    expect(ctx.$apollo.mutate).not.toHaveBeenCalled();
  });

  it('still sends every other chip to the model', async () => {
    const ctx = makeCtx({ intent: 'status', reply: 'Doing well.' });
    await Container.methods.onQuickReply.call(ctx, 'How am I doing?');
    expect(sent(ctx).variables.text).toBe('How am I doing?');
  });

  it('offers the chip, so the handler and the list cannot drift apart', () => {
    // The chips follow the composer and both stay shut until the routine is
    // ticked, so the stub has to be past that gate to see any chip at all.
    const chips = Container.computed.quickReplies.call({
      routine: { ticked: true }, openItems: [], briefDataBlocks: [],
    });
    expect(chips).toContain('Add a task');
  });

  it('offers no chips at all until the routine is ticked', () => {
    const chips = Container.computed.quickReplies.call({
      routine: { ticked: false }, openItems: [{ id: 'g1' }], briefDataBlocks: [{}],
    });
    expect(chips).toEqual([]);
  });
});

describe('RoutineChatContainer.send', () => {
  it('sends the routine snapshot with the message so the model has context', async () => {
    const ctx = makeCtx({ intent: 'chat', reply: 'Noted.', tasks: [] });
    await Container.methods.send.call(ctx, '  hello  ');

    expect(sent(ctx).variables).toEqual({
      date: '12-09-2026',
      taskRef: 'sw',
      text: 'hello',
      context: { routineName: 'Start Work' },
    });
    expect(ctx.typing).toBe(false);
    expect(ctx.sending).toBe(false);
  });

  it('ignores an empty message and a send already in flight', async () => {
    const ctx = makeCtx({ intent: 'chat', reply: 'x' });
    await Container.methods.send.call(ctx, '   ');
    expect(ctx.$apollo.mutate).not.toHaveBeenCalled();

    ctx.sending = true;
    await Container.methods.send.call(ctx, 'hello');
    expect(ctx.$apollo.mutate).not.toHaveBeenCalled();
  });

  it('creates the checklist items an add_tasks intent asks for', async () => {
    const ctx = makeCtx({
      intent: 'add_tasks',
      reply: 'Added it.',
      tasks: ['Review analytics events'],
      replyMessage: { id: 'reply-1' },
    });
    await Container.methods.send.call(ctx, 'add review analytics events');
    await flush();

    expect(ctx.$goals.addGoalItem).toHaveBeenCalledTimes(1);
    expect(ctx.$goals.addGoalItem).toHaveBeenCalledWith(expect.objectContaining({
      body: 'Review analytics events',
      period: 'day',
      date: '12-09-2026',
      taskRef: 'sw',
      isComplete: false,
    }));
    /*
     * An item the chat creates must roll up the same way one created through AI
     * Search does — and this used to assert `goalRef: 'wg_sw'`, copied off a
     * sibling item, which is what BROKE it.
     *
     * `addGoalItem` refuses `goalRef` without `isMilestone: true`, and the chat
     * always sent `false`. So on every routine whose checklist was already linked
     * to a week goal the create threw, the throw was swallowed, and the reply
     * still said "Added". `resolveDayGoalLink` does the linking server-side when
     * the ref is OMITTED — and sets the flag correctly — so not sending one is
     * both the fix and the removal of a duplicated rule.
     */
    const created = ctx.$goals.addGoalItem.mock.calls[0][0];
    expect(created).not.toHaveProperty('goalRef');
    expect(created.isMilestone).toBe(false);
    // The ids land back on the reply bubble so it can show live checkboxes.
    expect(marked(ctx)[0].variables).toEqual({
      id: 'reply-1',
      items: ['new-Review analytics events'],
    });
  });

  /**
   * The reply bubble has already told the user the task was added. A create that
   * fails without saying so leaves the thread asserting something the checklist
   * contradicts — which is precisely how the goalRef defect stayed invisible for
   * a release: a console line and nothing else.
   */
  it('says so when the create fails, instead of only logging it', async () => {
    const ctx = makeCtx({
      intent: 'add_tasks',
      reply: 'Added it.',
      tasks: ['Review analytics events'],
      replyMessage: { id: 'reply-1' },
    });
    ctx.$goals.addGoalItem = jest.fn(() => Promise.reject(new Error('refused')));
    await Container.methods.send.call(ctx, 'add it');
    await flush();

    expect(ctx.$notify).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      title: "Couldn't add that task",
    }));
    // Nothing to attach and nothing to log when nothing was created.
    expect(marked(ctx)).toHaveLength(0);
    expect(events(ctx)).toHaveLength(0);
  });

  it('reports a partial add by its real numbers', async () => {
    const ctx = makeCtx({
      intent: 'add_tasks', reply: 'Added.', tasks: ['a', 'b', 'c'], replyMessage: { id: 'r' },
    });
    let n = 0;
    ctx.$goals.addGoalItem = jest.fn((input) => {
      n += 1;
      return n === 2 ? Promise.reject(new Error('refused'))
        : Promise.resolve({ id: `new-${input.body}` });
    });
    await Container.methods.send.call(ctx, 'add three');
    await flush();

    expect(ctx.$notify).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Only 2 of 3 tasks were added',
    }));
  });

  /**
   * The thread is a record of the day, and every other add path posts a pill
   * (`addProposals`, `addBriefStep`). A chat-driven add posted none, so a
   * successful add and a failed one left the same trace in the event stream.
   */
  it('logs a chat-driven add as an event pill', async () => {
    const ctx = makeCtx({
      intent: 'add_tasks', reply: 'Added.', tasks: ['Review analytics events'], replyMessage: { id: 'r' },
    });
    await Container.methods.send.call(ctx, 'add it');
    await flush();

    expect(events(ctx)[0].variables).toEqual(expect.objectContaining({
      taskRef: 'sw',
      text: '1 task added to the checklist',
      items: ['new-Review analytics events'],
    }));
  });

  /**
   * A free-tier reply can take tens of seconds and the deck is swipeable, so the
   * focused routine can change while the model is thinking. Reading `this.taskRef`
   * after the await filed the task against whichever routine was focused when the
   * answer landed — the message on one thread, the task on another.
   */
  it('files the task against the routine that was asked, not the one now focused', async () => {
    const ctx = makeCtx({
      intent: 'add_tasks', reply: 'Added.', tasks: ['Review analytics events'], replyMessage: { id: 'r' },
    });
    // The user swipes to another routine while the model is answering: the
    // mutation resolves only AFTER this context has moved on.
    const original = ctx.$apollo.mutate;
    ctx.$apollo.mutate = jest.fn((options) => {
      if (options.mutation === SEND_ROUTINE_CHAT_MUTATION) {
        ctx.taskRef = 'jogging';
        ctx.date = '13-09-2026';
      }
      return original(options);
    });
    await Container.methods.send.call(ctx, 'add it');
    await flush();

    expect(ctx.$goals.addGoalItem).toHaveBeenCalledWith(expect.objectContaining({
      taskRef: 'sw', date: '12-09-2026',
    }));
    // The message was asked on 'sw', so its pill belongs on 'sw' too.
    expect(events(ctx)[0].variables.taskRef).toBe('sw');
    // Proof the context really did move — otherwise this test proves nothing.
    expect(ctx.taskRef).toBe('jogging');
  });

  /**
   * The brief's Add pill has always refused a past day — "nothing can be added to
   * a past checklist, so an Add pill there is a lie" — but `send` did not, so
   * chatting while looking at yesterday wrote real items onto yesterday.
   */
  it('refuses to create on a past day, and says why', async () => {
    const ctx = makeCtx({
      intent: 'add_tasks', reply: 'Added.', tasks: ['Review analytics events'], replyMessage: { id: 'r' },
    }, { isPastDay: true });
    await Container.methods.send.call(ctx, 'add it');
    await flush();

    expect(ctx.$goals.addGoalItem).not.toHaveBeenCalled();
    expect(ctx.$notify).toHaveBeenCalledWith(expect.objectContaining({
      title: 'That day is closed',
    }));
    // The message itself still goes through — a past thread is readable and
    // answerable, it just cannot be written to.
    expect(sent(ctx)).toBeTruthy();
  });

  it('does not create anything for a break_down intent — those are proposals', async () => {
    const ctx = makeCtx({
      intent: 'break_down',
      reply: 'Three steps:',
      tasks: ['a', 'b', 'c'],
      replyMessage: { id: 'reply-2' },
    });
    await Container.methods.send.call(ctx, 'break it down');
    await flush();

    expect(ctx.$goals.addGoalItem).not.toHaveBeenCalled();
    expect(marked(ctx)).toHaveLength(0);
  });

  it('completes the matched item on a complete_task intent', async () => {
    const ctx = makeCtx({
      intent: 'complete_task',
      reply: 'Marked it done.',
      completeItemId: 'g1',
      replyMessage: { id: 'reply-3' },
    });
    await Container.methods.send.call(ctx, 'done with the PR');
    await flush();

    expect(ctx.$emit).toHaveBeenCalledWith('complete-item', ITEMS[0]);
    expect(marked(ctx)[0].variables).toEqual({ id: 'reply-3', items: ['g1'] });
  });

  // The server already drops ids that are not open items, but an id for an item
  // this client has since dropped must not emit a completion for nothing.
  it('ignores a completeItemId this routine does not hold', async () => {
    const ctx = makeCtx({
      intent: 'complete_task', reply: 'ok', completeItemId: 'nope', replyMessage: { id: 'r' },
    });
    await Container.methods.send.call(ctx, 'done with something');
    await flush();

    expect(ctx.$emit).not.toHaveBeenCalledWith('complete-item', expect.anything());
    expect(marked(ctx)).toHaveLength(0);
  });

  it('surfaces a model outage to the page but still keeps the turn', async () => {
    const ctx = makeCtx({
      intent: 'chat', reply: "I can't reach the chat model right now", error: 'all models failed',
    });
    await Container.methods.send.call(ctx, 'hello');

    expect(ctx.$emit).toHaveBeenCalledWith('model-error', 'all models failed');
    expect(ctx.refetch).toHaveBeenCalled();
  });

  it('tells the user when the mutation itself fails, and clears typing', async () => {
    const ctx = makeCtx(null, {
      $apollo: { mutate: jest.fn(() => Promise.reject(new Error('offline'))) },
    });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    await Container.methods.send.call(ctx, 'hello');

    expect(ctx.$notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    expect(ctx.typing).toBe(false);
    expect(ctx.sending).toBe(false);
    consoleError.mockRestore();
  });
});

describe('RoutineChatContainer.addProposals', () => {
  it('turns the three proposals into items, marks the bubble and logs an event', async () => {
    const ctx = makeCtx({});
    await Container.methods.addProposals.call(ctx, {
      id: 'reply-2',
      proposals: ['Write the PR description', 'Request review', 'Get CI green'],
    });
    await flush();

    expect(ctx.$goals.addGoalItem).toHaveBeenCalledTimes(3);
    expect(marked(ctx)[0].variables.id).toBe('reply-2');
    expect(marked(ctx)[0].variables.items).toHaveLength(3);
    expect(events(ctx)[0].variables).toEqual(expect.objectContaining({
      text: '3 tasks added to the checklist',
      tone: 'blue',
      icon: 'playlist_add_check',
    }));
  });

  it('does nothing for a bubble with no proposals', async () => {
    const ctx = makeCtx({});
    await Container.methods.addProposals.call(ctx, { id: 'x', proposals: [] });
    expect(ctx.$goals.addGoalItem).not.toHaveBeenCalled();
  });
});

describe('RoutineChatContainer.postEvent', () => {
  it('writes the event against the routine it names', async () => {
    const ctx = makeCtx({});
    await Container.methods.postEvent.call(ctx, {
      text: 'Routine ticked · G +12', tone: 'green', icon: 'check_circle',
    });

    expect(events(ctx)[0].variables).toEqual({
      date: '12-09-2026',
      taskRef: 'sw',
      text: 'Routine ticked · G +12',
      tone: 'green',
      icon: 'check_circle',
      items: [],
    });
    expect(ctx.refetch).toHaveBeenCalled();
  });

  // Ticking a routine that is NOT the focused one still logs into ITS thread;
  // re-reading the visible thread would be pointless work.
  it('does not refetch the visible thread for another routine’s event', async () => {
    const ctx = makeCtx({});
    await Container.methods.postEvent.call(ctx, { text: 'Routine ticked', taskRef: 'wo' });

    expect(events(ctx)[0].variables.taskRef).toBe('wo');
    expect(ctx.refetch).not.toHaveBeenCalled();
  });

  it('is a no-op without a routine or without text', async () => {
    const ctx = makeCtx({});
    await Container.methods.postEvent.call(ctx, { text: '' });
    await Container.methods.postEvent.call({ ...ctx, taskRef: '' }, { text: 'hi' });
    expect(ctx.mutations).toHaveLength(0);
  });
});

// =====================================================================
// "Before you start"
// =====================================================================
/**
 * The brief is pinned as the thread's first message and read out of the
 * `DASHBOARD_CACHE:<tag>` entries `useDashboardCaching` already fills in. The
 * container is the only layer allowed to read that cache; the organism takes
 * finished blocks.
 *
 * These exercise the computeds too, so they mount a real Vue instance with the
 * Apollo smart query stubbed out rather than calling methods on a bag.
 */
// Ticked: the chat (composer and chips alike) only opens once the routine is
// checked off, so an unticked fixture would make every chip test assert [].
const ROUTINE = {
  id: 'wo',
  name: 'Workout',
  time: '07:00',
  ticked: true,
  tags: ['area:health:fitness', 'project:dashboard', 'context:home'],
};

const cache = (tag, entry) => localStorage.setItem(
  CACHE_KEY_PREFIX + tag,
  JSON.stringify({ timestamp: Date.now(), ...entry }),
);

const FITNESS = {
  description: 'About 3 km every lunch break toward Walk 1,000 km.',
  nextSteps: 'Try the river loop\n\nLog shoe mileage',
  activity: [
    { date: 'Fri', text: '3.1 km', done: true },
    { date: 'Thu', text: 'Missed · meeting ran over', done: false },
  ],
};

const mountContainer = (props = {}, { email = 'user@example.com' } = {}) => {
  const mutations = [];
  const created = [];
  const notified = [];
  // The lazy context path checks `$root.$data.email`, and an instance with no
  // parent is its own `$root` — so give it one that carries the session.
  const root = new Vue({ data: { email } });
  const vm = new Vue({
    ...Container,
    parent: root,
    // The smart query is not under test; the brief reads localStorage.
    apollo: {},
    propsData: {
      date: '12-09-2026', routine: ROUTINE, goalItems: [], ...props,
    },
    components: { RoutineChatThread: { name: 'RoutineChatThread', render() {} } },
  });
  vm.$apollo = {
    mutate: (options) => {
      mutations.push(options);
      return Promise.resolve({ data: {} });
    },
    queries: {},
  };
  vm.$goals = {
    addGoalItem: (input) => {
      created.push(input);
      return Promise.resolve({ id: `new-${created.length}`, ...input });
    },
  };
  vm.$notify = (options) => notified.push(options);
  vm.$mount();
  return {
    vm,
    mutations,
    created,
    notified,
    logged: () => mutations.filter((m) => m.mutation === POST_ROUTINE_CHAT_EVENT_MUTATION),
    sends: () => mutations.filter((m) => m.mutation === SEND_ROUTINE_CHAT_MUTATION),
    brief: () => vm.displayMessages.find((m) => m.kind === 'brief') || null,
  };
};

describe('RoutineChatContainer — the brief card', () => {
  beforeEach(() => {
    localStorage.clear();
    ensureTagContext.mockReset();
    ensureTagContext.mockImplementation(() => Promise.resolve(true));
    cache('area:health:fitness', FITNESS);
  });

  it('pins the brief first, collapsed, one block per area/project tag only', () => {
    cache('project:dashboard', { description: 'Ship v2 by end of Q4.', nextSteps: 'Ship it', activity: [] });
    cache('context:home', { description: 'Not an area.', nextSteps: 'Ignore me', activity: [] });
    const { vm } = mountContainer();

    const [first] = vm.displayMessages;
    expect(first.kind).toBe('brief');
    // Minimised by default — the owner wants the thread to lead with the chat.
    expect(first.open).toBe(false);
    expect(first.blocks.map((b) => b.tag)).toEqual(['area:health:fitness', 'project:dashboard']);
    expect(first.subline).toBe('Health › Fitness · Dashboard · 3 next steps');
    // Nothing follows it: the synthesised greeting is gone, so an untouched
    // thread opens with the brief alone.
    expect(vm.displayMessages).toHaveLength(1);
  });

  it('does not render on a past day — nothing can be added to one', () => {
    const { vm } = mountContainer({ isPastDay: true });
    expect(vm.briefBlocks).toEqual([]);
    expect(vm.displayMessages.some((m) => m.kind === 'brief')).toBe(false);
    expect(vm.quickReplies).not.toContain('Plan from next steps');
  });

  // Nothing cached and nothing on the way — the only state in which the card
  // is genuinely absent. (With a run in flight it renders its heads; see the
  // lazy-context suite below.)
  it('is absent when a tag has nothing cached and no run to wait for', async () => {
    localStorage.clear();
    ensureTagContext.mockImplementation(() => Promise.resolve(false));
    const { vm } = mountContainer();
    await flush();
    await Vue.nextTick();

    expect(vm.displayMessages.some((m) => m.kind === 'brief')).toBe(false);
  });

  it('opens by hand, and collapses again when the composer takes focus', () => {
    const { vm } = mountContainer();
    expect(vm.briefMessage.open).toBe(false);
    vm.toggleBrief();
    expect(vm.briefMessage.open).toBe(true);
    vm.collapseBrief();
    expect(vm.briefMessage.open).toBe(false);
    // A second focus is a no-op, not a re-open.
    vm.collapseBrief();
    expect(vm.briefMessage.open).toBe(false);
  });

  it('appends an added step verbatim and logs a blue chat event', async () => {
    const { vm, created, logged } = mountContainer();
    await vm.addBriefStep({ tag: 'area:health:fitness', text: 'Try the river loop' });

    expect(created).toHaveLength(1);
    expect(created[0]).toEqual(expect.objectContaining({
      body: 'Try the river loop', period: 'day', date: '12-09-2026', taskRef: 'wo',
    }));
    expect(logged()[0].variables).toEqual(expect.objectContaining({
      text: 'Added “Try the river loop” to the checklist',
      tone: 'blue',
      icon: 'playlist_add_check',
    }));
    // The pill flips.
    expect(vm.briefBlocks[0].steps[0].added).toBe(true);
  });

  it('cannot add the same step twice, however many times it is asked', async () => {
    const { vm, created } = mountContainer();
    await vm.addBriefStep({ tag: 'area:health:fitness', text: 'Try the river loop' });
    await vm.addBriefStep({ tag: 'area:health:fitness', text: 'Try the river loop' });
    expect(created).toHaveLength(1);
  });

  // The checklist is the authoritative half of "already added": it survives a
  // reload, and catches a step added through AI Search instead of the pill.
  it('reads a step as added when the checklist already holds that exact body', () => {
    const { vm } = mountContainer({
      goalItems: [{ id: 'g9', body: 'Try the river loop', isComplete: false }],
    });
    expect(vm.briefBlocks[0].steps[0].added).toBe(true);
    expect(vm.isStepAdded('Try the river loop')).toBe(true);
    expect(vm.isStepAdded('Log shoe mileage')).toBe(false);
  });

  it('never adds to a past day', async () => {
    const { vm, created } = mountContainer({ isPastDay: true });
    await vm.addBriefStep({ tag: 'area:health:fitness', text: 'Try the river loop' });
    expect(created).toHaveLength(0);
  });
});

describe('RoutineChatContainer — the two brief quick replies', () => {
  beforeEach(() => {
    localStorage.clear();
    ensureTagContext.mockReset();
    ensureTagContext.mockImplementation(() => Promise.resolve(true));
    cache('area:health:fitness', FITNESS);
  });

  it('offers both chips only while there is a brief to read', () => {
    const { vm } = mountContainer();
    expect(vm.quickReplies).toEqual(expect.arrayContaining([
      'What did I do last time?', 'Plan from next steps',
    ]));
  });

  // The composer is disabled until the routine is checked off; the chips send
  // chat turns too, so leaving them live would just route around it.
  it('offers no chips at all until the routine is checked off', () => {
    const { vm } = mountContainer({ routine: { ...ROUTINE, ticked: false } });
    expect(vm.quickReplies).toEqual([]);
  });

  it('answers "What did I do last time?" from the cache, not the model', async () => {
    const { vm, sends } = mountContainer();
    await vm.send('What did I do last time?');

    expect(sends()).toHaveLength(0);
    const [question, answer] = vm.localMessages;
    expect(question.from).toBe('me');
    expect(question.text).toBe('What did I do last time?');
    expect(answer.text).toBe(
      'Last Fri: 3.1 km. Thu: Missed · meeting ran over.'
      + ' Next up on Health › Fitness: “Try the river loop”.',
    );
    expect(answer.proposals).toEqual([]);
  });

  it('answers "Plan from next steps" with the unadded steps as proposals', async () => {
    const { vm, sends } = mountContainer();
    await vm.send('Plan from next steps');

    expect(sends()).toHaveLength(0);
    const answer = vm.localMessages[1];
    expect(answer.text).toBe('From Health › Fitness:');
    expect(answer.proposals).toEqual(['Try the river loop', 'Log shoe mileage']);
  });

  it('accepting the plan adds every step and flips its pills', async () => {
    const {
      vm, created, logged, mutations,
    } = mountContainer();
    await vm.send('Plan from next steps');
    await vm.addProposals(vm.localMessages[1]);

    expect(created.map((i) => i.body)).toEqual(['Try the river loop', 'Log shoe mileage']);
    // A client-only bubble has no persisted row to mark — it flips in place.
    expect(mutations.filter((m) => m.mutation === MARK_ROUTINE_CHAT_ADDED_MUTATION)).toHaveLength(0);
    expect(vm.localMessages[1].added).toBe(true);
    expect(vm.briefBlocks[0].steps.every((s) => s.added)).toBe(true);
    expect(logged()[0].variables.text).toBe('2 tasks added to the checklist');
  });

  it('says so when every step is already on the checklist', async () => {
    const { vm } = mountContainer({
      goalItems: [
        { id: 'g1', body: 'Try the river loop', isComplete: false },
        { id: 'g2', body: 'Log shoe mileage', isComplete: true },
      ],
    });
    await vm.send('Plan from next steps');
    expect(vm.localMessages[1].text).toBe('All next steps are already on the checklist.');
    expect(vm.localMessages[1].proposals).toEqual([]);
  });

  it('sends anything else to the model as before', async () => {
    const { vm, sends } = mountContainer();
    await vm.send('Break it down');
    expect(sends()).toHaveLength(1);
    expect(vm.localMessages).toHaveLength(0);
  });

  it('drops a local turn when the thread switches routine', async () => {
    const { vm } = mountContainer();
    await vm.send('What did I do last time?');
    expect(vm.localMessages).toHaveLength(2);

    vm.routine = { ...ROUTINE, id: 'mp' };
    await Vue.nextTick();
    expect(vm.localMessages).toHaveLength(0);
  });
});

// =====================================================================
// Lazy area/project context
// =====================================================================
/**
 * The daily sweep (`mixins/dashboardContextMixin`) only builds context for
 * routines the user opted into AI Search, so on its own the card is missing for
 * most tagged routines — narrower than the Areas/Projects pages it replaced
 * (docs/redesign/STATUS.md gap 16). The fix is not a wider sweep, which would
 * pay for tags nobody opens, but a run bought the moment a routine carrying the
 * tag becomes the focused one: on demand, once, same store, same 24h TTL.
 *
 * What the card shows while that is out is the design question. There is no
 * loading state drawn, so it renders the half that needs no model call at all —
 * the kind label and the breadcrumb, both read off the tag string — and fills
 * the body in underneath. No spinner, no scroll move, and no block left behind
 * for a tag that turns out to have nothing.
 */
describe('RoutineChatContainer — lazy area/project context', () => {
  /** Resolves the in-flight run(s), writing a cache entry first where given. */
  let settle;

  const deferContext = (entryFor = () => null) => {
    const waiting = [];
    ensureTagContext.mockImplementation((_vm, tag) => new Promise((resolve) => {
      waiting.push(() => {
        const entry = entryFor(tag);
        if (entry) cache(tag, entry);
        resolve(!!entry);
      });
    }));
    settle = () => waiting.splice(0).forEach((done) => done());
  };

  beforeEach(() => {
    localStorage.clear();
    ensureTagContext.mockReset();
    ensureTagContext.mockImplementation(() => Promise.resolve(true));
    settle = () => {};
  });

  const asked = () => ensureTagContext.mock.calls.map((call) => call[1]);

  it('asks for every area/project tag the focused routine carries', () => {
    mountContainer();
    expect(asked()).toEqual(['area:health:fitness', 'project:dashboard']);
    // `context:home` is neither an area nor a project, so it is never asked for.
    expect(asked()).not.toContain('context:home');
  });

  // This is the gap being closed: the routine is NOT opted into AI Search, so
  // the daily sweep would never have reached its tags.
  it('covers a routine the daily sweep never reached', async () => {
    deferContext((tag) => (tag === 'area:health:fitness' ? FITNESS : null));
    const { brief } = mountContainer();

    settle();
    await flush();
    await Vue.nextTick();

    const { blocks } = brief();
    expect(blocks).toHaveLength(1);
    expect(blocks[0].tag).toBe('area:health:fitness');
    expect(blocks[0].description).toBe(FITNESS.description);
    expect(blocks[0].steps.map((s) => s.text)).toEqual(['Try the river loop', 'Log shoe mileage']);
    expect(blocks[0].activity).toHaveLength(2);
  });

  it('shows the kind and breadcrumb before the body arrives, then fills it in', async () => {
    deferContext((tag) => (tag === 'area:health:fitness' ? FITNESS : null));
    const { vm, brief } = mountContainer();

    // Waiting: the heads are already true — they come off the tag, not the model.
    const waiting = brief();
    expect(waiting.open).toBe(false);
    expect(waiting.blocks.map((b) => [b.kind, b.breadcrumb, b.pending])).toEqual([
      ['AREA', 'Health › Fitness', true],
      ['PROJECT', 'Dashboard', true],
    ]);
    expect(waiting.blocks.every((b) => !b.description && !b.steps.length
      && !b.activity.length && !b.stat)).toBe(true);
    // No count claimed while none of them is known, and no quick reply offering
    // to read data that is not there.
    expect(waiting.subline).toBe('Health › Fitness · Dashboard');
    expect(vm.quickReplies).not.toContain('What did I do last time?');

    settle();
    await flush();
    await Vue.nextTick();

    const filled = brief();
    expect(filled.blocks.map((b) => [b.breadcrumb, b.pending])).toEqual([
      ['Health › Fitness', false],
    ]);
    expect(filled.blocks[0].stat).toBe('1/2 recent');
    expect(filled.subline).toBe('Health › Fitness · 2 next steps');
    expect(vm.quickReplies).toContain('What did I do last time?');
  });

  // The brief is the thread's FIRST message; growing it must not drag the
  // conversation out from under the user.
  it('does not move the thread when the body arrives', async () => {
    deferContext(() => FITNESS);
    const { vm } = mountContainer();
    const scrolled = jest.fn();
    vm.scrollIntoView = scrolled;

    settle();
    await flush();
    await Vue.nextTick();

    expect(scrolled).not.toHaveBeenCalled();
  });

  it('asks once for a tag two routines share', async () => {
    const { vm } = mountContainer({ routine: { ...ROUTINE, tags: ['area:health:fitness'] } });
    await flush();
    expect(asked()).toEqual(['area:health:fitness']);

    // A second routine under the same area becomes the focused one.
    vm.routine = { id: 'mp', name: 'Morning Pages', tags: ['area:health:fitness'] };
    await Vue.nextTick();
    await flush();

    expect(asked()).toEqual(['area:health:fitness']);
  });

  it('asks once per tag however often the same routine is refocused', async () => {
    deferContext(() => null);
    const { vm } = mountContainer();
    vm.routine = { ...ROUTINE };
    await Vue.nextTick();
    vm.routine = { ...ROUTINE };
    await Vue.nextTick();

    expect(asked()).toEqual(['area:health:fitness', 'project:dashboard']);
  });

  it('does not ask for a tag that is still inside its TTL', () => {
    cache('area:health:fitness', FITNESS);
    mountContainer();
    expect(asked()).toEqual(['project:dashboard']);
  });

  it('asks for nothing on a past day, where the brief does not render', () => {
    mountContainer({ isPastDay: true });
    expect(asked()).toEqual([]);
  });

  it('asks for nothing before the user is signed in', () => {
    mountContainer({}, { email: '' });
    expect(asked()).toEqual([]);
  });

  // "Exactly as it is today": no card, no error bubble, no toast — and the
  // conversation around it still works.
  it('leaves the thread alone when the run comes back with nothing', async () => {
    deferContext(() => null);
    const { vm, mutations, notified } = mountContainer();
    settle();
    await flush();
    await Vue.nextTick();

    expect(vm.briefBlocks).toEqual([]);
    expect(vm.displayMessages.some((m) => m.kind === 'brief')).toBe(false);
    expect(vm.localMessages).toEqual([]);
    expect(mutations).toHaveLength(0);
    expect(notified).toHaveLength(0);
    // Nothing was synthesised in its place either — no brief, no greeting.
    expect(vm.displayMessages).toEqual([]);

    await vm.send('Break it down');
    expect(mutations.filter((m) => m.mutation === SEND_ROUTINE_CHAT_MUTATION)).toHaveLength(1);
  });

  it('leaves the thread alone when the run rejects outright', async () => {
    ensureTagContext.mockImplementation(() => Promise.reject(new Error('offline')));
    const { vm, mutations, notified } = mountContainer();
    await flush();
    await Vue.nextTick();

    expect(vm.displayMessages.some((m) => m.kind === 'brief')).toBe(false);
    expect(mutations).toHaveLength(0);
    expect(notified).toHaveLength(0);
  });

  it('does not try a failed tag again on the next focus', async () => {
    ensureTagContext.mockImplementation(() => Promise.resolve(false));
    const { vm } = mountContainer({ routine: { ...ROUTINE, tags: ['area:health:fitness'] } });
    await flush();

    vm.routine = { id: 'mp', name: 'Morning Pages', tags: ['area:health:fitness'] };
    await Vue.nextTick();
    await flush();

    expect(asked()).toEqual(['area:health:fitness']);
  });

  // A lazily built entry reaches the card through exactly the same read path a
  // swept one does, so the length guards that keep a step appendable to the
  // checklist verbatim still apply.
  it('runs a lazily built entry through the same length normalisers', async () => {
    deferContext((tag) => (tag === 'area:health:fitness' ? {
      description: '## Summary: **Product + engineering. Mornings for the hardest thing.**',
      nextSteps: '1) "Clear inbox to zero".\n\n'
        + 'You should probably consider reviewing the dashboard pull request comments today\n\n'
        + '- Log shoe mileage;',
      activity: [],
    } : null));
    const { brief } = mountContainer();

    settle();
    await flush();
    await Vue.nextTick();

    const [block] = brief().blocks;
    expect(block.description).toBe('Product + engineering. Mornings for the hardest thing.');
    // The sentence is refused outright — it would have landed on a checklist.
    expect(block.steps.map((s) => s.text)).toEqual(['Clear inbox to zero', 'Log shoe mileage']);
  });

  it('adds a lazily built step to the checklist verbatim', async () => {
    deferContext((tag) => (tag === 'area:health:fitness' ? FITNESS : null));
    const { vm, created, logged } = mountContainer();
    settle();
    await flush();
    await Vue.nextTick();

    await vm.addBriefStep({ tag: 'area:health:fitness', text: 'Try the river loop' });

    expect(created.map((i) => i.body)).toEqual(['Try the river loop']);
    expect(logged()[0].variables.text).toBe('Added “Try the river loop” to the checklist');
  });

  // A pending block offers no steps at all, so the pill that would add one is
  // never rendered (see RoutineBriefCard's own test) and the quick replies that
  // read step data are withheld until it settles.
  it('offers no steps while a block is still waiting', () => {
    deferContext(() => FITNESS);
    const { vm } = mountContainer();

    expect(vm.briefBlocks.every((block) => block.steps.length === 0)).toBe(true);
    expect(vm.briefDataBlocks).toEqual([]);
    expect(vm.quickReplies).not.toContain('Plan from next steps');
  });
});

// On the phone the thread shares the card's scroller with the checklist, so
// switching routine used to pin it to the chat bottom and hide the checklist.
describe('RoutineChatContainer.onMessagesLoaded — scroll on load vs new message', () => {
  const load = (ctx, messages) => Container.methods.onMessagesLoaded.call(ctx, messages);
  const makeScrollCtx = (sharedScroller) => ({
    date: '12-09-2026',
    taskRef: 'sw',
    sharedScroller,
    loadedThread: { key: '', count: 0 },
    userScrollIntent: false,
    scrollIntoView: jest.fn(),
  });
  const msgs = (n) => Array.from({ length: n }, (_, i) => ({ id: `m${i}` }));

  it('opens a switched-to thread at the top when it shares the checklist scroller', () => {
    const ctx = makeScrollCtx(true);
    load(ctx, msgs(3));
    expect(ctx.scrollIntoView).toHaveBeenLastCalledWith('top');

    ctx.taskRef = 'lw';
    load(ctx, msgs(5));
    expect(ctx.scrollIntoView).toHaveBeenLastCalledWith('top');
    expect(ctx.scrollIntoView).not.toHaveBeenCalledWith('bottom');
  });

  it('opens a switched-to thread at its latest message in the chat pane', () => {
    const ctx = makeScrollCtx(false);
    load(ctx, msgs(3));
    expect(ctx.scrollIntoView).toHaveBeenLastCalledWith('bottom');
  });

  it('ignores a same-size re-read of the same thread', () => {
    const ctx = makeScrollCtx(true);
    load(ctx, msgs(3));
    ctx.scrollIntoView.mockClear();

    load(ctx, msgs(3));
    expect(ctx.scrollIntoView).not.toHaveBeenCalled();
  });

  // The phone shares one scroller between the checklist and the thread. Ticking a
  // task posts a system event, which is a new message — following it scrolled the
  // checklist the user was working through off the screen. Only a chat action the
  // user took may move a shared scroller.
  it('does NOT follow a new message in a shared scroller the user did not cause', () => {
    const ctx = makeScrollCtx(true);
    load(ctx, msgs(3));
    ctx.scrollIntoView.mockClear();

    load(ctx, msgs(4));
    expect(ctx.scrollIntoView).not.toHaveBeenCalled();
  });

  it('follows a new message in a shared scroller when the user was talking', () => {
    const ctx = makeScrollCtx(true);
    load(ctx, msgs(3));
    ctx.scrollIntoView.mockClear();

    ctx.userScrollIntent = true;
    load(ctx, msgs(4));
    expect(ctx.scrollIntoView).toHaveBeenCalledWith();
    // Consumed, so the NEXT event-driven load does not inherit it.
    expect(ctx.userScrollIntent).toBe(false);
    ctx.scrollIntoView.mockClear();
    load(ctx, msgs(5));
    expect(ctx.scrollIntoView).not.toHaveBeenCalled();
  });

  // The chat pane has its own scroller, so nothing of the checklist is lost.
  it('still follows a new message in its own scroller', () => {
    const ctx = makeScrollCtx(false);
    load(ctx, msgs(3));
    ctx.scrollIntoView.mockClear();

    load(ctx, msgs(4));
    expect(ctx.scrollIntoView).toHaveBeenCalledWith();
  });
});

// The year-goal host asks the shared thread to show accepted proposals only as
// their checkboxes. Home deliberately keeps its existing rows + "added" list.
describe('RoutineChatContainer — Home keeps its accepted-proposal rendering', () => {
  it('does not opt into replace-added-proposals', () => {
    const source = fs.readFileSync(path.join(__dirname, '../RoutineChatContainer.vue'), 'utf8');
    expect(source).not.toContain('replace-added-proposals');
  });
});

// After the tick the routine answers "how do I improve this?" once, from the
// server's history plus the area/project context the brief caches.
describe('RoutineChatContainer routine insight', () => {
  const insights = (ctx) => ctx.mutations.filter((m) => m.mutation === ROUTINE_INSIGHT_MUTATION);
  const tick = Container.watch.tickState;

  it('asks once when the focused routine turns ticked', async () => {
    const ctx = makeCtx(null, { routineName: 'Start Work', contextTags: [], isPastDay: false });
    tick.call(ctx, { ref: 'sw', ticked: true }, { ref: 'sw', ticked: false });
    await flush();
    expect(insights(ctx)).toHaveLength(1);
    expect(insights(ctx)[0].variables).toMatchObject({
      date: '12-09-2026', taskRef: 'sw', routineName: 'Start Work', brief: '',
    });
    expect(insights(ctx)[0].variables.tickedAt).toMatch(/^\d{2}:\d{2}$/);
    expect(ctx.refetch).toHaveBeenCalled();
  });

  it('does not ask when swiping onto a routine that was already ticked', async () => {
    const ctx = makeCtx(null, { routineName: 'Start Work', contextTags: [], isPastDay: false });
    tick.call(ctx, { ref: 'sw', ticked: true }, { ref: 'other', ticked: false });
    await flush();
    expect(insights(ctx)).toHaveLength(0);
  });

  it('does not ask on a past day', async () => {
    const ctx = makeCtx(null, { routineName: 'Start Work', contextTags: [], isPastDay: true });
    tick.call(ctx, { ref: 'sw', ticked: true }, { ref: 'sw', ticked: false });
    await flush();
    expect(insights(ctx)).toHaveLength(0);
  });

  it('sends the tick on the user clock with the minutes left in the window', () => {
    const ctx = makeCtx(null, { endTime: '21:00' });
    expect(ctx.tickMoment(new Date(2026, 9, 7, 20, 29))).toEqual({
      tickedAt: '20:29', windowEnd: '21:00', minutesLeft: 31,
    });
    expect(ctx.tickMoment(new Date(2026, 9, 7, 21, 40)).minutesLeft).toBe(0);
    expect(makeCtx(null, { endTime: '00:30' }).tickMoment(new Date(2026, 9, 7, 23, 50)).minutesLeft).toBe(40);
    expect(makeCtx(null, { endTime: '' }).tickMoment(new Date(2026, 9, 7, 9, 5)))
      .toEqual({ tickedAt: '09:05', windowEnd: null, minutesLeft: null });
  });

  it('sends the cached area description and next steps as the brief', () => {
    localStorage.setItem(`${CACHE_KEY_PREFIX}area:work`, JSON.stringify({
      description: 'Ship the beta.', nextSteps: '- Fix sync', activity: [], timestamp: Date.now(),
    }));
    const ctx = makeCtx(null, { contextTags: ['area:work'] });
    expect(ctx.insightBrief()).toBe('[area:work]\nShip the beta.\nNext steps:\n- Fix sync');
    localStorage.clear();
  });
});
