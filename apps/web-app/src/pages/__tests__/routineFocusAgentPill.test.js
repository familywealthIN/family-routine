/* eslint-env jest */
/**
 * D-08: the 'Agent started' pill, exercised against a minimal vm-like context
 * (no mount), matching the page test convention.
 *
 * The 26 Oct 2026 notifications run ticked a routine through the /start deep
 * link whose goal item never saved: `startAgentWhenReady` ended in 'timeout',
 * no start event was dispatched, the toast said 'Agent not started' — and the
 * thread still carried a persisted 'Agent started', because the pill was posted
 * on the mere existence of an agent in the same tick as an un-awaited start.
 * The pill is posted from the outcome instead, so the two cannot disagree.
 */
// Same stubs as routineFocusPage.test.js — the page pulls the ui barrels.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const RoutineFocus = require('../RoutineFocus.vue').default;

const { methods } = RoutineFocus;

// Microtasks only — a real timer lets the analytics page-load hook fire into
// jsdom, which has no navigation timing entries.
const flush = () => [1, 2, 3, 4, 5].reduce((p) => p.then(() => {}), Promise.resolve());

const AGENT = {
  id: 'a1',
  startEvent: { kind: 'url', value: 'https://hooks.test/start?goal={{goal_id}}' },
};

/** A ticked-routine context whose queued start resolves with `outcome`. */
const vmFor = (outcome, { agent = AGENT } = {}) => {
  const vm = {
    rows: [{ id: 'sw', name: 'Start Work' }],
    stimulusTotals: { D: 16, K: 0, G: 0 },
    postChatEvent: jest.fn(),
    $notify: jest.fn(),
    fireAgentWhenReady: jest.fn(() => Promise.resolve(outcome)),
    $agent: { getByTaskRef: jest.fn(() => agent) },
  };
  vm.startAgentAndAnnounce = (ref, opts) => methods.startAgentAndAnnounce.call(vm, ref, opts);
  return vm;
};

const tick = (vm) => methods.onRoutineTicked.call(vm, { id: 'sw', name: 'Start Work' }, {
  fireAgent: true,
  agentImplicit: true,
  credited: [{ name: 'D', label: 'Discipline', points: 16 }],
});

const pills = (vm) => vm.postChatEvent.mock.calls.map(([payload]) => payload.text);

describe('RoutineFocus agent pill — the tick path', () => {
  // The Done when: the start never went out, so the thread must not claim it.
  it('posts no pill when the queued start times out', async () => {
    const vm = vmFor('timeout');
    tick(vm);
    await flush();

    expect(vm.fireAgentWhenReady).toHaveBeenCalledWith('sw', { implicit: true });
    expect(pills(vm)).toEqual(['Routine ticked · D +16']);
  });

  it('posts the pill once the start event has actually gone out', async () => {
    const vm = vmFor('fired');
    tick(vm);
    // Nothing yet: the start has not resolved, and that is the whole bug.
    expect(pills(vm)).toEqual(['Routine ticked · D +16']);

    await flush();
    expect(vm.postChatEvent).toHaveBeenCalledWith({
      text: 'Agent started', tone: 'blue', icon: 'smart_toy', taskRef: 'sw',
    });
  });

  it('posts no pill for a routine with no agent to start', async () => {
    const vm = vmFor('no-agent', { agent: null });
    tick(vm);
    await flush();

    expect(pills(vm)).toEqual(['Routine ticked · D +16']);
  });

  // `fireAgentWhenReady` returns null when the start is refused outright (the
  // routine is worth no points) — there is no outcome to announce.
  it('posts no pill when the start was refused', async () => {
    const vm = vmFor('fired');
    vm.fireAgentWhenReady = jest.fn(() => null);
    tick(vm);
    await flush();

    expect(pills(vm)).toEqual(['Routine ticked · D +16']);
  });
});

describe('RoutineFocus agent pill — the chat run-again path', () => {
  const chatVmFor = (outcome) => {
    const vm = {
      date: '12-11-2026',
      isToday: true,
      tasklist: [{ id: 'sw', points: 12 }],
      endEventFiring: {},
      $notify: jest.fn(),
      postChatEvent: jest.fn(),
      effectiveAgentStatus: jest.fn(() => 'finished'),
      runStalled: jest.fn(() => false),
      fireAgentWhenReady: jest.fn(() => Promise.resolve(outcome)),
      maybeFireAgentEndEvent: jest.fn(),
      refuseAgentWithoutPoints: jest.fn(() => false),
      $agent: {
        getByTaskRef: jest.fn(() => AGENT),
        canFireEndEvent: jest.fn(() => false),
      },
    };
    vm.startAgentAndAnnounce = (ref, opts) => methods.startAgentAndAnnounce.call(vm, ref, opts);
    return vm;
  };

  it('posts no pill when the re-run times out', async () => {
    const vm = chatVmFor('timeout');
    await methods.runAgentFromChat.call(vm, { taskRef: 'sw', date: '12-11-2026' });

    expect(vm.fireAgentWhenReady).toHaveBeenCalledWith('sw', { implicit: false });
    expect(vm.postChatEvent).not.toHaveBeenCalled();
  });

  // The wording is still read against the status the message was sent on.
  it('posts the re-run pill once the start has gone out', async () => {
    const vm = chatVmFor('fired');
    await methods.runAgentFromChat.call(vm, { taskRef: 'sw', date: '12-11-2026' });

    expect(vm.postChatEvent).toHaveBeenCalledWith({
      text: 'Agent started again', tone: 'blue', icon: 'smart_toy', taskRef: 'sw',
    });
  });
});

/**
 * D-06: Start Agent on a PASSED routine is a redeem, and that path fired the
 * agent without announcing it — the thread kept only the points receipt while
 * /agents showed the run. It goes through the same helper now, so the record is
 * posted from the start's outcome, once, and persisted like the tick path's.
 */
describe('RoutineFocus agent pill — the redeem path', () => {
  /** A redeemable-routine context whose redeem resolves when `settle` is called. */
  const redeemVmFor = (outcome) => {
    let settle;
    const vm = {
      date: '12-11-2026',
      did: 'doc-1',
      showingPlaceholder: false,
      routineDate: null, // no optimistic response to build
      xpBalance: { available: 40, used: 0, entitled: false },
      postChatEvent: jest.fn(),
      $notify: jest.fn(),
      $apollo: {
        mutate: jest.fn(() => new Promise((resolve) => {
          settle = () => resolve({
            data: {
              redeemRoutineItem: { balance: { available: 25, used: 15, entitled: false } },
            },
          });
        })),
      },
      getRedeemCost: () => 15,
      canAffordRedeem: () => true,
      measureFly: jest.fn(),
      clearFly: jest.fn(),
      trackButtonClick: jest.fn(),
      trackMutationPerformance: jest.fn(),
      redeemWhenSettled: jest.fn(),
      fireAgentWhenReady: jest.fn(() => Promise.resolve(outcome)),
    };
    vm.startAgentAndAnnounce = (ref, opts) => methods.startAgentAndAnnounce.call(vm, ref, opts);
    return { vm, settle: () => settle() };
  };

  const redeem = (vm, opts) => methods.redeemRoutine
    .call(vm, { id: 'sw', name: 'Start Work' }, opts);

  // The Done when: posted after the redeem succeeds, and exactly once.
  it('posts one Agent started once the redeem has resolved', async () => {
    const { vm, settle } = redeemVmFor('fired');
    redeem(vm, { fireAgent: true, agentImplicit: false });

    // Nothing is claimed while the redeem is still on the wire.
    expect(pills(vm)).toEqual([]);

    settle();
    await flush();

    expect(vm.fireAgentWhenReady).toHaveBeenCalledWith('sw', { implicit: false });
    expect(pills(vm)).toEqual(['Redeemed with 15 points · ticked', 'Agent started']);
    expect(vm.postChatEvent).toHaveBeenCalledWith({
      text: 'Agent started', tone: 'blue', icon: 'smart_toy', taskRef: 'sw',
    });
    // The points receipt the ticket leaves alone.
    expect(vm.$notify).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Agent started for 15 points',
    }));
  });

  it('posts no Agent started when the redeem starts no agent', async () => {
    const { vm, settle } = redeemVmFor('fired');
    redeem(vm, { fireAgent: false });
    settle();
    await flush();

    expect(vm.fireAgentWhenReady).not.toHaveBeenCalled();
    expect(pills(vm)).toEqual(['Redeemed with 15 points · ticked']);
  });

  // Same rule as the tick path (D-08): no start event went out, so the thread
  // must not claim one.
  it('posts no Agent started when the queued start times out', async () => {
    const { vm, settle } = redeemVmFor('timeout');
    redeem(vm, { fireAgent: true, agentImplicit: false });
    settle();
    await flush();

    expect(pills(vm)).toEqual(['Redeemed with 15 points · ticked']);
  });
});
