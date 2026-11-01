/**
 * `$notify` — the app-wide toast, drawn by the same `AppToast` the redesigned
 * pages (Routines, Goals, Year goals, Priority, Groups, Agents) already use.
 *
 * It used to be `vue-notification`: a second, older look (coloured box, bottom
 * centre) next to the dark AppToast card, so a toast looked different depending
 * on which screen raised it. The call sites keep their vue-notification shape —
 * `{ title, text, type, duration, group }` — and this maps it onto AppToast:
 * `text` is the sub line, `type` picks the icon and its colour from the palette
 * the pages use. `group` is accepted and ignored: there is one host.
 *
 * App.vue mounts the one host and binds it to `toastState`. A page that draws
 * its own AppToast keeps doing so; both look identical now.
 */
import Vue from 'vue';

/** type -> icon + colour, the same palette the pages pass to AppToast. */
export const TOAST_LOOK = {
  success: { icon: 'check_circle', color: '#81c784' },
  error: { icon: 'error_outline', color: '#ef9a9a' },
  warning: { icon: 'warning', color: '#ffb74d' },
  info: { icon: 'info', color: '#64b5f6' },
};

/** AppToast's own animation length; shorter requests are stretched to it. */
export const MIN_DURATION = 2800;

export const toastState = Vue.observable({
  title: '',
  sub: '',
  icon: TOAST_LOOK.success.icon,
  color: TOAST_LOOK.success.color,
  duration: MIN_DURATION,
  seq: 0,
});

/** Turn a vue-notification call into the toast it should show. */
export function toToast(options) {
  const opts = typeof options === 'string' ? { title: options } : (options || {});
  const look = TOAST_LOOK[opts.type] || TOAST_LOOK.success;
  const title = String(opts.title || '').trim();
  const text = String(opts.text || '').trim();
  const duration = Number(opts.duration) > MIN_DURATION ? Number(opts.duration) : MIN_DURATION;
  return {
    // AppToast shows nothing without a title, so a text-only call leads with it.
    title: title || text,
    sub: title ? text : '',
    icon: opts.icon || look.icon,
    color: opts.color || look.color,
    duration,
  };
}

export function notify(options) {
  const toast = toToast(options);
  if (!toast.title) return;
  Object.assign(toastState, toast, { seq: toastState.seq + 1 });
}

export function clearToast() {
  toastState.title = '';
  toastState.sub = '';
}

const NotifyPlugin = {
  install(VueCtor) {
    // eslint-disable-next-line no-param-reassign
    VueCtor.prototype.$notify = notify;
  },
};

Vue.use(NotifyPlugin);

export default NotifyPlugin;
