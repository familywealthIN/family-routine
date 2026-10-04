/* eslint-env jest */
/**
 * The routine-grouped list and the two row chip state machines
 * (Priority.dc.html). Mounted, following ProgressRing.test.js / AppShell.test.js.
 */
const Vue = require('vue');

const PriorityTaskList = require('./PriorityTaskList.vue').default;
const { DELEGATE_CHIP, AUTOMATE_CHIP } = require('../../constants/priority');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const row = (over) => ({
  id: 'i1', body: 'A task', isComplete: false, quadrant: 'do', meta: '', ...over,
});

const render = (props = {}) => {
  const events = [];
  const vm = new Vue({
    render(h) {
      return h(PriorityTaskList, {
        props: { groups: [], color: '#F44336', ...props },
        on: {
          toggle: (p) => events.push(['toggle', p]),
          move: (p) => events.push(['move', p]),
          open: (p) => events.push(['open', p]),
          action: (p) => events.push(['action', p]),
        },
      });
    },
  }).$mount();
  return { vm, el: vm.$el, events };
};

const testid = (el, id) => el.querySelector(`[data-testid="${id}"]`);

describe('MoleculePriorityTaskList — routine grouping', () => {
  const GROUPS = [
    { key: 'mp', time: '06:30', name: 'Morning Pages', isNow: false, rows: [row({ id: 'a' })] },
    { key: 'sw', time: '09:00', name: 'Start Work', isNow: true, rows: [row({ id: 'b' }), row({ id: 'c' })] },
    {
      key: 'none', time: '—', name: 'No routine', isNow: false, rows: [row({ id: 'd' })],
    },
  ];

  it('renders every group in the order given, No routine last', () => {
    const { el } = render({ groups: GROUPS });
    const names = Array.prototype.map
      .call(el.querySelectorAll('.rn-plist__group-name'), (n) => n.textContent.trim());
    expect(names).toEqual(['Morning Pages', 'Start Work', 'No routine']);
  });

  // Only the routine whose window contains now is badged — the model decides
  // which, the list must not badge a second one.
  it('badges exactly the group flagged isNow', () => {
    const { el } = render({ groups: GROUPS });
    const badges = el.querySelectorAll('[data-testid="priority-now-badge"]');
    expect(badges).toHaveLength(1);
    expect(badges[0].textContent.trim()).toBe('NOW');
    expect(badges[0].parentNode.querySelector('.rn-plist__group-name').textContent.trim())
      .toBe('Start Work');
  });

  it('tints the NOW group time orange and leaves the others grey', () => {
    const { el } = render({ groups: GROUPS });
    const times = el.querySelectorAll('.rn-plist__time');
    expect(times[1].getAttribute('style')).toContain('rgb(230, 137, 0)');
    expect(times[0].getAttribute('style')).not.toContain('rgb(230, 137, 0)');
  });

  it('shows the empty copy when there is nothing in the quadrant', () => {
    const { el } = render({ groups: [], emptyText: 'Nothing here' });
    expect(testid(el, 'priority-list-empty').textContent.trim()).toBe('Nothing here');
  });

  it('emits toggle, move and open from a row', () => {
    const { el, events } = render({ groups: [GROUPS[0]] });
    testid(el, 'priority-toggle-a').click();
    testid(el, 'priority-move-a').click();
    el.querySelector('.rn-plist__body').click();
    expect(events.map((e) => e[0])).toEqual(['toggle', 'move', 'open']);
    expect(events[0][1].id).toBe('a');
  });

  it('strikes a completed row and paints its box the quadrant colour', () => {
    const { el } = render({
      groups: [{ ...GROUPS[0], rows: [row({ id: 'a', isComplete: true })] }],
    });
    expect(el.querySelector('.rn-plist__body').getAttribute('style')).toContain('line-through');
    expect(testid(el, 'priority-toggle-a').textContent.trim()).toBe('check_box');
  });
});

describe('MoleculePriorityTaskList — the DELEGATE chip', () => {
  const delegate = (over) => render({
    groups: [{
      key: 'sw', time: '09:00', name: 'Start Work', isNow: false, rows: [row({ id: 'a', quadrant: 'delegate', ...over })],
    }],
  });

  it('draws nothing when the row has no agent surface at all', () => {
    const { el } = delegate({ agentState: '' });
    expect(testid(el, 'priority-chip-a')).toBeNull();
  });

  it('offers the hand-off first', () => {
    const { el, events } = delegate({ agentState: 'ready' });
    const chip = testid(el, 'priority-chip-a');
    expect(chip.textContent).toContain(DELEGATE_CHIP.ready.label);
    chip.click();
    expect(events).toEqual([['action', expect.objectContaining({ type: 'hand-to-agent' })]]);
  });

  it('pulses while the agent runs and refuses the tap', () => {
    const { el, events } = delegate({ agentState: 'running' });
    const chip = testid(el, 'priority-chip-a');
    expect(chip.textContent).toContain(DELEGATE_CHIP.running.label);
    expect(testid(el, 'priority-chip-dot')).not.toBeNull();
    expect(chip.getAttribute('style')).toContain('cursor: default');
    chip.click();
    expect(events).toEqual([]);
  });

  it('ends on the result, which is clickable', () => {
    const { el, events } = delegate({ agentState: 'done' });
    const chip = testid(el, 'priority-chip-a');
    expect(chip.textContent).toContain(DELEGATE_CHIP.done.label);
    expect(testid(el, 'priority-chip-dot')).toBeNull();
    chip.click();
    expect(events).toEqual([['action', expect.objectContaining({ type: 'view-result' })]]);
  });
});

describe('MoleculePriorityTaskList — the AUTOMATE chip', () => {
  const automate = (over) => render({
    groups: [{
      key: 'wd', time: '21:30', name: 'Wind Down', isNow: false, rows: [row({ id: 'a', quadrant: 'automate', rule: 'every day', ...over })],
    }],
  });

  it('offers the promotion with its cadence', () => {
    const { el, events } = automate({ automated: false });
    const chip = testid(el, 'priority-chip-a');
    expect(chip.textContent).toContain(`${AUTOMATE_CHIP.ready.label} · every day`);
    chip.click();
    expect(events).toEqual([['action', expect.objectContaining({ type: 'automate' })]]);
  });

  it('settles into the routine state and stops being tappable', () => {
    const { el, events } = automate({ automated: true });
    const chip = testid(el, 'priority-chip-a');
    expect(chip.textContent).toContain(`${AUTOMATE_CHIP.done.label} · every day`);
    chip.click();
    expect(events).toEqual([]);
  });

  // A finished item has nothing left to automate.
  it('drops the chip once the row is done', () => {
    const { el } = automate({ isComplete: true });
    expect(testid(el, 'priority-chip-a')).toBeNull();
  });
});
