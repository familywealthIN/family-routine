/* eslint-env jest */
/**
 * PriorityTime orchestration, exercised against a minimal vm-like context (no
 * mount), matching the page test convention (see routineFocusPage.test.js).
 *
 * What only the page can get wrong: which shell it picks, what the header says,
 * that a triage assignment writes the tag AND clears its skip entry, that "Skip"
 * only reorders, that a chip press reaches the right domain, and that handing a
 * row to an agent with no start event opens the editor instead of firing nothing.
 */
// The containers pull the ui barrels, which transitively import third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in these decisions.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const PriorityTime = require('../PriorityTime.vue').default;

const { computed, methods } = PriorityTime;

const call = (name, ctx) => computed[name].call(ctx);
const run = (name, ctx, ...args) => methods[name].apply(ctx, args);

/** Enough of the page for its own methods: refs, toast state, summary. */
const ctx = (over = {}) => {
  const calls = [];
  const base = {
    date: '12-09-2026',
    skipped: [],
    toast: {
      title: '', sub: '', icon: '', iconColor: '', seq: 0,
    },
    summary: {
      openTotal: 3,
      triageCount: 2,
      tasklist: [{ id: 'sw', name: 'Start Work', time: '09:00' }],
      scores: { D: 0, K: 0, G: 0 },
      streakDays: 0,
      yearAverage: 0,
      loaded: true,
    },
    automating: new Set(),
    goalDialogOpen: false,
    selectedGoalItem: null,
    tasklist: [{ id: 'sw', name: 'Start Work', time: '09:00' }],
    calls,
    $refs: {
      board: {
        refetch: () => { calls.push(['refetch']); return Promise.resolve(); },
        recover: () => { calls.push(['recover']); return null; },
      },
      quadrant: {
        assign: (item, quadrant) => {
          calls.push(['assign', item.id, quadrant]);
          return Promise.resolve({});
        },
      },
      complete: {
        toggle: (item) => { calls.push(['toggle', item.id]); return Promise.resolve({}); },
      },
      routineCreate: {
        automate: (item, host) => {
          calls.push(['automate', item.id, host && host.id]);
          return Promise.resolve({});
        },
      },
      agentModal: { open: (taskRef) => calls.push(['open-agent-modal', taskRef]) },
    },
    $agent: {
      statusByRoutineId: {},
      getByTaskRef: () => null,
      fireStartEventIfPresent: (args) => {
        calls.push(['fire-start', args.taskRef, args.goalId]);
        return Promise.resolve({});
      },
      showSavedResult: (taskRef, html) => calls.push(['saved-result', taskRef, html.length]),
      openResultModal: (taskRef) => calls.push(['open-result', taskRef]),
    },
    showToast(payload) { methods.showToast.call(this, payload); },
    routineFor(taskRef) { return methods.routineFor.call(this, taskRef); },
    refetchBoard() { return methods.refetchBoard.call(this); },
    recoverBoard() { return methods.recoverBoard.call(this); },
    handToAgent(item) { return methods.handToAgent.call(this, item); },
    viewAgentResult(item) { return methods.viewAgentResult.call(this, item); },
    automate(item) { return methods.automate.call(this, item); },
  };
  return { ...base, ...over };
};

const row = (over) => ({
  id: 'i1',
  body: 'Ship dashboard PR',
  isComplete: false,
  quadrant: 'do',
  taskRef: 'sw',
  date: '12-09-2026',
  period: 'day',
  tags: ['priority:do'],
  ...over,
});

describe('PriorityTime shell + header', () => {
  const shellFor = (breakpoint) => call('shell', { $vuetify: { breakpoint } });

  // The ONE breakpoint rule, via resolveShell — not a second scheme.
  it('uses the chassis breakpoints', () => {
    expect(shellFor({ xsOnly: true, width: 412 })).toBe('phone');
    expect(shellFor({ xsOnly: false, width: 1133 })).toBe('tablet');
    expect(shellFor({ xsOnly: false, width: 1264 })).toBe('desktop');
  });

  it('keeps the phone subtitle to the open count and adds triage on wide shells', () => {
    const base = ctx();
    expect(call('subtitle', { ...base, shell: 'phone', longDate: 'Saturday, 12 September' }))
      .toBe('Saturday, 12 September · 3 open');
    expect(call('subtitle', { ...base, shell: 'desktop', longDate: 'Saturday, 12 September' }))
      .toBe('Saturday, 12 September · 3 open · 2 to triage');
  });

  // While the board has not been read, "0 open · 0 to triage" would be a claim.
  it('states no counts until the board has been read', () => {
    const base = ctx();
    const unread = { ...base, summary: { ...base.summary, loaded: false } };
    expect(call('subtitle', { ...unread, shell: 'desktop', longDate: 'Saturday, 12 September' }))
      .toBe('Saturday, 12 September');
  });

  // D-10: a balance that failed to load is unknown, not zero.
  it('reports a points error only while there is no balance', () => {
    expect(call('pointsError', { xpBalanceError: true, xpBalance: null })).toBe(true);
    expect(call('pointsError', { xpBalanceError: true, xpBalance: { available: 12 } })).toBe(false);
  });
});

describe('PriorityTime triage + move', () => {
  it('writes the tag and toasts the quadrant it landed in', async () => {
    const c = ctx();
    run('onAssign', c, { item: row(), quadrant: 'plan', fromTriage: true });
    await Promise.resolve();
    // The landed write also un-sticks a board whose last read failed.
    expect(c.calls).toEqual([['assign', 'i1', 'plan'], ['recover']]);
    expect(c.toast.title).toBe('Triaged to PLAN');
    expect(c.toast.sub).toBe('Ship dashboard PR');
  });

  it('says Moved, not Triaged, for a picker move', () => {
    const c = ctx();
    run('onAssign', c, { item: row(), quadrant: 'automate', fromTriage: false });
    expect(c.toast.title).toBe('Moved to AUTOMATE');
  });

  // The item leaves the queue by growing a tag, so its skip entry is dead weight.
  it('clears the skip entry of an item it just sorted', () => {
    const c = ctx({ skipped: ['i1', 'i2'] });
    run('onAssign', c, { item: row(), quadrant: 'do', fromTriage: true });
    expect(c.skipped).toEqual(['i2']);
  });

  it('skips by moving the id to the back of the queue, writing nothing', () => {
    const c = ctx({ skipped: [] });
    run('onSkip', c, row({ id: 'x1' }));
    expect(c.skipped).toEqual(['x1']);
    run('onSkip', c, row({ id: 'x2' }));
    expect(c.skipped).toEqual(['x1', 'x2']);
    // Skipping the same one again re-queues it last rather than duplicating it.
    run('onSkip', c, row({ id: 'x1' }));
    expect(c.skipped).toEqual(['x2', 'x1']);
    expect(c.calls).toEqual([]);
  });

  it('says so when the move fails', () => {
    const c = ctx();
    run('onQuadrantError', c, { item: row() });
    expect(c.toast.title).toBe("Couldn't move that");
    expect(c.toast.sub).toContain('stayed where it was');
  });
});

describe('PriorityTime tick', () => {
  it('toggles through the complete unit and toasts the consequence', async () => {
    const c = ctx();
    run('onToggle', c, row());
    await Promise.resolve();
    expect(c.calls).toEqual([['toggle', 'i1'], ['recover']]);
    expect(c.toast.title).toBe('Done');
    expect(c.toast.sub).toBe('Ship dashboard PR · DO');
  });

  it('reads an already-done row as a reopen', () => {
    const c = ctx();
    run('onToggle', c, row({ isComplete: true }));
    expect(c.toast.title).toBe('Reopened');
  });
});

describe('PriorityTime row chips', () => {
  it('routes each chip type to its own domain', () => {
    const handed = [];
    const c = ctx({
      handToAgent: (item) => handed.push(['hand', item.id]),
      viewAgentResult: (item) => handed.push(['view', item.id]),
      automate: (item) => handed.push(['automate', item.id]),
    });
    run('onAction', c, { item: row(), type: 'hand-to-agent' });
    run('onAction', c, { item: row(), type: 'view-result' });
    run('onAction', c, { item: row(), type: 'automate' });
    expect(handed).toEqual([['hand', 'i1'], ['view', 'i1'], ['automate', 'i1']]);
  });

  it('fires the routine task\'s real start event with the row as the goal id', () => {
    const c = ctx();
    c.$agent.getByTaskRef = () => ({ id: 'a1', startEvent: { kind: 'url', value: 'https://x' } });
    run('handToAgent', c, row());
    expect(c.calls).toEqual([['fire-start', 'sw', 'i1']]);
    expect(c.toast.title).toBe('Handed to agent');
  });

  // Nothing to fire — so open the editor rather than failing silently.
  it('opens the agent editor when the routine has no start event', () => {
    const c = ctx();
    c.$agent.getByTaskRef = () => ({ id: 'a1', startEvent: null });
    run('handToAgent', c, row());
    expect(c.calls).toEqual([['open-agent-modal', 'sw']]);
    expect(c.toast.title).toBe('No agent on this routine yet');
    expect(c.toast.sub).toContain('Start Work');
  });

  it('reopens a saved transcript rather than asking for a live run', () => {
    const c = ctx();
    run('viewAgentResult', c, row({ reward: '<p>14 notes</p>' }));
    expect(c.calls[0][0]).toBe('saved-result');
    expect(c.calls[0][1]).toBe('sw');
  });

  it('falls back to the live result modal with no transcript', () => {
    const c = ctx();
    run('viewAgentResult', c, row({ reward: '' }));
    expect(c.calls).toEqual([['open-result', 'sw']]);
  });

  it('creates the real routine task and re-reads the board', async () => {
    const c = ctx();
    await run('automate', c, row({ quadrant: 'automate' }));
    expect(c.calls).toEqual([['automate', 'i1', 'sw'], ['refetch']]);
    expect(c.toast.title).toBe('Now a routine task');
    expect(c.toast.sub).toBe('Ship dashboard PR · every day in Start Work');
  });

  // The chip flips only after the re-read, so a double tap must not create twice.
  it('ignores a second tap while the first create is in flight, then allows it again', async () => {
    const c = ctx();
    const first = run('automate', c, row({ quadrant: 'automate' }));
    expect(run('automate', c, row({ quadrant: 'automate' }))).toBeNull();
    await first;
    expect(c.calls.filter(([op]) => op === 'automate')).toHaveLength(1);
    expect(c.automating.size).toBe(0);
  });

  it('drops the "in <routine>" clause for an item with no routine', async () => {
    const c = ctx();
    await run('automate', c, row({ taskRef: '', quadrant: 'automate' }));
    expect(c.toast.sub).toBe('Ship dashboard PR · every day');
  });
});

describe('PriorityTime toast contract', () => {
  // chassis.md § Toast: always title + sub, and the seq bumps so a repeat replays.
  it('bumps the sequence on every toast', () => {
    const c = ctx();
    run('showToast', c, { title: 'A', sub: 'B' });
    expect(c.toast.seq).toBe(1);
    run('showToast', c, { title: 'A', sub: 'B' });
    expect(c.toast.seq).toBe(2);
  });

  it('clears only the copy, so the host stops rendering', () => {
    const c = ctx();
    run('showToast', c, { title: 'A', sub: 'B' });
    run('clearToast', c);
    expect(c.toast.title).toBe('');
    expect(c.toast.sub).toBe('');
    expect(c.toast.seq).toBe(1);
  });
});

describe('PriorityTime goal editor', () => {
  it('opens the reused editor on the row it was asked for', () => {
    const c = ctx();
    run('onOpenItem', c, row({ contribution: 'why', subTasks: [{ id: 's1' }] }));
    expect(c.goalDialogOpen).toBe(true);
    expect(c.selectedGoalItem).toMatchObject({
      id: 'i1', body: 'Ship dashboard PR', period: 'day', date: '12-09-2026',
    });
  });

  it('re-reads the board when the editor closes', () => {
    const c = ctx({ goalDialogOpen: true, selectedGoalItem: { id: 'i1' } });
    run('onGoalEditorClosed', c);
    expect(c.goalDialogOpen).toBe(false);
    expect(c.selectedGoalItem).toBeNull();
    expect(c.calls).toEqual([['refetch']]);
  });
});
