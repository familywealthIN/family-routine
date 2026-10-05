/* eslint-env jest */
const fs = require('fs');
const path = require('path');
const Vue = require('vue');

const RoutineFocusCard = require('./RoutineFocusCard.vue').default;

const SRC = fs.readFileSync(path.join(__dirname, 'RoutineFocusCard.vue'), 'utf8');
const CSS = (SRC.match(/<style>([\s\S]*)<\/style>/) || ['', ''])[1]
  .replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * The organism styles the card from a global `<style>` block, which vue-jest
 * does not inject into jsdom — so a size that lives in CSS rather than in an
 * inline `:style` has to be read off the source. Matches on the exact selector,
 * not a substring, so `__row` can never be satisfied by `__row-text`.
 */
const declOf = (selector, prop) => {
  const rules = CSS.match(/[^{}]+\{[^{}]*\}/g) || [];
  const matching = rules.filter((rule) => rule
    .split('{')[0]
    .split(',')
    .some((sel) => sel.trim() === selector));
  if (!matching.length) return null;
  const body = matching[matching.length - 1].split('{')[1];
  const hit = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`));
  return hit ? hit[1].trim() : null;
};

Vue.config.productionTip = false;
Vue.config.devtools = false;

const ROUTINE = {
  id: 'sw',
  name: 'Start Work',
  time: '09:00',
  points: 12,
  stimulus: 'G',
  ticked: false,
  passed: false,
  isCurrent: true,
  redeemable: false,
  buttonGlyph: 'more_horiz',
  buttonBg: '#f5f5f5',
  buttonFg: 'rgba(0,0,0,.87)',
};

const ITEMS = [
  { id: 'g1', body: 'Ship dashboard PR', isComplete: true },
  { id: 'g2', body: 'Reply to Ana', isComplete: false },
  { id: 'g3', body: 'Triage beta tickets', isComplete: false },
];

const render = (props = {}) => {
  const vm = new Vue({
    render: (h) => h(RoutineFocusCard, {
      props: {
        routine: ROUTINE,
        endTime: '12:30',
        statusLabel: 'In progress',
        statusColor: '#FF9800',
        leftLabel: '3h 00m left',
        elapsedPct: 16,
        items: ITEMS,
        doneCount: 1,
        totalCount: 3,
        ...props,
      },
    }),
  }).$mount();
  return { vm, el: vm.$el };
};

describe('OrganismRoutineFocusCard — Today tab', () => {
  it('shows the tick ring, the checklist and an Add task row', () => {
    const { el } = render();
    expect(el.querySelector('[data-testid="routine-focus-ring"]')).not.toBeNull();
    expect(el.querySelectorAll('.rn-focus-card__row')).toHaveLength(3);
    expect(el.querySelector('[data-testid="add-task-row"]')).not.toBeNull();
  });

  it('draws the ring from goal items done over total, not from the tick', () => {
    const { vm } = render();
    const card = vm.$children[0];
    // 1 of 3 done -> two thirds of the 263.9 circumference still to go.
    expect(card.ringOffset).toBeCloseTo(263.9 * (2 / 3), 1);
  });

  // The donut used to be a 6-unit stroke in a fixed 96 viewBox: 2.9px on the
  // ticked tablet ring, 7.5px on the phone, and the button overlapped its inner
  // edge. It is now drawn in the ring's own pixel space.
  describe('ring geometry is a clean, whole-pixel donut at every size', () => {
    const geom = (props) => {
      const { vm, el } = render(props);
      const card = vm.$children[0];
      const svg = el.querySelector('[data-testid="routine-focus-ring-svg"]');
      return { card, svg };
    };
    const cases = [
      ['phone', {}],
      ['tablet', {}],
      ['desktop', {}],
      ['tablet', { routine: { ...ROUTINE, ticked: true } }],
    ];
    cases.forEach(([variant, extra]) => {
      it(`${variant}${extra.routine ? ' (ticked)' : ''}`, () => {
        const { card, svg } = geom({ variant, ...extra });
        const px = card.ringPx;
        expect(svg.getAttribute('viewBox')).toBe(`0 0 ${px} ${px}`);
        const { stroke, r } = card.ringGeom;
        expect(Number.isInteger(stroke)).toBe(true);
        // Whole stroke inside the box…
        expect(r + stroke / 2).toBeCloseTo(px / 2, 5);
        // …and clear of the tick button by at least 2px.
        const buttonR = px / 2 - card.tickInset;
        expect(r - stroke / 2 - buttonR).toBeGreaterThanOrEqual(2);
      });
    });

    it('draws no progress arc (no stray round-cap dot) at 0%', () => {
      const { el } = render({ doneCount: 0, totalCount: 3 });
      expect(el.querySelector('.rn-focus-card__ring-progress')).toBeNull();
    });
  });

  it('collapses the checklist to one segment per item', () => {
    const { el } = render({ checklistOpen: false });
    expect(el.querySelectorAll('.rn-focus-card__row')).toHaveLength(0);
    expect(el.querySelectorAll('.rn-focus-card__segment')).toHaveLength(3);
  });

  it('strikes a completed row through and tints its box', () => {
    const { el } = render();
    const first = el.querySelectorAll('.rn-focus-card__row')[0];
    expect(first.querySelector('.rn-focus-card__box').textContent.trim()).toBe('check_box');
    expect(first.querySelector('.rn-focus-card__row-text').style.textDecoration)
      .toBe('line-through');
  });

  it('emits toggle-item from the box without also opening the item', () => {
    const { vm } = render();
    const card = vm.$children[0];
    const toggled = [];
    const opened = [];
    card.$on('toggle-item', (item) => toggled.push(item.id));
    card.$on('open-item', (item) => opened.push(item.id));
    vm.$el.querySelectorAll('.rn-focus-card__box')[1].click();
    expect(toggled).toEqual(['g2']);
    expect(opened).toEqual([]);
  });
});

describe('OrganismRoutineFocusCard — phone tick state', () => {
  // On the phone the ring and title fly to the header, so a ticked routine must
  // leave NEITHER behind in the card (the design's ringSm is 0 for phone).
  it('hides the ring and the title once ticked', () => {
    const { el } = render({ routine: { ...ROUTINE, ticked: true, buttonGlyph: 'check' } });
    expect(el.querySelector('[data-testid="routine-focus-ring"]')).toBeNull();
    expect(el.querySelector('.rn-focus-card__title')).toBeNull();
  });

  it('hides both while the ghost is still in flight', () => {
    const { el } = render({ flying: true });
    expect(el.querySelector('.rn-focus-card__title')).toBeNull();
    expect(el.querySelector('[data-testid="routine-focus-ring"]').style.visibility)
      .toBe('hidden');
  });
});

describe('OrganismRoutineFocusCard — tablet/desktop tick state', () => {
  it('shrinks the ring in place and steps the title down a size', () => {
    const { vm } = render({
      variant: 'desktop',
      routine: { ...ROUTINE, ticked: true, buttonGlyph: 'check' },
    });
    const card = vm.$children[0];
    expect(card.ringPx).toBe(46);
    expect(card.titleStyle.fontSize).toBe('20px');
    expect(vm.$el.querySelector('.rn-focus-card__title')).not.toBeNull();
  });

  // The handoff says iPad mini and desktop SHARE type sizes, and its desktop
  // frame renders the same `tbRingSize` tokens the tablet frame does. The mock's
  // larger `lgRingSize`/`lgTitleSize` pair is computed but never rendered; this
  // suite used to assert those dead values, which is how the oversized desktop
  // ring and heading passed review.
  it('keeps the full ring and title before the tick, matching tablet', () => {
    const desktop = render({ variant: 'desktop' }).vm.$children[0];
    const tablet = render({ variant: 'tablet' }).vm.$children[0];
    expect(desktop.ringPx).toBe(104);
    expect(desktop.titleStyle.fontSize).toBe('26px');
    expect(desktop.ringPx).toBe(tablet.ringPx);
    expect(desktop.titleStyle.fontSize).toBe(tablet.titleStyle.fontSize);
  });
});

describe('OrganismRoutineFocusCard — agent states', () => {
  const stageOf = (agentStage) => {
    const { vm, el } = render({ agentStage });
    return { card: vm.$children[0], el };
  };

  it('puts the agent glyph and two breathing rings on a running agent', () => {
    const { card, el } = stageOf('running');
    expect(card.tickGlyph).toBe('smart_toy');
    expect(el.querySelectorAll('.rn-focus-card__ring-breathe')).toHaveLength(2);
    expect(card.breatheOne).toContain('1800ms');
    expect(card.breatheTwo).toContain('900ms');
  });

  // A listening agent is only waiting, so a second ring would overstate it.
  it('gives a listening agent one slow ring', () => {
    const { card } = stageOf('listening');
    expect(card.tickGlyph).toBe('hearing');
    expect(card.breatheOne).toContain('2600ms');
    expect(card.breatheTwo).toBe('none');
  });

  it('speeds the rings up while the end event fires', () => {
    const { card } = stageOf('firing');
    expect(card.tickGlyph).toBe('bolt');
    expect(card.breatheOne).toContain('1000ms');
    expect(card.breatheTwo).toContain('500ms');
  });

  // No agent stage may disable the tick. `waiting` means the dispatch is queued
  // — a request in flight — and ARCHITECTURE § 3.7 forbids gating a control on
  // that (the `busy` prop was deleted from this screen for the same reason).
  // Only a domain reason (`buttonDisabled`) locks it. This suite previously
  // asserted the opposite and so locked the defect in.
  it('never disables the tick for an agent stage, whatever the stage', () => {
    ['waiting', 'running', 'listening', 'firing', 'finished', 'failed', 'none']
      .forEach((stage) => {
        expect(stageOf(stage).card.tickDisabled).toBe(false);
      });
  });

  it('still disables the tick for a domain reason', () => {
    const { vm } = render({ routine: { ...ROUTINE, buttonDisabled: true } });
    expect(vm.$children[0].tickDisabled).toBe(true);
  });

  // A finished agent is not a live one: no rings, and the routine's own glyph.
  it('leaves a finished agent static', () => {
    const { card, el } = stageOf('finished');
    expect(el.querySelectorAll('.rn-focus-card__ring-breathe')).toHaveLength(0);
    expect(card.tickGlyph).toBe('more_horiz');
  });
});

describe('OrganismRoutineFocusCard — cascade tabs', () => {
  const CASCADE = {
    title: 'Ship the dashboard',
    range: 'Week of 6 – 12 Sep',
    unitName: 'days',
    done: 4,
    threshold: 5,
    complete: false,
    statusLabel: 'Active',
    statusColor: '#FF9800',
    pct: 80,
    rule: 'Week auto-ticks after 5 day goals',
    cols: 7,
    units: [{
      label: 'Mon', sub: '7', state: 'done', icon: 'check_circle', color: '#4CAF50', fg: 'rgba(0,0,0,.75)', bg: 'transparent',
    }],
    linked: [],
    linkedLabel: 'Linked day goals',
  };

  it('replaces the ring and checklist with the cascade panel', () => {
    const { el } = render({ period: 'week', cascade: CASCADE });
    expect(el.querySelector('[data-testid="routine-focus-ring"]')).toBeNull();
    expect(el.querySelector('.rn-focus-card__checklist-head')).toBeNull();
    expect(el.querySelector('.rn-cascade')).not.toBeNull();
    expect(el.querySelector('.rn-focus-card__overline').textContent.trim())
      .toBe('week goal for');
  });

  it('says so rather than showing an empty grid when the period has no goal', () => {
    const { el } = render({ period: 'month', cascade: null });
    expect(el.querySelector('.rn-cascade')).toBeNull();
    expect(el.querySelector('.rn-cascade__empty').textContent)
      .toContain('No goal linked to this routine');
  });

  it('collapses the whole linked period behind its heading', async () => {
    const { el } = render({
      period: 'week',
      cascade: {
        ...CASCADE,
        linked: [
          {
            id: 'a', label: 'Mon', body: 'First', isComplete: true,
            detail: { period: 'Day goal', window: 'Mon, 7 Sep 2026', status: 'Done', tags: ['deep'] },
          },
          {
            id: 'b', label: 'Wed', body: 'Second', isComplete: false,
            detail: { period: 'Day goal', window: 'Wed, 9 Sep 2026', status: 'Open', tags: [] },
          },
        ],
      },
    });
    const toggle = el.querySelector('[data-testid="cascade-linked-toggle"]');
    expect(toggle.textContent).toContain('1/2 done');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelectorAll('[data-testid="cascade-linked"]')).toHaveLength(0);

    toggle.click();
    await Vue.nextTick();
    const rows = el.querySelectorAll('[data-testid="cascade-linked"]');
    expect(Array.from(rows).map((r) => r.querySelector('.rn-cascade__linked-body').textContent))
      .toEqual(['First', 'Second']);
    expect(rows[0].textContent).toContain('Done');
    // Rows themselves are plain — no per-item toggle.
    expect(rows[0].querySelector('button')).toBeNull();

    toggle.click();
    await Vue.nextTick();
    expect(el.querySelectorAll('[data-testid="cascade-linked"]')).toHaveLength(0);
  });

  it('emits set-period from the bottom tabs', () => {
    const { vm } = render();
    const card = vm.$children[0];
    const picked = [];
    card.$on('set-period', (p) => picked.push(p));
    vm.$el.querySelector('[data-testid="period-tab-year"]').click();
    expect(picked).toEqual(['year']);
  });
});

/**
 * Measured against the rendered screen, the card had drifted a whole type step
 * larger than the design on every shell: 50px/16px rows on tablet and desktop
 * (design 44/15), 56px/17px on the phone (design 42/15), a 28px checkbox glyph
 * (24), a 48px/15px/22px "Add task" row (38/14/24) and a square row with no
 * divider at all. Nothing in this suite pinned those numbers, which is how the
 * drift shipped — so they are pinned here, to the DESIGN values.
 */
describe('OrganismRoutineFocusCard — checklist row metrics', () => {
  const firstRow = (variant) => render({ variant }).el.querySelector('.rn-focus-card__row');

  it('gives tablet and desktop a 44px row with 15px body text', () => {
    ['tablet', 'desktop'].forEach((variant) => {
      const row = firstRow(variant);
      expect(row.style.minHeight).toBe('44px');
      expect(row.querySelector('.rn-focus-card__row-text').style.fontSize).toBe('15px');
    });
  });

  it('gives the phone a 42px row with 15px body text', () => {
    const row = firstRow('phone');
    expect(row.style.minHeight).toBe('42px');
    expect(row.querySelector('.rn-focus-card__row-text').style.fontSize).toBe('15px');
  });

  // The handoff gives tablet and desktop the same type; the phone checklist
  // happens to share the row size, so all three read 15px.
  it('keeps the row text identical across the three shells', () => {
    const size = (variant) => firstRow(variant)
      .querySelector('.rn-focus-card__row-text').style.fontSize;
    expect(size('desktop')).toBe(size('tablet'));
    expect(size('desktop')).toBe(size('phone'));
  });

  it('draws the checkbox glyph at 24px, not 28px', () => {
    expect(declOf('.rn-focus-card__box', 'font-size')).toBe('24px');
    expect(declOf('.rn-focus-card__box', 'min-width')).toBe('24px');
  });

  // A 24px glyph in a 9px vertical pad is a 42px touch target; the negative
  // margin is what stops it inflating the row past its design min-height.
  it('keeps the box touch target from inflating the row', () => {
    expect(declOf('.rn-focus-card__box', 'padding')).toBe('9px 0');
    expect(declOf('.rn-focus-card__box', 'margin')).toBe('-9px 0');
  });

  it('separates rows with a 1px border-top, not a border-bottom', () => {
    expect(declOf('.rn-focus-card__row', 'border-top')).toBe('1px solid rgba(0, 0, 0, .06)');
    expect(declOf('.rn-focus-card__row', 'border-bottom')).toBeNull();
  });

  it('rounds the row to 8px on tablet and desktop', () => {
    expect(declOf('.rn-focus-card--desktop .rn-focus-card__row', 'border-radius')).toBe('8px');
  });

  it('draws Add task as a 38px row with a 14px label and a 24px glyph', () => {
    expect(declOf('.rn-focus-card__add', 'min-height')).toBe('38px');
    expect(declOf('.rn-focus-card__add', 'font-size')).toBe('14px');
    expect(declOf('.rn-focus-card__add', 'border-top')).toBe('1px solid rgba(0, 0, 0, .06)');
    expect(declOf('.rn-focus-card__add-icon', 'font-size')).toBe('24px');
  });
});

/**
 * In-card type. The desktop/tablet frames run 1px larger than the phone on the
 * status line and the View result link; the built card used the phone sizes on
 * every shell.
 */
describe('OrganismRoutineFocusCard — in-card type per shell', () => {
  it('steps the status line and result link up on tablet and desktop', () => {
    expect(declOf('.rn-focus-card--desktop .rn-focus-card__status-label', 'font-size')).toBe('12px');
    expect(declOf('.rn-focus-card--desktop .rn-focus-card__result', 'font-size')).toBe('13px');
  });

  it('leaves the phone on its own smaller set', () => {
    expect(declOf('.rn-focus-card__status-label', 'font-size')).toBe('11px');
    expect(declOf('.rn-focus-card__result', 'font-size')).toBe('12px');
  });

  it('gives tablet and desktop the same sizes as each other', () => {
    ['status-label', 'result'].forEach((part) => {
      expect(declOf(`.rn-focus-card--tablet .rn-focus-card__${part}`, 'font-size'))
        .toBe(declOf(`.rn-focus-card--desktop .rn-focus-card__${part}`, 'font-size'));
    });
  });
});

describe('OrganismRoutineFocusCard — in-card tab bar', () => {
  const barHeight = (variant) => render({ variant }).el
    .querySelector('.rn-focus-card__tabs').style.height;

  // The phone bar was built 44px tall with 11px labels; the design is 40/10.
  it('is 40px tall with 10px labels on the phone', () => {
    expect(barHeight('phone')).toBe('40px');
    expect(declOf('.rn-focus-card__tab-label', 'font-size')).toBe('10px');
  });

  it('stays 46px with 11px labels on tablet and desktop', () => {
    expect(barHeight('tablet')).toBe('46px');
    expect(barHeight('desktop')).toBe('46px');
    expect(declOf('.rn-focus-card--desktop .rn-focus-card__tab-label', 'font-size')).toBe('11px');
  });

  /*
   * Full-bleed, and now full-bleed for free: the tabs sit OUTSIDE the padded
   * `__body`, so there is no horizontal padding left for them to cancel. The
   * negative margins they used to carry (-16 phone / -20 tablet / -24 desktop)
   * are gone with the padding — and desktop's -24 against a 20px pad was losing
   * 4px of the bar a side to the card's `overflow: hidden`.
   */
  it('reaches the card edge without pulling itself sideways', () => {
    expect(declOf('.rn-focus-card__tabs', 'margin')).toBe('2px 0 -16px');
    ['tablet', 'desktop'].forEach((variant) => {
      expect(declOf(`.rn-focus-card--${variant} .rn-focus-card__tabs`, 'margin'))
        .toBe('2px 0 0');
    });
    expect(CSS).not.toMatch(/margin:\s*2px\s+-\d/);
  });
});

/**
 * The flex-basis defect. On tablet and desktop the card is a `flex: 3 1 0` item
 * of `.rn-home__content`, and a `box-sizing: border-box` flex item's base size
 * cannot resolve below its own padding — so 40px of horizontal padding on the
 * card floored it at 40, the card took that off the top, and the 3:2 split
 * applied only to what was left (563.2/348.8 instead of 547.2/364.8 at the
 * 980px column). The design frames keep the flex item bare and put
 * `padding:16px 20px 0` on an inner child; so does this card now.
 */
describe('OrganismRoutineFocusCard — who owns the horizontal padding', () => {
  const card = (variant) => render({ variant }).el;

  it('gives the card vertical padding only', () => {
    expect(card('desktop').style.padding).toBe('16px 0px 0px');
    expect(card('tablet').style.padding).toBe('16px 0px 0px');
    // The phone card is not a flex item, and its bottom padding is what the
    // tab bar's -16px margin cancels, so it keeps its own vertical values.
    expect(card('phone').style.padding).toBe('14px 0px 16px');
  });

  it('puts the horizontal inset on the inner body instead', () => {
    const body = (variant) => card(variant).querySelector('.rn-focus-card__body');
    ['tablet', 'desktop'].forEach((variant) => {
      expect(body(variant).style.paddingLeft).toBe('20px');
      expect(body(variant).style.paddingRight).toBe('20px');
    });
    expect(body('phone').style.paddingLeft).toBe('16px');
    expect(body('phone').style.paddingRight).toBe('16px');
  });

  it('keeps the body a scrolling flex column, so the layout is unchanged', () => {
    expect(declOf('.rn-focus-card__body', 'display')).toBe('flex');
    expect(declOf('.rn-focus-card__body', 'flex-direction')).toBe('column');
    expect(declOf('.rn-focus-card__body', 'flex')).toBe('1 1 auto');
    expect(declOf('.rn-focus-card__body', 'min-height')).toBe('0');
  });

  it('leaves the tab bar outside the padded body', () => {
    const el = card('desktop');
    expect(el.querySelector('.rn-focus-card__body .rn-focus-card__tabs')).toBeNull();
    const kids = Array.prototype.map.call(el.children, (node) => node.className);
    expect(kids).toEqual(['rn-focus-card__body', 'rn-focus-card__tabs']);
  });
});

describe('OrganismRoutineFocusCard — status row', () => {
  // A narrow phone card used to clip the whole line, time range included.
  it('keeps the time range in its own non-shrinking span', () => {
    const { el } = render({ statusLabel: 'Missed · redeem with points' });
    expect(el.querySelector('.rn-focus-card__status-text').textContent.trim())
      .toBe('Missed · redeem with points');
    expect(el.querySelector('.rn-focus-card__status-time').textContent.replace(/\s+/g, ' ').trim())
      .toBe('· 09:00 – 12:30');
  });

  it('switching tabs scrolls the card content back to the top', async () => {
    const host = new Vue({
      data: () => ({ period: 'day' }),
      render(h) {
        return h(RoutineFocusCard, {
          props: {
            routine: ROUTINE, items: ITEMS, period: this.period, variant: 'desktop',
          },
        });
      },
    }).$mount();
    const card = host.$children[0];
    card.$refs.scroller.scrollTop = 240;
    host.period = 'week';
    await Vue.nextTick();
    await Vue.nextTick();
    expect(card.$refs.scroller.scrollTop).toBe(0);
  });

  it('a refetch of the same items does not drag a switched tab to the bottom', async () => {
    jest.useFakeTimers();
    const host = new Vue({
      data: () => ({ period: 'day', items: ITEMS }),
      render(h) {
        return h(RoutineFocusCard, {
          props: {
            routine: ROUTINE, items: this.items, period: this.period, variant: 'desktop',
          },
        });
      },
    }).$mount();
    const card = host.$children[0];
    const scrolled = jest.spyOn(card, 'scrollToBottom');
    host.period = 'week';
    host.items = ITEMS.map((item) => ({ ...item }));
    await Vue.nextTick();
    jest.runAllTimers();
    expect(scrolled).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('counts the subtasks actually ticked, even under a completed item', () => {
    const { el } = render({
      items: [{
        id: 'g1', body: 'Some Task', isComplete: true, subDone: 2, subTotal: 3,
      }],
    });
    expect(el.querySelector('[data-testid="checklist-subtasks"]').textContent.trim())
      .toBe('2/3 subtasks');
  });

  it('offers Back to now beside the time left only when asked, and emits it', () => {
    expect(render().el.querySelector('[data-testid="focus-card-back-to-now"]')).toBeNull();
    const { vm, el } = render({ variant: 'desktop', showBackToNow: true });
    const back = el.querySelector('[data-testid="focus-card-back-to-now"]');
    expect(back.textContent.trim()).toBe('Back to now');
    expect(back.parentNode.querySelector('.rn-focus-card__status-left').textContent).toBe('3h 00m left');
    let fired = 0;
    vm.$children[0].$on('back-to-now', () => { fired += 1; });
    back.click();
    expect(fired).toBe(1);
  });

  // The owner removed the "Geniuses +16 · 06:00 – 06:00 · Ticked →" line: the
  // status row already carries the window. Only the View result link remains.
  it('draws no stimulus pill or time-window line under the title', () => {
    ['phone', 'tablet', 'desktop'].forEach((variant) => {
      const { el } = render({ variant });
      expect(el.querySelector('.rn-focus-card__stim')).toBeNull();
      expect(el.querySelector('.rn-focus-card__window')).toBeNull();
      expect(el.querySelector('.rn-focus-card__meta')).toBeNull();
    });
  });

  it('keeps the View result link when the agent has a result, and emits it', () => {
    const { vm, el } = render({ showResultLink: true });
    const link = el.querySelector('[data-testid="focus-card-result-link"]');
    expect(link.textContent.trim()).toBe('View result');
    let fired = 0;
    vm.$children[0].$on('open-result', () => { fired += 1; });
    link.click();
    expect(fired).toBe(1);
  });
});

describe('OrganismRoutineFocusCard — checklist accordion keeps the scroll', () => {
  // Collapsing removes the rows above the thread, so a small scroll clamps to 0;
  // expanding must put the user back where they were, not at the top.
  const mountCard = () => {
    const state = Vue.observable({ open: true });
    const host = new Vue({
      render: (h) => h(RoutineFocusCard, {
        props: {
          routine: ROUTINE,
          items: [{ id: 'a', body: 'One', isComplete: false }],
          checklistOpen: state.open,
        },
        on: { 'toggle-checklist': () => { state.open = !state.open; } },
      }),
    }).$mount();
    const card = host.$children[0];
    return { card, scroller: card.$refs.scroller };
  };

  it('restores the pre-collapse scroll position on expand', async () => {
    const { card, scroller } = mountCard();
    scroller.scrollTop = 120;
    card.onChecklistHead(); // collapse
    await Vue.nextTick();
    await Vue.nextTick();
    scroller.scrollTop = 0; // what the browser does to a small scroll
    card.collapseScroll.after = 0;
    card.onChecklistHead(); // expand
    await Vue.nextTick();
    await Vue.nextTick();
    expect(scroller.scrollTop).toBe(120);
  });

  it('leaves a position the user scrolled to while collapsed alone', async () => {
    const { card, scroller } = mountCard();
    scroller.scrollTop = 120;
    card.onChecklistHead();
    await Vue.nextTick();
    await Vue.nextTick();
    card.collapseScroll.after = 0;
    scroller.scrollTop = 300; // scrolled the chat while collapsed
    card.onChecklistHead();
    await Vue.nextTick();
    await Vue.nextTick();
    expect(scroller.scrollTop).toBe(300);
  });
});

describe('OrganismRoutineFocusCard — tick glyph proportion', () => {
  const glyphPx = (props) => {
    const { el } = render(props);
    return parseFloat(el.querySelector('[data-testid="routine-tick-button"] .rn-mi').style.fontSize);
  };

  it('keeps the phone size (32px in a 100px button)', () => {
    expect(glyphPx({ variant: 'phone' })).toBe(32);
  });

  it('scales tablet/desktop to the phone proportion instead of 38px', () => {
    // 104 ring − 2×11 inset = 82px button → 82 × .32 ≈ 26px.
    expect(glyphPx({ variant: 'tablet' })).toBe(26);
    expect(glyphPx({ variant: 'desktop' })).toBe(26);
  });

  it('shrinks with the ticked tablet ring', () => {
    // 46 ring − 2×5 inset = 36px button at the phone's ticked-check ratio
    // (20/34) → 21px, not the 38px token.
    expect(glyphPx({ variant: 'tablet', routine: { ...ROUTINE, ticked: true } })).toBe(21);
  });
});
