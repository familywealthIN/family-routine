/**
 * Groups page tokens — the colour, icon and geometry rules the Groups design
 * (`packages/design/Groups.dc.html`) states, plus the two pure validators its
 * invite form needs.
 *
 * Only *presentation* rules live here, so the organisms stay pure: anything that
 * reads a server shape (a routine, a tasklist) is derivation and belongs to
 * `apps/web-app/src/utils/groupModel.js`.
 */

/** A group holds at most this many people, pending invites included. */
export const MEMBER_CAP = 10;

/** The design's own regex — deliberately not a stricter one. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Score bands. 70 and 40 are the design's cut points, not the old 70/33. */
export const SCORE_BANDS = { good: 70, fair: 40 };

export const SCORE_COLORS = {
  good: '#4CAF50',
  fair: '#FF9800',
  poor: '#e53935',
};

export const SCORE_ICONS = {
  good: 'check',
  fair: 'remove',
  poor: 'close',
};

export function scoreBand(value) {
  const v = Number(value) || 0;
  if (v >= SCORE_BANDS.good) return 'good';
  if (v >= SCORE_BANDS.fair) return 'fair';
  return 'poor';
}

export function scoreColor(value) {
  return SCORE_COLORS[scoreBand(value)];
}

export function scoreIcon(value) {
  return SCORE_ICONS[scoreBand(value)];
}

/**
 * Today's dot is deliberately NOT a scored dot: a flat blue tint with no glyph,
 * because the day is still running and a red dot at 09:00 would be a lie.
 */
export const TODAY_DOT_BG = 'rgba(40,139,213,.18)';

/** The 44px member ring — chassis.md § Rings, `r22`, `dasharray 138.2`. */
export const MEMBER_RING = {
  size: 44, viewBox: 48, r: 22, stroke: 3, dasharray: 138.2, track: 'rgba(0,0,0,.07)',
};

/**
 * Week-grid cell tokens. `later` is the one that matters: a routine on today that
 * has not been reached yet must read as "not yet", never as missed.
 *
 * A `later` cell carries NO box-shadow ring: its ring is dashed, and a dashed
 * ring is a border, not a shadow, so `GroupMemberWeek`'s `--later` class draws
 * it. The mock uses a solid 1px inset there; dashed is the stated intent — "a
 * routine not yet reached today must NOT read as missed" — and a solid hairline
 * reads much closer to the missed grey than a dashed one does.
 */
export const WEEK_CELL = {
  doneBg: '#4CAF50',
  missedBg: 'rgba(0,0,0,.08)',
  laterBg: 'transparent',
  laterBorder: '1px dashed rgba(0,0,0,.28)',
  todayRing: 'inset 0 0 0 2px rgba(40,139,213,.5)',
  noRing: 'none',
};

/** Up to two initials, as the design's avatar stack draws them. */
export function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

/**
 * The mock hands every member a hand-picked avatar colour. Real members arrive
 * with an email and nothing else, so the colour is derived from it — stable per
 * person, and the same on every device.
 */
export const AVATAR_COLORS = ['#288bd5', '#7b5ea7', '#E68900', '#2e7d32', '#c2185b', '#00838f'];

export const PENDING_AVATAR_COLOR = '#bdbdbd';

export function avatarColor(key) {
  const text = String(key || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 100000;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** `slots = 10 - (members + pending)`, never negative. */
export function slotsLeft(memberCount, pendingCount) {
  const used = (Number(memberCount) || 0) + (Number(pendingCount) || 0);
  return Math.max(0, MEMBER_CAP - used);
}

export function isGroupFull(memberCount, pendingCount) {
  return slotsLeft(memberCount, pendingCount) <= 0;
}

export const FULL_LABEL = `Group is full · ${MEMBER_CAP} members max`;
export const INVITE_LABEL = 'Invite someone';

/**
 * The invite field's five states, in the design's order:
 *   empty -> "They need a Routine Notes account — the invite appears in their app."
 *            (The design said "We'll email them a link", but `sendInvite` sends
 *            no email: it flags an EXISTING account, which sees the request on
 *            its Groups page. The copy says what actually happens.)
 *   typing, not yet valid -> "Keep typing…"
 *   submitted while invalid -> "Enter a valid email address."
 *   already a member or already invited -> "Already in your group."
 *   valid and new -> "Looks good."
 *
 * `taken` is every email already in the group or already invited.
 */
export const INVITE_HINTS = {
  empty: 'They need a Routine Notes account — the invite appears in their app.',
  typing: 'Keep typing…',
  invalid: 'Enter a valid email address.',
  duplicate: 'Already in your group.',
  ok: 'Looks good.',
};

export function inviteState({ email = '', tried = false, taken = [] } = {}) {
  const value = String(email || '').trim();
  const valid = EMAIL_RE.test(value);
  const lower = value.toLowerCase();
  const duplicate = !!value && (taken || [])
    .some((entry) => String(entry || '').trim().toLowerCase() === lower);

  let state = 'ok';
  if (!value) state = 'empty';
  else if (!valid) state = tried ? 'invalid' : 'typing';
  else if (duplicate) state = 'duplicate';

  const bad = state === 'invalid' || state === 'duplicate';
  return {
    state,
    value,
    valid,
    duplicate,
    hint: INVITE_HINTS[state],
    hintColor: bad ? '#d32f2f' : 'rgba(0,0,0,.5)',
    // The underline tracks the same three readings the design gives it.
    lineColor: (() => {
      if (!value) return 'rgba(0,0,0,.2)';
      if (valid && !duplicate) return '#288bd5';
      return bad ? '#d32f2f' : 'rgba(0,0,0,.3)';
    })(),
    canSend: valid && !duplicate,
  };
}

export default {
  MEMBER_CAP,
  EMAIL_RE,
  SCORE_BANDS,
  SCORE_COLORS,
  SCORE_ICONS,
  scoreBand,
  scoreColor,
  scoreIcon,
  TODAY_DOT_BG,
  MEMBER_RING,
  WEEK_CELL,
  initials,
  avatarColor,
  AVATAR_COLORS,
  PENDING_AVATAR_COLOR,
  slotsLeft,
  isGroupFull,
  FULL_LABEL,
  INVITE_LABEL,
  INVITE_HINTS,
  inviteState,
};
