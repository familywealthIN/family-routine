/* eslint-env jest */
/**
 * Always on display: the native plugin in the apps, the Screen Wake Lock in a
 * browser, remembered per device.
 */
const mockNative = {
  on: false, plugin: true, calls: [], fail: false,
};
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mockNative.on,
    isPluginAvailable: (name) => name === 'KeepAwake' && mockNative.plugin,
  },
  registerPlugin: () => ({
    keepAwake: () => (mockNative.fail ? Promise.reject(new Error('no plugin')) : Promise.resolve(mockNative.calls.push('keepAwake'))),
    allowSleep: () => Promise.resolve(mockNative.calls.push('allowSleep')),
  }),
}));

const keepAwake = require('../keepAwake');

let requests;
let released;
const installWakeLock = () => {
  requests = 0;
  released = 0;
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: {
      request: () => {
        requests += 1;
        const listeners = [];
        return Promise.resolve({
          addEventListener: (type, fn) => listeners.push(fn),
          release: () => { released += 1; listeners.forEach((fn) => fn()); return Promise.resolve(); },
          drop: () => listeners.forEach((fn) => fn()),
        });
      },
    },
  });
};
const setVisibility = (state) => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  localStorage.clear();
  keepAwake.resetKeepAwakeForTests();
  mockNative.on = false;
  mockNative.plugin = true;
  mockNative.fail = false;
  mockNative.calls = [];
  installWakeLock();
  setVisibility('visible');
});

describe('keepAwake — in a browser', () => {
  it('takes a screen wake lock, remembers it, and lets it go', async () => {
    expect(await keepAwake.setAlwaysOn(true)).toBe(true);
    expect(requests).toBe(1);
    expect(keepAwake.isAlwaysOnSaved()).toBe(true);

    await keepAwake.setAlwaysOn(false);
    expect(released).toBe(1);
    expect(keepAwake.isAlwaysOnSaved()).toBe(false);
  });

  it('takes it again when the tab comes back, as browsers drop it when hidden', async () => {
    await keepAwake.setAlwaysOn(true);
    setVisibility('hidden');
    // The browser released it while hidden.
    keepAwake.resetKeepAwakeForTests();
    localStorage.setItem(keepAwake.ALWAYS_ON_KEY, 'on');
    await keepAwake.restoreAlwaysOn();
    expect(requests).toBe(1);
    setVisibility('visible');
    await flush();
    expect(requests).toBe(2);
  });

  it('does nothing at start-up when this device has it off', async () => {
    expect(await keepAwake.restoreAlwaysOn()).toBe(false);
    expect(requests).toBe(0);
  });

  it('says it cannot when the browser has no wake lock', async () => {
    Object.defineProperty(navigator, 'wakeLock', { value: undefined, configurable: true });
    expect(keepAwake.canKeepAwake()).toBe(false);
    expect(await keepAwake.setAlwaysOn(true)).toBe(false);
  });
});

describe('keepAwake — in the app', () => {
  it('uses the native plugin', async () => {
    mockNative.on = true;
    await keepAwake.setAlwaysOn(true);
    await keepAwake.setAlwaysOn(false);
    expect(mockNative.calls).toEqual(['keepAwake', 'allowSleep']);
    expect(requests).toBe(0);
  });

  it('reports a plugin that is not there', async () => {
    mockNative.on = true;
    mockNative.fail = true;
    expect(await keepAwake.setAlwaysOn(true)).toBe(false);
  });

  // The web app reaches the store apps before their next release does, and
  // those builds have no KeepAwake plugin: Profile must not offer a switch
  // that does nothing, and a saved choice must not call into the void.
  it('an app build without the plugin offers nothing and calls nothing', async () => {
    mockNative.on = true;
    mockNative.plugin = false;
    expect(keepAwake.canKeepAwake()).toBe(false);
    expect(keepAwake.offersAlwaysOn('tablet')).toBe(false);
    localStorage.setItem(keepAwake.ALWAYS_ON_KEY, 'on');
    expect(await keepAwake.restoreAlwaysOn()).toBe(false);
    expect(mockNative.calls).toEqual([]);
    expect(requests).toBe(0);
  });
});

describe('keepAwake — who is offered it', () => {
  const touch = (points) => Object.defineProperty(navigator, 'maxTouchPoints', { value: points, configurable: true });
  afterEach(() => touch(0));

  it('an iPad or tablet, in the app or a browser', () => {
    touch(5);
    expect(keepAwake.offersAlwaysOn('tablet')).toBe(true);
    expect(keepAwake.offersAlwaysOn('desktop')).toBe(true);
    mockNative.on = true;
    touch(0);
    expect(keepAwake.offersAlwaysOn('tablet')).toBe(true);
  });

  it('never a phone or a computer', () => {
    touch(5);
    expect(keepAwake.offersAlwaysOn('phone')).toBe(false);
    touch(0);
    expect(keepAwake.offersAlwaysOn('desktop')).toBe(false);
  });
});
