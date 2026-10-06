/**
 * Swipe-down-to-dismiss for every modal and bottom sheet, installed once.
 *
 * Two kinds of panel are recognised from a single document-level touch
 * listener, so no page has to opt in:
 *
 *   1. Vuetify `v-dialog` / `v-bottom-sheet` (`.v-dialog`). The panel's
 *      VDialog instance is found by walking `__vue__.$parent` from the
 *      element (its ThemeProvider child owns the `.v-dialog` root), and a
 *      dismiss sets `isActive = false` — the same thing an outside click
 *      does, so `v-model` sees an ordinary `input(false)`. `persistent`
 *      dialogs are never dismissed, and only the topmost dialog reacts.
 *
 *   2. The chassis' own overlays (ResponsiveSheet, RoutineSheet,
 *      YearGoalSwitcher), which are plain DOM, not v-dialog. They mark
 *      their panel with the `v-swipe-dismiss` directive below and get
 *      their own close callback.
 *
 * A drag only starts as a dismiss when it would not be a scroll: every
 * element between the touch point and the panel must be scrolled to the
 * top, the first movement must be mostly downward, and form fields,
 * editors and sliders are left alone. Anything inside
 * `[data-no-swipe-dismiss]` (or `.no-swipe-dismiss`) opts out.
 *
 * Not a mixin or a wrapper component: most dialogs in the app are raw
 * `<v-dialog>`s across many files, and patching each one would be the
 * very drift a shared behaviour is meant to avoid.
 */

const START_SLOP = 8; // px of movement before the gesture picks a direction
const DISMISS_RATIO = 0.25; // of the panel's height ...
const DISMISS_MAX = 140; // ... capped, so tall sheets don't need a marathon drag
const FLING_VELOCITY = 0.6; // px/ms downward at release
const FLING_MIN = 40; // px — a fling still has to travel a little
const SETTLE_MS = 200;

const IGNORE_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '.ProseMirror',
  '.CodeMirror',
  '.v-slider',
  'canvas',
  '[draggable="true"]',
  '[data-no-swipe-dismiss]',
  '.no-swipe-dismiss',
].join(',');

const PANEL_SELECTOR = '[data-swipe-dismiss], .v-dialog';

let installed = false;
let gesture = null;
/** Directive bindings, keyed by panel element: `{ handler, disabled }`. */
const bindings = new WeakMap();

function findDialogVm(el) {
  let vm = el && el.__vue__;
  while (vm && vm.$options && vm.$options.name !== 'v-dialog') vm = vm.$parent;
  return vm && vm.$options && vm.$options.name === 'v-dialog' ? vm : null;
}

/** Resolve the panel under the touch to `{ el, dismiss }`, or null. */
function resolvePanel(target) {
  const el = target.closest && target.closest(PANEL_SELECTOR);
  if (!el) return null;

  if (el.hasAttribute('data-swipe-dismiss')) {
    const binding = bindings.get(el);
    if (!binding || binding.disabled || typeof binding.handler !== 'function') return null;
    return { el, dismiss: binding.handler, resetAfter: true };
  }

  const vm = findDialogVm(el);
  if (!vm || vm.persistent || !vm.isActive) return null;
  // Only the topmost dialog — the same rule VDialog's own outside-click uses.
  if (typeof vm.getMaxZIndex === 'function' && vm.activeZIndex < vm.getMaxZIndex()) return null;
  return {
    el,
    dismiss: () => { vm.isActive = false; },
    resetAfter: true,
  };
}

/** True when nothing between the touch and the panel is scrolled down. */
function scrolledToTop(target, panel) {
  let node = target;
  while (node && node.nodeType === 1) {
    if (node.scrollTop > 0) return false;
    if (node === panel) return true;
    node = node.parentElement;
  }
  return true;
}

function setStyle(el, transform, transition) {
  Object.assign(el.style, { transform, transition });
}

function clearStyle(el) {
  Object.assign(el.style, { transform: '', transition: '', willChange: '' });
}

function onTouchStart(event) {
  gesture = null;
  if (!event.touches || event.touches.length !== 1) return;
  const { target } = event;
  if (!target || !target.closest || target.closest(IGNORE_SELECTOR)) return;
  const panel = resolvePanel(target);
  if (!panel || !scrolledToTop(target, panel.el)) return;

  const touch = event.touches[0];
  gesture = {
    ...panel,
    startX: touch.clientX,
    startY: touch.clientY,
    dy: 0,
    dragging: false,
    lastY: touch.clientY,
    lastT: Date.now(),
    velocity: 0,
  };
}

function onTouchMove(event) {
  if (!gesture || !event.touches || event.touches.length !== 1) return;
  const touch = event.touches[0];
  const dx = touch.clientX - gesture.startX;
  const dy = touch.clientY - gesture.startY;

  if (!gesture.dragging) {
    if (Math.abs(dx) < START_SLOP && Math.abs(dy) < START_SLOP) return;
    // Upward or sideways first: it's a scroll / swipe, not a dismiss.
    if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) {
      gesture = null;
      return;
    }
    gesture.dragging = true;
    Object.assign(gesture.el.style, { willChange: 'transform' });
  }

  // Stop the content (or iOS' rubber band) from scrolling with the drag.
  if (event.cancelable) event.preventDefault();

  const now = Date.now();
  const dt = now - gesture.lastT;
  if (dt > 0) gesture.velocity = (touch.clientY - gesture.lastY) / dt;
  gesture.lastY = touch.clientY;
  gesture.lastT = now;
  gesture.dy = Math.max(0, dy);
  setStyle(gesture.el, `translateY(${gesture.dy}px)`, 'none');
}

function onTouchEnd() {
  const g = gesture;
  gesture = null;
  if (!g || !g.dragging) return;

  const height = g.el.offsetHeight || window.innerHeight || 600;
  const threshold = Math.min(DISMISS_MAX, height * DISMISS_RATIO);
  const fling = g.velocity > FLING_VELOCITY && g.dy > FLING_MIN;

  if (g.dy > threshold || fling) {
    const off = Math.max(height, window.innerHeight || 0);
    setStyle(g.el, `translateY(${off}px)`, `transform ${SETTLE_MS}ms ease-in`);
    setTimeout(() => {
      g.dismiss();
      // v-show panels (v-dialog, YearGoalSwitcher) stay in the DOM: undo the
      // drag once they are hidden, so the next open starts from rest.
      if (g.resetAfter) setTimeout(() => clearStyle(g.el), 400);
    }, SETTLE_MS);
    return;
  }

  setStyle(g.el, 'translateY(0px)', `transform ${SETTLE_MS}ms ease-out`);
  setTimeout(() => {
    // A new drag may have started on the same panel since.
    if (!gesture || gesture.el !== g.el) clearStyle(g.el);
  }, SETTLE_MS + 20);
}

function onTouchCancel() {
  const g = gesture;
  gesture = null;
  if (g && g.dragging) clearStyle(g.el);
}

/**
 * Idempotent. Called by App.vue at startup; the directive also calls it so a
 * component used outside the app (Storybook) still gets the gesture.
 */
export function installSwipeDismiss() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
  // Non-passive: once a dismiss drag starts, the scroll underneath must stop.
  // The handler returns immediately when no drag is in progress.
  document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
  document.addEventListener('touchend', onTouchEnd, { capture: true });
  document.addEventListener('touchcancel', onTouchCancel, { capture: true });
}

export function uninstallSwipeDismiss() {
  if (!installed || typeof document === 'undefined') return;
  installed = false;
  gesture = null;
  document.removeEventListener('touchstart', onTouchStart, { capture: true });
  document.removeEventListener('touchmove', onTouchMove, { capture: true });
  document.removeEventListener('touchend', onTouchEnd, { capture: true });
  document.removeEventListener('touchcancel', onTouchCancel, { capture: true });
}

function applyBinding(el, value) {
  const opts = typeof value === 'function' ? { handler: value } : (value || {});
  bindings.set(el, { handler: opts.handler, disabled: !!opts.disabled });
}

/**
 * `v-swipe-dismiss="close"` or `v-swipe-dismiss="{ handler: close, disabled }"`
 * on a plain (non-v-dialog) sheet panel.
 */
export const swipeDismiss = {
  bind(el, binding) {
    el.setAttribute('data-swipe-dismiss', '');
    applyBinding(el, binding.value);
    installSwipeDismiss();
  },
  update(el, binding) {
    applyBinding(el, binding.value);
  },
  unbind(el) {
    el.removeAttribute('data-swipe-dismiss');
    bindings.delete(el);
  },
};

export default swipeDismiss;
