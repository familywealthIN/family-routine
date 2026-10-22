/* eslint-env jest */
/**
 * With related goals the AI form is tall enough to hit the sheet's scroll cap,
 * and a fixed `70vh` cap ignores the keyboard: focusing a field pushed the form
 * off screen on the phone. The cap now follows the visual viewport.
 */
jest.mock('vue-radar', () => ({}));
jest.mock('vue-easymde', () => ({}));

const AiSearchModalModule = require('./AiSearchModal.vue');

const AiSearchModal = AiSearchModalModule.default || AiSearchModalModule;
const { methods, computed } = AiSearchModal;

const ctx = (over = {}) => ({
  keyboardFit: { maxHeight: null, inset: 0 },
  $vuetify: { breakpoint: { xsOnly: true } },
  $refs: {
    mobileCard: { $el: { offsetHeight: 700 } },
    scrollableContent: { $el: { offsetHeight: 560 } },
  },
  ...over,
});

const setViewport = ({ innerHeight, height, offsetTop = 0 }) => {
  const listeners = {};
  window.innerHeight = innerHeight;
  window.visualViewport = {
    height,
    offsetTop,
    addEventListener: jest.fn((type, fn) => { listeners[type] = fn; }),
    removeEventListener: jest.fn((type) => { delete listeners[type]; }),
  };
  return listeners;
};

afterEach(() => { delete window.visualViewport; });

describe('AiSearchModal keyboard fit', () => {
  it('caps the scroll area at what is left above the keyboard', () => {
    // 844 tall screen, keyboard overlays 336px (iOS): 508 visible.
    setViewport({ innerHeight: 844, height: 508 });
    const vm = ctx();
    methods.fitToKeyboard.call(vm);
    // chrome = 700 - 560 = 140; room = 508 - 140 - 8 = 360; 70% cap = 356.
    expect(vm.keyboardFit).toEqual({ maxHeight: 356, inset: 336 });
  });

  it('needs no lift where the WebView resizes for the keyboard', () => {
    setViewport({ innerHeight: 508, height: 508 });
    const vm = ctx();
    methods.fitToKeyboard.call(vm);
    expect(vm.keyboardFit.inset).toBe(0);
  });

  it('never squeezes the form below a usable height', () => {
    setViewport({ innerHeight: 844, height: 200 });
    const vm = ctx();
    methods.fitToKeyboard.call(vm);
    expect(vm.keyboardFit.maxHeight).toBe(120);
  });

  it('leaves the larger shells alone', () => {
    setViewport({ innerHeight: 844, height: 508 });
    const vm = ctx({ $vuetify: { breakpoint: { xsOnly: false } } });
    methods.fitToKeyboard.call(vm);
    expect(vm.keyboardFit).toEqual({ maxHeight: null, inset: 0 });
  });

  it('listens only while the sheet is open', () => {
    const listeners = setViewport({ innerHeight: 844, height: 844 });
    const vm = ctx();
    vm.fitToKeyboard = methods.fitToKeyboard.bind(vm);
    methods.watchKeyboard.call(vm, true);
    expect(Object.keys(listeners).sort()).toEqual(['resize', 'scroll']);
    methods.watchKeyboard.call(vm, true);
    expect(window.visualViewport.addEventListener).toHaveBeenCalledTimes(2);
    methods.watchKeyboard.call(vm, false);
    expect(listeners).toEqual({});
    expect(vm.keyboardFit).toEqual({ maxHeight: null, inset: 0 });
  });

  it('applies the fit as styles', () => {
    const vm = { keyboardFit: { maxHeight: 356, inset: 336 }, dragStyle: {} };
    expect(computed.mobileScrollStyle.call(vm)).toEqual({ maxHeight: '356px', overflowY: 'auto' });
    expect(computed.mobileCardStyle.call(vm)).toEqual({ marginBottom: '336px' });
    const idle = { keyboardFit: { maxHeight: null, inset: 0 }, dragStyle: {} };
    expect(computed.mobileScrollStyle.call(idle).maxHeight).toBe('70vh');
    expect(computed.mobileCardStyle.call(idle)).toEqual({});
  });
});
