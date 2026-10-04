/* eslint-env jest */
/**
 * The Priority board (Priority.dc.html).
 *
 * The behaviour only this organism can get wrong: the 2x2 map is NAVIGATION on
 * the phone and STATE DISPLAY on tablet/desktop, the triage card shows exactly
 * one item, "Skip" assigns nothing, and the move picker writes only a real move.
 */
const Vue = require('vue');

const PriorityBoard = require('./PriorityBoard.vue').default;
const { QUADRANTS } = require('../../constants/priority');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const row = (id, over) => ({
  id, body: `Task ${id}`, isComplete: false, meta: '', ...over,
});

/** One group per quadrant so each list is identifiable by its row ids. */
const quadrantsWith = (rowsByKey = {}) => QUADRANTS.map((q) => {
  const rows = rowsByKey[q.key] || [];
  const done = rows.filter((r) => r.isComplete).length;
  return {
    ...q,
    total: rows.length,
    done,
    open: rows.length - done,
    pct: rows.length ? Math.round((done / rows.length) * 100) : 0,
    groups: rows.length
      ? [{
        key: 'sw', time: '09:00', name: 'Start Work', isNow: true, rows,
      }]
      : [],
  };
});

const FILLED = quadrantsWith({
  do: [row('d1', { quadrant: 'do' }), row('d2', { quadrant: 'do', isComplete: true })],
  plan: [row('p1', { quadrant: 'plan' })],
  delegate: [row('g1', { quadrant: 'delegate', agentState: 'ready' })],
  automate: [row('a1', { quadrant: 'automate', rule: 'every day' })],
});

const render = (props = {}) => {
  const events = [];
  const vm = new Vue({
    render(h) {
      return h(PriorityBoard, {
        props: { shell: 'phone', quadrants: FILLED, triage: [], ...props },
        on: {
          select: (p) => events.push(['select', p]),
          assign: (p) => events.push(['assign', p]),
          skip: (p) => events.push(['skip', p]),
          toggle: (p) => events.push(['toggle', p]),
          action: (p) => events.push(['action', p]),
          open: (p) => events.push(['open', p]),
        },
      });
    },
  }).$mount();
  return {
    vm, board: vm.$children[0], el: vm.$el, events,
  };
};

const testid = (el, id) => el.querySelector(`[data-testid="${id}"]`);
const flush = () => Vue.nextTick();

describe('OrganismPriorityBoard — phone: the map is navigation', () => {
  it('draws the 2x2 map and exactly ONE list card', async () => {
    const { el } = render({ shell: 'phone' });
    expect(testid(el, 'priority-map')).not.toBeNull();
    expect(el.querySelectorAll('.rn-ptile')).toHaveLength(4);
    expect(el.querySelectorAll('[data-testid="priority-selected-card"]')).toHaveLength(1);
    // The four simultaneous quadrant cards are a wide-shell thing only.
    expect(el.querySelectorAll('.rn-pquad')).toHaveLength(0);
  });

  it('opens on DO and shows only DO rows', () => {
    const { el } = render({ shell: 'phone' });
    expect(testid(el, 'priority-selected-card').textContent).toContain('Do now');
    expect(testid(el, 'priority-row-d1')).not.toBeNull();
    expect(testid(el, 'priority-row-p1')).toBeNull();
  });

  it('swaps the list below when a tile is tapped', async () => {
    const { el, events } = render({ shell: 'phone' });
    testid(el, 'priority-tile-delegate').click();
    await flush();
    expect(events).toEqual([['select', 'delegate']]);
    expect(testid(el, 'priority-selected-card').textContent).toContain('Delegate');
    expect(testid(el, 'priority-row-g1')).not.toBeNull();
    expect(testid(el, 'priority-row-d1')).toBeNull();
  });

  it('rings and tints only the selected tile', async () => {
    const { el } = render({ shell: 'phone' });
    const style = (key) => testid(el, `priority-tile-${key}`).getAttribute('style');
    expect(style('do')).toContain('2px');
    expect(style('plan')).toContain('0px');
    testid(el, 'priority-tile-plan').click();
    await flush();
    expect(style('do')).toContain('0px');
    expect(style('plan')).toContain('2px');
  });

  it('re-tapping the selected tile is not a change', () => {
    const { el, events } = render({ shell: 'phone' });
    testid(el, 'priority-tile-do').click();
    expect(events).toEqual([]);
  });

  it('counts open and done per tile', () => {
    const { el } = render({ shell: 'phone' });
    const tile = testid(el, 'priority-tile-do');
    expect(tile.querySelector('[data-testid="priority-tile-open"]').textContent.trim()).toBe('1');
    expect(tile.textContent).toContain('1 done');
  });
});

describe('OrganismPriorityBoard — tablet / desktop: all four at once', () => {
  ['tablet', 'desktop'].forEach((shell) => {
    it(`renders four quadrant cards and no map on ${shell}`, () => {
      const { el } = render({ shell });
      expect(el.querySelectorAll('.rn-pquad')).toHaveLength(4);
      QUADRANTS.forEach((q) => {
        expect(testid(el, `priority-quadrant-${q.key}`)).not.toBeNull();
      });
      expect(testid(el, 'priority-map')).toBeNull();
      expect(el.querySelectorAll('.rn-ptile')).toHaveLength(0);
      expect(testid(el, 'priority-selected-card')).toBeNull();
    });

    it(`shows every quadrant's rows simultaneously on ${shell}`, () => {
      const { el } = render({ shell });
      ['d1', 'p1', 'g1', 'a1'].forEach((id) => {
        expect(testid(el, `priority-row-${id}`)).not.toBeNull();
      });
    });
  });

  it('summarises the four totals in the side panel', () => {
    const { el } = render({ shell: 'tablet' });
    const totals = testid(el, 'priority-totals');
    expect(totals.textContent).toContain('TODAY · 4 OPEN');
    expect(totals.textContent).toContain('DELEGATE');
  });

  it('says the inbox is clear when nothing is waiting', () => {
    const { el } = render({ shell: 'tablet', triage: [] });
    expect(testid(el, 'priority-inbox-clear')).not.toBeNull();
    expect(testid(el, 'priority-triage')).toBeNull();
  });
});

describe('OrganismPriorityBoard — triage', () => {
  const TRIAGE = [
    { id: 'x1', body: 'Fix flaky CI test', meta: 'Start Work' },
    { id: 'x2', body: 'Renew passport', meta: 'No routine' },
  ];

  it('shows exactly one item, with a ghost behind it when more are queued', () => {
    const { el } = render({ triage: TRIAGE });
    expect(testid(el, 'priority-triage-body').textContent.trim()).toBe('Fix flaky CI test');
    expect(el.textContent).not.toContain('Renew passport');
    expect(testid(el, 'priority-triage-count').textContent.trim()).toBe('TRIAGE · 2 LEFT');
    expect(testid(el, 'priority-triage-ghost')).not.toBeNull();
  });

  it('drops the ghost for the last one', () => {
    const { el } = render({ triage: [TRIAGE[0]] });
    expect(testid(el, 'priority-triage-ghost')).toBeNull();
  });

  it('assigns the shown item to the tapped quadrant, flagged as triage', () => {
    const { el, events } = render({ triage: TRIAGE });
    testid(el, 'priority-triage-do').click();
    expect(events).toHaveLength(1);
    expect(events[0][0]).toBe('assign');
    expect(events[0][1]).toMatchObject({ quadrant: 'do', fromTriage: true });
    expect(events[0][1].item.id).toBe('x1');
  });

  it('offers all four quadrants', () => {
    const { el } = render({ triage: TRIAGE });
    QUADRANTS.forEach((q) => {
      expect(testid(el, `priority-triage-${q.key}`)).not.toBeNull();
    });
  });

  // Skip defers; it must never assign a quadrant.
  it('skips without assigning anything', () => {
    const { el, events } = render({ triage: TRIAGE });
    testid(el, 'priority-triage-skip').click();
    expect(events).toEqual([['skip', TRIAGE[0]]]);
  });

  it('bumps the tile the item landed in', async () => {
    const { el, board } = render({ triage: TRIAGE });
    testid(el, 'priority-triage-plan').click();
    await flush();
    expect(board.bump).toBe('plan');
    expect(testid(el, 'priority-tile-plan').getAttribute('style')).toContain('rn-bump');
  });
});

describe('OrganismPriorityBoard — the move picker', () => {
  it('opens from a row and names the item', async () => {
    const { el } = render();
    expect(testid(el, 'responsive-sheet')).toBeNull();
    testid(el, 'priority-move-d1').click();
    await flush();
    expect(testid(el, 'responsive-sheet')).not.toBeNull();
    expect(testid(el, 'priority-move-title').textContent.trim()).toBe('Task d1');
  });

  it('is a bottom sheet on the phone and a 480px dialog on desktop', async () => {
    const phone = render({ shell: 'phone' });
    testid(phone.el, 'priority-move-d1').click();
    await flush();
    expect(testid(phone.el, 'responsive-sheet').className).toContain('rn-rsheet--sheet');
    expect(testid(phone.el, 'responsive-sheet-handle')).not.toBeNull();

    const desktop = render({ shell: 'desktop' });
    testid(desktop.el, 'priority-move-d1').click();
    await flush();
    const sheet = testid(desktop.el, 'responsive-sheet');
    expect(sheet.className).toContain('rn-rsheet--dialog');
    expect(sheet.querySelector('.rn-rsheet__panel').getAttribute('style')).toContain('480px');
  });

  it('marks the quadrant the row is already in', async () => {
    const { el } = render();
    testid(el, 'priority-move-d1').click();
    await flush();
    expect(testid(el, 'priority-move-to-do').textContent).toContain('· current');
    expect(testid(el, 'priority-move-to-plan').textContent).not.toContain('· current');
  });

  it('moves on a different quadrant, closes, and is not flagged as triage', async () => {
    const { el, events } = render();
    testid(el, 'priority-move-d1').click();
    await flush();
    testid(el, 'priority-move-to-automate').click();
    await flush();
    expect(events).toHaveLength(1);
    expect(events[0][1]).toMatchObject({ quadrant: 'automate', fromTriage: false });
    expect(events[0][1].item.id).toBe('d1');
    expect(testid(el, 'responsive-sheet')).toBeNull();
  });

  // A move to where you already are is not a move and must not write.
  it('just closes when the current quadrant is picked', async () => {
    const { el, events } = render();
    testid(el, 'priority-move-d1').click();
    await flush();
    testid(el, 'priority-move-to-do').click();
    await flush();
    expect(events).toEqual([]);
    expect(testid(el, 'responsive-sheet')).toBeNull();
  });

  it('closes on the backdrop', async () => {
    const { el, events } = render();
    testid(el, 'priority-move-d1').click();
    await flush();
    testid(el, 'responsive-sheet-backdrop').click();
    await flush();
    expect(testid(el, 'responsive-sheet')).toBeNull();
    expect(events).toEqual([]);
  });

  // A centred dialog with no X can only be left by the backdrop.
  it('gives the desktop dialog a close button, and keeps the phone sheet to its handle', async () => {
    const desktop = render({ shell: 'desktop' });
    testid(desktop.el, 'priority-move-d1').click();
    await flush();
    testid(desktop.el, 'responsive-sheet-close').click();
    await flush();
    expect(testid(desktop.el, 'responsive-sheet')).toBeNull();
    expect(desktop.events).toEqual([]);

    const phone = render({ shell: 'phone' });
    testid(phone.el, 'priority-move-d1').click();
    await flush();
    expect(testid(phone.el, 'responsive-sheet-close')).toBeNull();
  });

  it('opens from a row inside any of the four wide-shell cards', async () => {
    const { el } = render({ shell: 'desktop' });
    testid(el, 'priority-move-a1').click();
    await flush();
    expect(testid(el, 'priority-move-title').textContent.trim()).toBe('Task a1');
  });
});

describe('OrganismPriorityBoard — row events bubble up', () => {
  it('forwards toggle, open and action from the phone list', () => {
    const { el, events } = render({ shell: 'phone' });
    testid(el, 'priority-toggle-d1').click();
    expect(events).toEqual([['toggle', expect.objectContaining({ id: 'd1' })]]);
  });

  it('forwards a chip press from a wide-shell card', () => {
    const { el, events } = render({ shell: 'tablet' });
    testid(el, 'priority-chip-g1').click();
    expect(events).toEqual([['action', expect.objectContaining({ type: 'hand-to-agent' })]]);
  });
});
