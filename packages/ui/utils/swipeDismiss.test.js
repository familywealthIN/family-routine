import { swipeDismiss, uninstallSwipeDismiss } from './swipeDismiss';

function touch(target, type, x, y) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const touches = type === 'touchend' ? [] : [{ clientX: x, clientY: y }];
  Object.defineProperty(event, 'touches', { value: touches });
  target.dispatchEvent(event);
  return event;
}

function mountPanel({ disabled = false } = {}) {
  const panel = document.createElement('section');
  const body = document.createElement('div');
  const item = document.createElement('div');
  body.appendChild(item);
  panel.appendChild(body);
  document.body.appendChild(panel);
  Object.defineProperty(panel, 'offsetHeight', { value: 400 });
  const handler = jest.fn();
  swipeDismiss.bind(panel, { value: { handler, disabled } });
  return {
    panel, body, item, handler,
  };
}

describe('swipeDismiss', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    uninstallSwipeDismiss();
    jest.useRealTimers();
  });

  it('dismisses after a long enough downward drag and follows the finger', () => {
    const { panel, item, handler } = mountPanel();
    touch(item, 'touchstart', 100, 100);
    const move = touch(item, 'touchmove', 102, 300);
    expect(move.defaultPrevented).toBe(true);
    expect(panel.style.transform).toBe('translateY(200px)');
    touch(item, 'touchend');
    jest.advanceTimersByTime(250);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('snaps back on a short drag', () => {
    const { panel, item, handler } = mountPanel();
    touch(item, 'touchstart', 100, 100);
    touch(item, 'touchmove', 100, 130);
    touch(item, 'touchend');
    jest.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
    expect(panel.style.transform).toBe('');
  });

  it('leaves an upward drag (a scroll) alone', () => {
    const { panel, item, handler } = mountPanel();
    touch(item, 'touchstart', 100, 300);
    const move = touch(item, 'touchmove', 100, 100);
    expect(move.defaultPrevented).toBe(false);
    touch(item, 'touchend');
    jest.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
    expect(panel.style.transform).toBe('');
  });

  it('does not start while the content under the finger is scrolled down', () => {
    const { body, item, handler } = mountPanel();
    Object.defineProperty(body, 'scrollTop', { value: 50 });
    touch(item, 'touchstart', 100, 100);
    const move = touch(item, 'touchmove', 100, 400);
    expect(move.defaultPrevented).toBe(false);
    touch(item, 'touchend');
    jest.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores drags that start in a text field', () => {
    const { panel, handler } = mountPanel();
    const input = document.createElement('textarea');
    panel.appendChild(input);
    touch(input, 'touchstart', 100, 100);
    touch(input, 'touchmove', 100, 400);
    touch(input, 'touchend');
    jest.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it('respects disabled', () => {
    const { item, handler } = mountPanel({ disabled: true });
    touch(item, 'touchstart', 100, 100);
    touch(item, 'touchmove', 100, 400);
    touch(item, 'touchend');
    jest.advanceTimersByTime(500);
    expect(handler).not.toHaveBeenCalled();
  });

  it('closes a non-persistent v-dialog but never a persistent one', () => {
    const makeDialog = (persistent) => {
      const el = document.createElement('div');
      el.className = 'v-dialog';
      Object.defineProperty(el, 'offsetHeight', { value: 400 });
      const vm = {
        $options: { name: 'v-dialog' },
        persistent,
        isActive: true,
        activeZIndex: 202,
        getMaxZIndex: () => 202,
      };
      el.__vue__ = { $options: { name: 'theme-provider' }, $parent: vm };
      document.body.appendChild(el);
      return { el, vm };
    };
    // Installs the document listener.
    mountPanel();

    const open = makeDialog(false);
    touch(open.el, 'touchstart', 50, 50);
    touch(open.el, 'touchmove', 50, 400);
    touch(open.el, 'touchend');
    jest.advanceTimersByTime(250);
    expect(open.vm.isActive).toBe(false);

    const locked = makeDialog(true);
    touch(locked.el, 'touchstart', 50, 50);
    touch(locked.el, 'touchmove', 50, 400);
    touch(locked.el, 'touchend');
    jest.advanceTimersByTime(250);
    expect(locked.vm.isActive).toBe(true);
  });
});
