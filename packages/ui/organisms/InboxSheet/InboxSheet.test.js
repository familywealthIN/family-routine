/* eslint-env jest */
/**
 * InboxSheet — where a task with no routine goes.
 *
 * Two ways out, both pinned: "Do now" drops it on the current routine in one tap,
 * "Move to routine" expands every routine. The empty state matters as much —
 * "Inbox zero" is the normal condition, so it has to read as success rather than
 * as an empty list.
 */
const Vue = require('vue');

const InboxSheet = require('./InboxSheet.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const ITEMS = [
  { id: 'i1', body: 'Renew passport', meta: 'Added Thu 09:12' },
  { id: 'i2', body: 'Call the plumber', meta: '' },
];

const ROUTINES = [
  { id: 'mp', name: 'Morning Pages', time: '06:30' },
  { id: 'sw', name: 'Start Work', time: '09:00' },
];

const render = (props = {}) => {
  const vm = new Vue({
    render(h) {
      return h(InboxSheet, {
        props: {
          open: true,
          items: ITEMS,
          currentRoutine: ROUTINES[1],
          routines: ROUTINES,
          ...props,
        },
      });
    },
  }).$mount();
  const sheet = vm.$children[0];
  const events = {
    close: [], add: [], 'do-now': [], move: [], remove: [],
  };
  Object.keys(events).forEach((name) => {
    sheet.$on(name, (payload) => events[name].push(payload));
  });
  return { vm, el: vm.$el, sheet, events };
};

const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);
const all = (el, testid) => Array.from(el.querySelectorAll(`[data-testid="${testid}"]`));

describe('InboxSheet — the list', () => {
  it('counts what is waiting', () => {
    const { el } = render();
    expect(all(el, 'inbox-row')).toHaveLength(2);
    expect(q(el, 'inbox-sub').textContent).toBe('2 tasks without a routine');
  });

  it('says "1 task" for one', () => {
    const { el } = render({ items: [ITEMS[0]] });
    expect(q(el, 'inbox-sub').textContent).toBe('1 task without a routine');
  });

  it('falls back to a meta line when the item has none', () => {
    const { el } = render();
    const rows = all(el, 'inbox-row');
    expect(rows[0].textContent).toContain('Added Thu 09:12');
    expect(rows[1].textContent).toContain('No routine yet');
  });

  it('drops a duplicated id', () => {
    const { el } = render({ items: [...ITEMS, ITEMS[0]] });
    expect(all(el, 'inbox-row')).toHaveLength(2);
  });
});

describe('InboxSheet — Inbox zero', () => {
  it('reads as success, not as an empty list', () => {
    const { el } = render({ items: [] });
    expect(q(el, 'inbox-empty').textContent).toContain('Inbox zero');
    expect(q(el, 'inbox-empty').textContent).toContain('Tasks without a routine land here.');
    expect(q(el, 'inbox-sub').textContent).toBe('All sorted');
    expect(all(el, 'inbox-row')).toHaveLength(0);
  });

  it('still offers the quick-add', () => {
    const { el } = render({ items: [] });
    expect(q(el, 'inbox-add-input')).toBeTruthy();
  });
});

describe('InboxSheet — routing out', () => {
  it('Do now names the current routine and emits the item', () => {
    const { el, events } = render();
    const button = all(el, 'inbox-do-now')[0];
    expect(button.textContent).toContain('Do now · Start Work');
    button.click();
    expect(events['do-now']).toEqual([ITEMS[0]]);
  });

  it('hides Do now when the clock has no current routine', () => {
    const { el } = render({ currentRoutine: null });
    expect(all(el, 'inbox-do-now')).toHaveLength(0);
  });

  it('Move to routine expands every routine, then moves', async () => {
    const { el, events } = render();
    expect(q(el, 'inbox-targets')).toBeNull();

    all(el, 'inbox-move')[0].click();
    await Vue.nextTick();
    const targets = q(el, 'inbox-targets');
    expect(targets).toBeTruthy();
    expect(targets.textContent).toContain('Morning Pages');
    expect(targets.textContent).toContain('Start Work');

    q(el, 'inbox-target-mp').click();
    expect(events.move).toEqual([{ item: ITEMS[0], routine: ROUTINES[0] }]);
  });

  it('only one row expands at a time, and tapping again collapses it', async () => {
    const { el, sheet } = render();
    all(el, 'inbox-move')[0].click();
    expect(sheet.moving).toBe('i1');
    all(el, 'inbox-move')[1].click();
    expect(sheet.moving).toBe('i2');
    all(el, 'inbox-move')[1].click();
    expect(sheet.moving).toBeNull();
  });

  it('emits remove from the delete icon', () => {
    const { el, events } = render();
    all(el, 'inbox-delete')[1].click();
    expect(events.remove).toEqual([ITEMS[1]]);
  });
});

describe('InboxSheet — quick add', () => {
  it('Enter emits the trimmed body and clears the draft', () => {
    const { el, sheet, events } = render();
    const input = q(el, 'inbox-add-input');
    input.value = '  Buy a gift  ';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(events.add).toEqual(['Buy a gift']);
    expect(sheet.draft).toBe('');
  });

  it('the Add button appears only once something is typed', async () => {
    const { el } = render();
    expect(q(el, 'inbox-add-btn')).toBeNull();
    const input = q(el, 'inbox-add-input');
    input.value = 'Buy a gift';
    input.dispatchEvent(new Event('input'));
    await Vue.nextTick();
    expect(q(el, 'inbox-add-btn')).toBeTruthy();
  });

  it('an empty Enter does nothing', () => {
    const { el, events } = render();
    q(el, 'inbox-add-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(events.add).toEqual([]);
  });

  it('closing clears the draft and any expanded row', async () => {
    const host = new Vue({
      data: () => ({ open: true }),
      render(h) {
        return h(InboxSheet, {
          props: { open: this.open, items: ITEMS, routines: ROUTINES },
        });
      },
    }).$mount();
    const sheet = host.$children[0];
    sheet.draft = 'half typed';
    sheet.moving = 'i1';
    host.open = false;
    await Vue.nextTick();
    expect(sheet.draft).toBe('');
    expect(sheet.moving).toBeNull();
  });
});

describe('InboxSheet — pending items (the pre-redesign Inbox)', () => {
  const PENDING = [
    { id: 'pending:m1', mottoId: 'm1', body: 'Fix the bike', meta: 'Pending · not planned yet' },
  ];

  it('lists pending items in their own section after today’s items', () => {
    const { el } = render({ pending: PENDING });
    expect(all(el, 'inbox-row')).toHaveLength(2);
    expect(all(el, 'inbox-pending-row')).toHaveLength(1);
    expect(q(el, 'inbox-section-today').textContent).toBe('Today');
    expect(q(el, 'inbox-section-pending').textContent).toBe('Pending');
    expect(q(el, 'inbox-sub').textContent).toBe('3 tasks without a routine');
  });

  it('needs no "Today" label when only pending items exist, and is not Inbox zero', () => {
    const { el } = render({ items: [], pending: PENDING });
    expect(q(el, 'inbox-section-today')).toBeNull();
    expect(q(el, 'inbox-section-pending')).toBeTruthy();
    expect(q(el, 'inbox-empty')).toBeNull();
    expect(q(el, 'inbox-pending-row').textContent).toContain('Fix the bike');
  });

  it('routes a pending row out with its kind, so the container can tell them apart', async () => {
    const { el, events } = render({ items: [], pending: PENDING });
    q(el, 'inbox-do-now').click();
    expect(events['do-now'][0]).toMatchObject({ mottoId: 'm1', kind: 'pending' });
    q(el, 'inbox-delete').click();
    expect(events.remove[0]).toMatchObject({ mottoId: 'm1', kind: 'pending' });
    q(el, 'inbox-move').click();
    await Vue.nextTick();
    q(el, 'inbox-target-sw').click();
    expect(events.move[0]).toMatchObject({
      item: { mottoId: 'm1', kind: 'pending' },
      routine: ROUTINES[1],
    });
  });
});
