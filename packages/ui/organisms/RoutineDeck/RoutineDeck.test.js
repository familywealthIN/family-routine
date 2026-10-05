/* eslint-env jest */
const Vue = require('vue');

const RoutineDeck = require('./RoutineDeck.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = (props = {}) => {
  const events = [];
  const host = new Vue({
    render: (h) => h(RoutineDeck, {
      props: {
        hasPrev: true, hasNext: true, ...props,
      },
      on: {
        next: () => events.push('next'),
        prev: () => events.push('prev'),
      },
    }, [h('div', { class: 'card-content' }, 'card')]),
  }).$mount();
  const vm = host.$children[0];
  return { vm, el: host.$el, events };
};

const pointer = (x, y) => ({
  pointerId: 1,
  isPrimary: true,
  button: 0,
  clientX: x,
  clientY: y,
  cancelable: true,
  preventDefault: () => {},
});

/** Drive a drag from (0,0) to (dx,dy) in a few steps. */
const drag = (vm, dx, dy = 0) => {
  vm.onPointerDown(pointer(0, 0));
  [0.25, 0.5, 1].forEach((f) => vm.onPointerMove(pointer(dx * f, dy * f)));
};

describe('OrganismRoutineDeck', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('has no prev/next buttons — swiping is the switch', () => {
    const { el } = mount();
    expect(el.querySelector('[data-testid="deck-prev"]')).toBeNull();
    expect(el.querySelector('[data-testid="deck-next"]')).toBeNull();
  });

  // The owner removed the "N OF M TICKED" bar; Back to now lives in the card.
  it('draws no header bar, counter or Back to now of its own', () => {
    const { el } = mount();
    expect(el.querySelector('.rn-deck__head')).toBeNull();
    expect(el.querySelector('.rn-deck__counter-text')).toBeNull();
    expect(el.querySelector('[data-testid="deck-back-to-now"]')).toBeNull();
  });

  it('lifts the card (deeper stack shadow) only while it is moving', () => {
    const { vm, el } = mount();
    const card = el.querySelector('[data-testid="deck-card"]');
    expect(card.classList.contains('rn-deck__card--moving')).toBe(false);
    drag(vm, -60);
    return Vue.nextTick().then(() => {
      expect(card.classList.contains('rn-deck__card--moving')).toBe(true);
      expect(vm.cardStyle.transition).toContain('box-shadow');
    });
  });

  it('moves the card with a horizontal drag', () => {
    const { vm } = mount();
    drag(vm, -60);
    expect(vm.phase).toBe('drag');
    expect(vm.dragX).toBe(-60);
    expect(vm.cardStyle.transform).toContain('translateX(-60px)');
  });

  it('swipe left past the threshold commits to the next routine', () => {
    const { vm, events } = mount();
    drag(vm, -150);
    vm.onPointerUp(pointer(-150, 0));
    expect(vm.phase).toBe('out');
    jest.advanceTimersByTime(250);
    expect(events).toEqual(['next']);
  });

  it('swipe right commits to the previous routine', () => {
    const { vm, events } = mount();
    drag(vm, 150);
    vm.onPointerUp(pointer(150, 0));
    jest.advanceTimersByTime(250);
    expect(events).toEqual(['prev']);
  });

  it('snaps back short of the threshold', () => {
    const { vm, events } = mount();
    vm.width = 400;
    vm.onPointerDown(pointer(0, 0));
    // Slow, short drag: no flick, under the threshold.
    vm.onPointerMove(pointer(-20, 0));
    vm.gesture.lastT -= 1000;
    vm.onPointerMove(pointer(-40, 0));
    vm.onPointerUp(pointer(-40, 0));
    expect(vm.phase).toBe('snap');
    expect(vm.dragX).toBe(0);
    jest.advanceTimersByTime(400);
    expect(events).toEqual([]);
  });

  it('resists and snaps back at the end of the list', () => {
    const { vm, events } = mount({ hasNext: false });
    drag(vm, -150);
    expect(vm.dragX).toBeCloseTo(-45);
    vm.onPointerUp(pointer(-150, 0));
    jest.advanceTimersByTime(400);
    expect(events).toEqual([]);
  });

  it('leaves a vertical drag to the scroller', () => {
    const { vm } = mount();
    drag(vm, 4, 80);
    expect(vm.phase).toBe('idle');
    expect(vm.dragX).toBe(0);
  });

  it('swallows the click that ends a drag', () => {
    const { vm } = mount();
    drag(vm, -150);
    vm.onPointerUp(pointer(-150, 0));
    const click = { stopPropagation: jest.fn(), preventDefault: jest.fn() };
    vm.onClickCapture(click);
    expect(click.stopPropagation).toHaveBeenCalled();
    // A later plain tap is not swallowed.
    vm.onPointerDown(pointer(0, 0));
    const tap = { stopPropagation: jest.fn(), preventDefault: jest.fn() };
    vm.onClickCapture(tap);
    expect(tap.stopPropagation).not.toHaveBeenCalled();
  });
});
