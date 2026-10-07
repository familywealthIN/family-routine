/**
 * The app chassis' navigation model — one source for the phone bottom bar, the
 * tablet icon rail, the desktop sidebar and the phone avatar drawer.
 *
 * `packages/design/*.dc.html` duplicates this plumbing (`NAV_MORE`,
 * `DRAWER_ITEMS`, `NAV_HREF`, `navMoreFor`, `drawerFor`, `fixNav`) verbatim in
 * every file. It is one chassis, not nine — see `docs/redesign/chassis.md`.
 *
 * Primary nav is NOT redeclared here: `FOCUS_NAV` in `./routineFocus` is already
 * exactly Home · Priority · Agents · Goals, so it is re-exported.
 */
import { FOCUS_NAV } from './routineFocus';

/** Primary nav — bottom bar / rail / sidebar. Re-exported, never duplicated. */
export { FOCUS_NAV as PRIMARY_NAV };

/**
 * Stable per-item key. `FOCUS_NAV` predates the chassis and carries no `key`, and
 * adding one there would ripple through the Home page — so the key is derived
 * from the label. Routes cannot be keys: `/settings` is both Routines and, nested,
 * Profile.
 */
export function navKey(item) {
  if (!item) return '';
  if (item.key) return item.key;
  return String(item.label || '').trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * "More" — the flyout on tablet/desktop, the avatar drawer's list on phone.
 * Routines is `/settings` because that is where routine editing lives today.
 * `gap` reproduces `navMoreFor()`'s 10px breather above Profile.
 *
 * No Log out here, on any shell: signing out lives on the Profile page's
 * identity card, one tap away through Profile.
 */
export const MORE_NAV = [
  { key: 'routines', icon: 'history', label: 'Routines', route: '/settings' },
  { key: 'progress', icon: 'insights', label: 'Progress', route: '/progress' },
  { key: 'groups', icon: 'supervisor_account', label: 'Groups', route: '/groups' },
  {
    key: 'profile', icon: 'person', label: 'Profile', route: '/settings/profile', gap: '10px',
  },
  { key: 'about', icon: 'info', label: 'About', route: '/about' },
];

/** Active/idle tokens for a nav row — `rgba(40,139,213,.12)` / `#1f6fab`. */
export const NAV_STYLE = {
  activeBg: 'rgba(40,139,213,.12)',
  activeBgSoft: 'rgba(40,139,213,.08)',
  activeFg: '#1f6fab',
  activeTab: '#288bd5',
  idleFg: 'rgba(0,0,0,.6)',
  idleTab: 'rgba(0,0,0,.54)',
  moreOpenBg: 'rgba(0,0,0,.06)',
};

/**
 * Goals' nav ring — the year average %. r=11 in a 26 box, so c = 2*PI*11 = 69.1.
 * The glyph shrinks to 14px to sit inside the ring (Goals.dc.html).
 */
export const NAV_RING = {
  key: 'goals',
  box: 26,
  r: 11,
  stroke: 2.4,
  dasharray: 69.1,
  track: 'rgba(0,0,0,.1)',
  color: '#288bd5',
  iconSize: 14,
};

/** `stroke-dashoffset = c * (1 - value/100)`, clamped — see chassis.md § Rings. */
export function navRingOffset(pct) {
  const value = Math.min(Math.max(Number(pct) || 0, 0), 100);
  return NAV_RING.dasharray * (1 - value / 100);
}

/**
 * The shell breakpoint. Copied from `RoutineFocus.vue`'s `shell` computed — there
 * is exactly one breakpoint scheme for the redesign.
 */
export const SHELL_DESKTOP_MIN_WIDTH = 1264;

export function resolveShell(breakpoint) {
  // No Vuetify (unit test, SSR) — phone is the safe floor, never a 76px rail.
  if (!breakpoint) return 'phone';
  if (breakpoint.xsOnly) return 'phone';
  return breakpoint.width >= SHELL_DESKTOP_MIN_WIDTH ? 'desktop' : 'tablet';
}

export const SHELLS = ['phone', 'tablet', 'desktop'];

/**
 * Per-shell chrome sizing. Only what differs per shell lives here; everything
 * fixed is a `rn-shell` class. Desktop titles run 26px against tablet's 22px.
 */
export const SHELL_CHROME = {
  phone: {
    // 40px: Home's original avatar, filling its whole tap target — the owner
    // preferred it, so every phone header now uses it.
    title: 24, subtitle: 12, avatar: 40, pointsSize: 24, glyph: 24,
  },
  tablet: {
    title: 22, subtitle: 13, avatar: 40, pointsSize: 28, glyph: 24,
  },
  desktop: {
    title: 26, subtitle: 13, avatar: 36, pointsSize: 28, glyph: 20,
  },
};

export function shellChrome(name) {
  return SHELL_CHROME[name] || SHELL_CHROME.phone;
}

export default {
  PRIMARY_NAV: FOCUS_NAV,
  MORE_NAV,
  NAV_STYLE,
  NAV_RING,
  navKey,
  navRingOffset,
  resolveShell,
  SHELL_DESKTOP_MIN_WIDTH,
  SHELLS,
  SHELL_CHROME,
  shellChrome,
};
