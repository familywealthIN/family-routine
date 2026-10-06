/* eslint-env jest */
const Vue = require('vue');

const PullToRefresh = require('./PullToRefresh.vue').default;

Vue.config.productionTip = false;
Vue.config.devtools = false;

const mount = (props = {}) => {
  const events = [];
  const host = new Vue({
    render: (h) => h(PullToRefresh, {
      props,
      on: { refresh: () => events.push('refresh') },
    }, [h('div', { class: 'scroller' }, [h('p', { class: 'inner' }, 'content')])]),
  }).$mount();
  const vm = host.$children[0];
  return {
    vm, el: host.$el, events, inner: host.$el.querySelector('.inner'), scroller: host.$el.querySelector('.scroller'),
  };
};

const touch = (target, x, y) => ({ target, touches: [{ clientX: x, clientY: y }] });

const pull = (vm, target, dx, dy) => {
  vm.onTouchStart(touch(target, 0, 0));
  [0.25, 0.5, 1].forEach((f) => vm.onTouchMove(touch(target, dx * f, dy * f)));
};

describe('MoleculePullToRefresh', () => {
  it('emits refresh after a long enough pull from the top', () => {
    const { vm, inner, events } = mount();
    pull(vm, inner, 0, 300);
    expect(vm.armed).toBe(true);
    vm.onTouchEnd();
    expect(events).toEqual(['refresh']);
    expect(vm.pull).toBe(0);
  });

  it('does nothing for a short pull', () => {
    const { vm, inner, events } = mount();
    pull(vm, inner, 0, 60);
    expect(vm.armed).toBe(false);
    vm.onTouchEnd();
    expect(events).toEqual([]);
  });

  it('ignores a pull while the content under the finger is scrolled', () => {
    const {
      vm, inner, scroller, events,
    } = mount();
    scroller.scrollTop = 40;
    Object.defineProperty(scroller, 'scrollTop', { value: 40, configurable: true });
    pull(vm, inner, 0, 300);
    vm.onTouchEnd();
    expect(events).toEqual([]);
  });

  it('ignores a horizontal drag (the deck swipe) and an upward one', () => {
    const { vm, inner, events } = mount();
    pull(vm, inner, 300, 40);
    vm.onTouchEnd();
    pull(vm, inner, 0, -300);
    vm.onTouchEnd();
    expect(events).toEqual([]);
  });

  it('holds the indicator while the host is refreshing and blocks a second pull', () => {
    const { vm, inner, events } = mount({ refreshing: true });
    expect(vm.offset).toBeGreaterThan(0);
    pull(vm, inner, 0, 300);
    vm.onTouchEnd();
    expect(events).toEqual([]);
  });
});
