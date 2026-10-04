/* eslint-env jest */
const Vue = require('vue');

const RoutineChatThread = require('./RoutineChatThread.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const GOAL_ITEMS = [
  { id: 'g1', body: 'Ship dashboard PR', isComplete: false },
  { id: 'g2', body: 'Reply to Ana', isComplete: true },
];

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(RoutineChatThread, {
      props: {
        messages: [],
        goalItems: GOAL_ITEMS,
        routineName: 'Start Work',
        ...props,
      },
    }),
  }).$mount();
  return { vm, thread: vm.$children[0], el: vm.$el };
};

describe('OrganismRoutineChatThread', () => {
  it('labels the thread with the routine it belongs to', () => {
    const { el } = render();
    expect(el.querySelector('.rn-chat__divider').textContent.trim())
      .toBe('CHAT WITH START WORK');
  });

  it('right-aligns the user and left-aligns the routine', () => {
    const { el } = render({
      messages: [
        { id: 'm1', from: 'me', kind: 'text', text: 'done with the PR' },
        { id: 'm2', from: 'routine', kind: 'text', text: 'Marked it done.' },
      ],
    });
    const rows = el.querySelectorAll('.rn-chat__row');
    expect(rows[0].style.justifyContent).toBe('flex-end');
    expect(rows[1].style.justifyContent).toBe('flex-start');
    expect(rows[0].querySelector('.rn-chat__bubble').style.background).toBe('rgb(40, 139, 213)');
  });

  it('centres a system event as a tinted pill, not a bubble', () => {
    const { el } = render({
      messages: [{
        id: 'e1', from: 'routine', kind: 'event', text: 'Routine ticked · G +12', tone: 'green', icon: 'check_circle',
      }],
    });
    expect(el.querySelector('.rn-chat__row').style.justifyContent).toBe('center');
    expect(el.querySelector('.rn-chat__bubble')).toBeNull();
    const pill = el.querySelector('.rn-chat__event');
    expect(pill.textContent).toContain('Routine ticked');
    expect(pill.style.color).toBe('rgb(46, 125, 50)');
  });

  // "Day skipped" is posted orange; an unknown tone used to fall back to green.
  it('renders an orange event in orange', () => {
    const { el } = render({
      messages: [{
        id: 'e2', from: 'routine', kind: 'event', text: 'Day skipped', tone: 'orange', icon: 'event_busy',
      }],
    });
    expect(el.querySelector('.rn-chat__event').style.color).toBe('rgb(230, 81, 0)');
  });

  it('renders referenced goal items as live checkbox rows', () => {
    const { el, thread } = render({
      messages: [{
        id: 'm1', from: 'routine', kind: 'text', text: 'Added it.', items: ['g1'],
      }],
    });
    const rows = el.querySelectorAll('.rn-chat__item');
    expect(rows).toHaveLength(1);
    const toggled = [];
    thread.$on('toggle-item', (item) => toggled.push(item.id));
    rows[0].click();
    expect(toggled).toEqual(['g1']);
  });

  // An id the user has since deleted must drop out rather than render blank.
  it('drops referenced ids that are no longer goal items', () => {
    const { el } = render({
      messages: [{
        id: 'm1', from: 'routine', kind: 'text', text: 'Added it.', items: ['g1', 'gone'],
      }],
    });
    expect(el.querySelectorAll('.rn-chat__item')).toHaveLength(1);
  });

  it('offers Add all on fresh proposals and withdraws it once accepted', () => {
    const base = {
      id: 'm1', from: 'routine', kind: 'text', text: 'Three steps:', proposals: ['a', 'b', 'c'],
    };
    const fresh = render({ messages: [base] });
    expect(fresh.el.querySelectorAll('.rn-chat__proposal')).toHaveLength(3);
    expect(fresh.el.querySelector('[data-testid="chat-add-all"]')).not.toBeNull();

    const added = render({ messages: [{ ...base, added: true }] });
    expect(added.el.querySelector('[data-testid="chat-add-all"]')).toBeNull();
    expect(added.el.querySelector('.rn-chat__proposal-icon').textContent.trim())
      .toBe('check_circle');
  });

  // Quick replies are an invitation to answer the LAST thing said — showing
  // them under every bubble would make the thread a wall of buttons.
  it('shows quick replies only under the last routine message', () => {
    const { el } = render({
      quickReplies: ['Break it down', 'How am I doing?'],
      messages: [
        { id: 'm1', from: 'routine', kind: 'text', text: 'first' },
        { id: 'm2', from: 'routine', kind: 'text', text: 'second' },
      ],
    });
    const bubbles = el.querySelectorAll('.rn-chat__bubble');
    expect(bubbles[0].querySelectorAll('.rn-chat__chip')).toHaveLength(0);
    expect(bubbles[1].querySelectorAll('.rn-chat__chip')).toHaveLength(2);
  });

  it('hides quick replies while the reply is still being typed', () => {
    const { el } = render({
      quickReplies: ['Break it down'],
      typing: true,
      messages: [{ id: 'm1', from: 'routine', kind: 'text', text: 'first' }],
    });
    expect(el.querySelectorAll('.rn-chat__chip')).toHaveLength(0);
    expect(el.querySelector('[data-testid="chat-typing"]')).not.toBeNull();
  });

  it('never offers quick replies under the user’s own message', () => {
    const { el } = render({
      quickReplies: ['Break it down'],
      messages: [{ id: 'm1', from: 'me', kind: 'text', text: 'hello' }],
    });
    expect(el.querySelectorAll('.rn-chat__chip')).toHaveLength(0);
  });
});

// The brief is pinned into the thread as a message kind, not stacked above it,
// so it scrolls and orders with the conversation.
describe('OrganismRoutineChatThread — the "Before you start" brief', () => {
  const BRIEF = {
    id: 'brief',
    from: 'routine',
    kind: 'brief',
    open: true,
    subline: 'Health › Fitness · 1 next step',
    blocks: [{
      tag: 'area:health:fitness',
      kind: 'AREA',
      icon: 'dashboard',
      color: '#288bd5',
      segments: ['Health', 'Fitness'],
      breadcrumb: 'Health › Fitness',
      description: 'About 3 km every lunch break.',
      stat: '1/1 recent',
      steps: [{ text: 'Try the river loop', added: false }],
      activity: [{ date: 'Fri', text: '3.1 km', done: true }],
    }],
  };

  it('renders a brief message as the card, not as a bubble', () => {
    const { el } = render({
      messages: [BRIEF, { id: 'm1', from: 'routine', kind: 'text', text: 'hi' }],
    });
    const rows = el.querySelectorAll('.rn-chat__row');
    expect(rows[0].querySelector('[data-testid="routine-brief-card"]')).not.toBeNull();
    expect(rows[0].querySelector('.rn-chat__bubble')).toBeNull();
    expect(rows[1].querySelector('.rn-chat__bubble')).not.toBeNull();
  });

  it('bubbles the card’s toggle and add-step up to the container', () => {
    const toggles = [];
    const added = [];
    const vm = new Vue({
      render: (h) => h(RoutineChatThread, {
        props: { messages: [BRIEF], goalItems: [], routineName: 'Workout' },
        on: { 'toggle-brief': () => toggles.push(true), 'add-brief-step': (p) => added.push(p) },
      }),
    }).$mount();

    vm.$el.querySelector('[data-testid="brief-toggle"]').click();
    vm.$el.querySelector('[data-testid="brief-add"]').click();
    expect(toggles).toHaveLength(1);
    expect(added).toEqual([{ tag: 'area:health:fitness', text: 'Try the river loop' }]);
  });

  it('renders a collapsed brief with its subline only', () => {
    const { el } = render({ messages: [{ ...BRIEF, open: false }] });
    expect(el.querySelector('[data-testid="brief-subline"]').textContent.trim())
      .toBe('Health › Fitness · 1 next step');
    expect(el.querySelectorAll('[data-testid="brief-block"]')).toHaveLength(0);
  });
});

/**
 * The thread has two hosts: the routine thread on Home and the year-goal thread
 * on Year Goals (docs/redesign/chassis.md § "Chat has two hosts"). These guard
 * the seams that made the second host possible — and that nothing in them is
 * routine-specific, so a third host would not need a third thread.
 */
describe('OrganismRoutineChatThread — host-agnostic', () => {
  it('lets a host name the thread, and keeps the routine wording by default', () => {
    expect(render().el.querySelector('.rn-chat__divider').textContent.trim())
      .toBe('CHAT WITH START WORK');
    expect(render({ heading: 'CHAT WITH THIS GOAL' })
      .el.querySelector('.rn-chat__divider').textContent.trim())
      .toBe('CHAT WITH THIS GOAL');
  });

  it('falls back to "this routine" when a routine host has no name yet', () => {
    expect(render({ routineName: '' }).el.querySelector('.rn-chat__divider').textContent.trim())
      .toBe('CHAT WITH THIS ROUTINE');
  });

  it('lets the bulk-accept button say what it is adding', () => {
    const generic = render({
      messages: [{
        id: 'm1', from: 'routine', kind: 'text', text: 'Three steps:', proposals: ['a', 'b', 'c'],
      }],
    });
    expect(generic.el.querySelector('[data-testid="chat-add-all"]').textContent.trim())
      .toBe('Add all to checklist');

    const named = render({
      messages: [{
        id: 'm1',
        from: 'goal',
        kind: 'text',
        text: 'A plan:',
        proposals: ['a', 'b', 'c'],
        addAllLabel: 'Add 3 week goals',
      }],
    });
    expect(named.el.querySelector('[data-testid="chat-add-all"]').textContent.trim())
      .toBe('Add 3 week goals');
  });

  it('treats any non-"me" sender as the other side, whatever the host calls it', () => {
    const { el } = render({
      messages: [
        { id: 'm1', from: 'me', kind: 'text', text: 'how am I doing?' },
        { id: 'm2', from: 'goal', kind: 'text', text: '5 of 6 months done.' },
      ],
    });
    const rows = el.querySelectorAll('.rn-chat__row');
    expect(rows[0].style.justifyContent).toBe('flex-end');
    expect(rows[1].style.justifyContent).toBe('flex-start');
  });
});

describe('OrganismRoutineChatThread — an accepted proposal bubble', () => {
  const accepted = {
    id: 'm1',
    from: 'goal',
    kind: 'text',
    text: 'Three weeks:',
    proposals: ['Ship dashboard PR', 'Reply to Ana', 'Third'],
    added: true,
    items: ['g1', 'g2'],
  };

  it('keeps Home’s rows AND "added" proposals by default (unchanged behaviour)', () => {
    const { el } = render({ messages: [accepted] });
    expect(el.querySelectorAll('.rn-chat__item')).toHaveLength(2);
    expect(el.querySelectorAll('.rn-chat__proposal')).toHaveLength(3);
  });

  it('shows only the created rows when the host asks to replace added proposals', () => {
    const { el } = render({ messages: [accepted], replaceAddedProposals: true });
    expect(el.querySelectorAll('.rn-chat__item')).toHaveLength(2);
    expect(el.querySelector('.rn-chat__proposals')).toBeNull();
    expect(el.querySelector('[data-testid="chat-add-all"]')).toBeNull();
  });

  it('still lists fresh proposals with the Add button when replacing is on', () => {
    const fresh = { ...accepted, added: false, items: [] };
    const { el } = render({ messages: [fresh], replaceAddedProposals: true });
    expect(el.querySelectorAll('.rn-chat__proposal')).toHaveLength(3);
    expect(el.querySelector('[data-testid="chat-add-all"]')).not.toBeNull();
  });

  it('falls back to the proposal list when none of the attached ids resolve', () => {
    const gone = { ...accepted, items: ['deleted-1'] };
    const { el } = render({ messages: [gone], replaceAddedProposals: true });
    expect(el.querySelectorAll('.rn-chat__item')).toHaveLength(0);
    expect(el.querySelectorAll('.rn-chat__proposal')).toHaveLength(3);
  });
});
