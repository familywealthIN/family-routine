/* eslint-env jest */
/**
 * RoutineDayPlan — the dial and the timeline.
 *
 * The rendering facts worth locking are the ones the geometry tests cannot see:
 *   1. the dial and the list are the SAME sorted derivation, so a routine moved
 *      in time re-sorts the rows and redraws the arcs together,
 *   2. a row opens the editor and an arc only selects — the per-row edit/delete
 *      icons of the old settings table are gone, which is a stated goal of the
 *      redesign,
 *   3. the "+ Add routine" row exists only on a long gap, and carries the
 *      midpoint minute it will open the editor at,
 *   4. the centre swaps between the day total and the selection,
 *   5. the clock timer is only installed when the marker actually follows the
 *      clock, and is cleared on destroy.
 */
const Vue = require('vue');

const RoutineDayPlan = require('./RoutineDayPlan.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const ITEMS = [
  {
    id: 'mp', name: 'Morning Pages', time: '06:30', points: 10, steps: [{ name: 'Coffee' }], tags: ['morning'],
  },
  {
    id: 'sw', name: 'Start Work', time: '09:00', points: 12, steps: [{ name: 'Calendar' }, { name: 'Top 3' }], tags: ['area:work'],
  },
  {
    id: 'lw', name: 'Lunch Walk', time: '12:30', points: 8, steps: [], tags: [],
  },
];

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(RoutineDayPlan, {
      props: {
        items: ITEMS, shell: 'phone', nowMinutes: 9 * 60 + 30, ...props,
      },
    }),
  }).$mount();
  return { vm, el: vm.$el, plan: vm.$children[0] };
};

const all = (el, testid) => Array.from(el.querySelectorAll(`[data-testid="${testid}"]`));
const q = (el, testid) => el.querySelector(`[data-testid="${testid}"]`);
const text = (node) => node.textContent.replace(/\s+/g, ' ').trim();
const tick = () => Vue.nextTick();

describe('the dial', () => {
  it('draws one arc per routine plus the background track', () => {
    const { el } = render();
    expect(all(el, 'day-dial-arc')).toHaveLength(3);
    expect(q(el, 'day-dial-svg').getAttribute('viewBox')).toBe('0 0 240 240');
  });

  it('sizes the dial and its centre inset per shell', () => {
    expect(render({ shell: 'phone' }).plan.dial).toEqual({ size: 240, inset: 52 });
    expect(render({ shell: 'tablet' }).plan.dial).toEqual({ size: 300, inset: 66 });
    expect(render({ shell: 'desktop' }).plan.dial).toEqual({ size: 360, inset: 79 });
  });

  it('paints the routine containing now orange', () => {
    const { el } = render();
    const colors = all(el, 'day-dial-arc').map((p) => p.getAttribute('stroke'));
    expect(colors).toEqual(['#288bd5', '#FF9800', '#288bd5']);
  });

  it('shows the day total until something is selected', () => {
    const { el } = render();
    expect(text(q(el, 'day-dial-centre'))).toBe('TODAY 30 points Now: Start Work');
  });

  it('shows the selected routine in the centre instead', () => {
    const { el } = render({ selectedId: 'lw' });
    expect(text(q(el, 'day-dial-centre'))).toBe('12:30 – 23:00 Lunch Walk +8 pts · 0 steps');
  });

  it('emits select — and only select — when an arc is clicked', () => {
    const { el, plan } = render();
    const events = [];
    plan.$on('select', (id) => events.push(['select', id]));
    plan.$on('open', (id) => events.push(['open', id]));
    all(el, 'day-dial-arc')[2].dispatchEvent(new Event('click'));
    expect(events).toEqual([['select', 'lw']]);
  });

  it('follows the local clock only when nowMinutes is not given', () => {
    const withFixed = render({ nowMinutes: 600 });
    expect(withFixed.plan.timer).toBe(null);

    const following = render({ nowMinutes: null });
    expect(following.plan.timer).not.toBe(null);
    following.vm.$destroy();
  });
});

describe('the timeline', () => {
  it('renders the rows in schedule order with their windows', () => {
    const { el } = render();
    const rows = all(el, 'day-row');
    expect(rows.map((r) => r.getAttribute('data-row'))).toEqual(['mp', 'sw', 'lw']);
    expect(text(rows[0])).toContain('06:30 – 09:00 · 2h 30m');
    expect(text(rows[2])).toContain('12:30 – 23:00 · 10h 30m');
  });

  it('re-sorts when a routine moves, and redraws the arcs with it', async () => {
    const vm = new Vue({
      data: { items: ITEMS },
      render(h) {
        return h(RoutineDayPlan, { props: { items: this.items, shell: 'phone', nowMinutes: 570 } });
      },
    }).$mount();

    expect(all(vm.$el, 'day-row').map((r) => r.getAttribute('data-row'))).toEqual(['mp', 'sw', 'lw']);
    const arcsBefore = all(vm.$el, 'day-dial-arc').map((p) => p.getAttribute('d'));

    vm.items = ITEMS.map((r) => (r.id === 'lw' ? { ...r, time: '07:00' } : r));
    await tick();

    expect(all(vm.$el, 'day-row').map((r) => r.getAttribute('data-row'))).toEqual(['mp', 'lw', 'sw']);
    const arcsAfter = all(vm.$el, 'day-dial-arc').map((p) => p.getAttribute('d'));
    expect(arcsAfter).not.toEqual(arcsBefore);
  });

  it('marks the current routine with "now" and the orange time', () => {
    const { el } = render();
    const rows = all(el, 'day-row');
    expect(text(rows[1])).toContain('· now');
    expect(text(rows[0])).not.toContain('· now');
  });

  it('shows a steps chip always, and agent/goal chips only when linked', () => {
    const { el } = render({
      agents: { sw: 'PR Summarizer' },
      goals: { sw: { body: 'Ship v2 of Routine Notes', pct: 67 } },
    });
    expect(all(el, 'day-chip-steps')).toHaveLength(3);
    expect(all(el, 'day-chip-agent')).toHaveLength(1);
    expect(text(all(el, 'day-chip-agent')[0])).toContain('PR Summarizer');
    expect(all(el, 'day-chip-goal')).toHaveLength(1);
    expect(text(all(el, 'day-chip-goal')[0])).toContain('Ship v2 of Routine Notes');
  });

  it('carries NO per-row edit or delete control — delete lives in the editor', () => {
    const { el } = render();
    expect(el.textContent).not.toMatch(/delete/i);
    expect(el.querySelector('[data-testid="day-row-delete"]')).toBe(null);
    expect(el.querySelector('[data-testid="day-row-edit"]')).toBe(null);
  });

  it('opens the editor when a row is clicked', () => {
    const { el, plan } = render();
    const opened = [];
    plan.$on('open', (id) => opened.push(id));
    all(el, 'day-row')[0].dispatchEvent(new Event('click'));
    expect(opened).toEqual(['mp']);
  });

  it('tints the just-saved row', () => {
    const { el } = render({ flashId: 'sw' });
    const rows = all(el, 'day-row');
    expect(rows[1].className).toContain('rn-day__row--flash');
    expect(rows[0].className).not.toContain('rn-day__row--flash');
  });

  it('highlights the selected row', () => {
    const { el } = render({ selectedId: 'mp' });
    expect(all(el, 'day-row')[0].className).toContain('rn-day__row--selected');
  });

  it('offers a "New routine" footer that emits new', () => {
    const { el, plan } = render();
    const fired = [];
    plan.$on('new', () => fired.push(true));
    q(el, 'day-new').dispatchEvent(new Event('click'));
    expect(fired).toEqual([true]);
  });

  // E2E BUG-5: before the first result the list is unknown, not empty.
  it('shows a loading line, not "No routines yet", until the list arrives', () => {
    const { el } = render({ items: [], loading: true });
    expect(q(el, 'day-loading')).not.toBe(null);
    expect(q(el, 'day-empty')).toBe(null);
    expect(text(q(el, 'day-dial-centre'))).not.toContain('0 points');
  });

  it('ignores a stale loading flag once rows exist', () => {
    const { el } = render({ loading: true });
    expect(q(el, 'day-loading')).toBe(null);
    expect(all(el, 'day-row')).toHaveLength(3);
  });

  it('pluralises the points pill', () => {
    const { el } = render({ items: [{ ...ITEMS[0], points: 1 }] });
    expect(text(q(el, 'day-row'))).toContain('+1 pt');
    expect(text(q(el, 'day-row'))).not.toContain('+1 pts');
  });

  it('says so when there is nothing scheduled', () => {
    const { el } = render({ items: [] });
    expect(q(el, 'day-empty')).not.toBe(null);
    expect(all(el, 'day-row')).toHaveLength(0);
    // The footer is still the way out of an empty list.
    expect(q(el, 'day-new')).not.toBe(null);
  });
});

describe('the inline "+ Add routine" row', () => {
  it('appears only on a gap of 3 hours or more', () => {
    const { el } = render();
    const gaps = all(el, 'day-gap');
    // 06:30 -> 09:00 is 2h30 and gets none; the other two are 3h30 and 10h30.
    expect(gaps.map((g) => g.getAttribute('data-gap'))).toEqual(['sw', 'lw']);
  });

  it('labels the gap midpoint rounded to 10 minutes, and the block length', () => {
    const { el } = render();
    expect(text(all(el, 'day-gap')[0])).toBe('add_circle_outline Add routine at 10:50 · 3h 30m block');
  });

  it('emits insert with the midpoint in minutes, not the row\'s own start', () => {
    const { el, plan } = render();
    const at = [];
    plan.$on('insert', (minutes) => at.push(minutes));
    all(el, 'day-gap')[0].dispatchEvent(new Event('click'));
    expect(at).toEqual([650]);
  });

  it('does not bubble the row\'s open event — the gap is its own target', () => {
    const { el, plan } = render();
    const opened = [];
    plan.$on('open', (id) => opened.push(id));
    all(el, 'day-gap')[0].dispatchEvent(new Event('click', { bubbles: true }));
    expect(opened).toEqual([]);
  });
});

describe('de-duplication', () => {
  it('renders a repeated routine id once', () => {
    const { el } = render({ items: [ITEMS[0], { ...ITEMS[0] }, ITEMS[1]] });
    expect(all(el, 'day-row').map((r) => r.getAttribute('data-row'))).toEqual(['mp', 'sw']);
  });
});
