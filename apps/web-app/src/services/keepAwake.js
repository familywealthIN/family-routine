/**
 * Profile's "Always on display": keep the screen on while the app is open, for
 * an iPad or tablet on a stand showing Home (`Profile and About.dc.html` § t1,
 * the DISPLAY card).
 *
 * - In the iOS and Android apps, the app's own KeepAwake plugin
 *   (apps/ios/App/App/KeepAwakePlugin.swift, apps/android/…/KeepAwakePlugin.java).
 *   A build that does not carry the plugin yet offers nothing.
 * - In a browser, the Screen Wake Lock API. The browser drops the lock whenever
 *   the tab is hidden, so it is taken again each time the page is visible.
 *
 * Either way the screen sleeps as usual once the app is in the background.
 * The choice is per device (localStorage), like the time format: a tablet on
 * a stand wants it, the phone of the same person does not.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

export const ALWAYS_ON_KEY = 'alwaysOnDisplay';

let plugin;
const KeepAwake = () => {
  if (!plugin) plugin = registerPlugin('KeepAwake');
  return plugin;
};

let wanted = false;
let lock = null;
let listening = false;

export function isAlwaysOnSaved() {
  try {
    return localStorage.getItem(ALWAYS_ON_KEY) === 'on';
  } catch (error) {
    return false;
  }
}

function save(on) {
  try {
    if (on) localStorage.setItem(ALWAYS_ON_KEY, 'on');
    else localStorage.removeItem(ALWAYS_ON_KEY);
  } catch (error) {
    // Private-mode Safari throws on setItem; it still holds for this visit.
  }
}

/** In the apps, only a build that registers the plugin can keep the screen on. */
const hasNativePlugin = () => Capacitor.isPluginAvailable('KeepAwake');

/** Whether this device can keep its screen on at all. */
export function canKeepAwake() {
  if (Capacitor.isNativePlatform()) return hasNativePlugin();
  return typeof navigator !== 'undefined' && !!navigator.wakeLock;
}

/**
 * Profile offers it on iPads and tablets only: a big screen you touch (`shell`
 * is the page's resolveShell, so phones are out), in the app or in a browser
 * (iPadOS Safari calls itself a Mac, but a Mac has no touch points). Never on a
 * computer, which has its own power settings.
 */
export function offersAlwaysOn(shell) {
  if (shell === 'phone' || !canKeepAwake()) return false;
  if (Capacitor.isNativePlatform()) return true;
  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1;
}

async function takeWebLock() {
  if (!wanted || lock || !navigator.wakeLock || document.visibilityState !== 'visible') return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => { lock = null; });
  } catch (error) {
    // Refused (low battery, no user activation yet): try again when visible.
    lock = null;
  }
}

function onVisible() {
  if (document.visibilityState === 'visible') takeWebLock();
}

async function apply(on) {
  wanted = on;
  if (Capacitor.isNativePlatform()) {
    if (!hasNativePlugin()) return false;
    try {
      await (on ? KeepAwake().keepAwake() : KeepAwake().allowSleep());
      return true;
    } catch (error) {
      console.warn('[keepAwake] native call failed:', error);
      return false;
    }
  }
  if (!navigator.wakeLock) return false;
  if (!listening) {
    document.addEventListener('visibilitychange', onVisible);
    listening = true;
  }
  if (on) {
    await takeWebLock();
  } else if (lock) {
    const held = lock;
    lock = null;
    await held.release().catch(() => {});
  }
  return true;
}

/** Turn it on or off from Profile, and remember it on this device. */
export function setAlwaysOn(on) {
  save(on);
  return apply(on);
}

/** At start-up: put back what this device chose. Nothing to do when it is off. */
export function restoreAlwaysOn() {
  if (!isAlwaysOnSaved()) return Promise.resolve(false);
  return apply(true);
}

/** Tests only. */
export function resetKeepAwakeForTests() {
  wanted = false;
  lock = null;
  if (listening) document.removeEventListener('visibilitychange', onVisible);
  listening = false;
  plugin = undefined;
}
