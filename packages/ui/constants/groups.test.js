/* eslint-env jest */
/**
 * The Groups page's presentation rules: the 10-member cap (pending invites
 * included), the invite field's five hint states, and the score bands.
 */
const {
  MEMBER_CAP,
  EMAIL_RE,
  FULL_LABEL,
  INVITE_LABEL,
  INVITE_HINTS,
  TODAY_DOT_BG,
  MEMBER_RING,
  WEEK_CELL,
  avatarColor,
  initials,
  inviteState,
  isGroupFull,
  scoreColor,
  scoreIcon,
  slotsLeft,
} = require('./groups');

describe('the 10-member cap counts pending invites', () => {
  it('is 10 members max', () => {
    expect(MEMBER_CAP).toBe(10);
  });

  it('spends a slot on an invite that has only been sent', () => {
    expect(slotsLeft(4, 0)).toBe(6);
    expect(slotsLeft(4, 2)).toBe(4);
  });

  it('is full at eight members and two outstanding invites', () => {
    expect(isGroupFull(8, 2)).toBe(true);
    expect(isGroupFull(8, 1)).toBe(false);
    expect(slotsLeft(8, 2)).toBe(0);
  });

  it('never reports a negative number of spots', () => {
    expect(slotsLeft(10, 4)).toBe(0);
  });

  it('relabels rather than hides when full', () => {
    expect(FULL_LABEL).toBe('Group is full · 10 members max');
    expect(INVITE_LABEL).toBe('Invite someone');
  });
});

describe('inviteState — the five hints, in order', () => {
  const taken = ['priya@shah.in'];

  it('offers what will happen while the field is empty', () => {
    const state = inviteState({ email: '', tried: false, taken });
    expect(state.hint).toBe(INVITE_HINTS.empty);
    expect(state.hint).toBe('They need a Routine Notes account — the invite appears in their app.');
    expect(state.canSend).toBe(false);
  });

  it('stays patient while a half-typed address is still being typed', () => {
    const state = inviteState({ email: 'jo@', tried: false, taken });
    expect(state.hint).toBe('Keep typing…');
    expect(state.canSend).toBe(false);
  });

  it('only calls it invalid once Send has been pressed', () => {
    const state = inviteState({ email: 'jo@', tried: true, taken });
    expect(state.hint).toBe('Enter a valid email address.');
    expect(state.hintColor).toBe('#d32f2f');
    expect(state.lineColor).toBe('#d32f2f');
  });

  it('catches someone who is already in the group, however it is cased', () => {
    const state = inviteState({ email: 'PRIYA@shah.in', tried: false, taken });
    expect(state.hint).toBe('Already in your group.');
    expect(state.duplicate).toBe(true);
    expect(state.canSend).toBe(false);
  });

  it('clears a valid, new address to send', () => {
    const state = inviteState({ email: 'jo@family.com', tried: false, taken });
    expect(state.hint).toBe('Looks good.');
    expect(state.canSend).toBe(true);
    expect(state.lineColor).toBe('#288bd5');
  });

  it('trims before judging, and survives being called with nothing', () => {
    expect(inviteState({ email: '  jo@family.com  ', taken }).canSend).toBe(true);
    expect(inviteState().hint).toBe(INVITE_HINTS.empty);
  });

  it('uses the design’s own regex, two-char TLD minimum', () => {
    expect(EMAIL_RE.test('jo@family.com')).toBe(true);
    expect(EMAIL_RE.test('jo@family.c')).toBe(false);
    expect(EMAIL_RE.test('jo@family')).toBe(false);
    expect(EMAIL_RE.test('jo family@x.com')).toBe(false);
  });
});

describe('score bands', () => {
  it('bands green at 70, orange at 40, red below', () => {
    expect([scoreColor(70), scoreIcon(70)]).toEqual(['#4CAF50', 'check']);
    expect([scoreColor(40), scoreIcon(40)]).toEqual(['#FF9800', 'remove']);
    expect([scoreColor(39), scoreIcon(39)]).toEqual(['#e53935', 'close']);
    expect(scoreColor(0)).toBe('#e53935');
  });
});

describe('tokens the design pins exactly', () => {
  it('keeps today’s dot a flat blue tint', () => {
    expect(TODAY_DOT_BG).toBe('rgba(40,139,213,.18)');
  });

  it('keeps the 44px member ring at r22 / dasharray 138.2', () => {
    expect(MEMBER_RING.size).toBe(44);
    expect(MEMBER_RING.r).toBe(22);
    expect(MEMBER_RING.dasharray).toBe(138.2);
  });

  it('gives a later-today cell a dashed border instead of a shadow ring', () => {
    expect(WEEK_CELL.laterBg).toBe('transparent');
    expect(WEEK_CELL.laterBorder).toContain('dashed');
    expect(WEEK_CELL.doneBg).toBe('#4CAF50');
    expect(WEEK_CELL.missedBg).toBe('rgba(0,0,0,.08)');
  });
});

describe('initials and avatar colour', () => {
  it('takes at most two initials', () => {
    expect(initials('Alex Morgan')).toBe('AM');
    expect(initials('priya')).toBe('P');
    expect(initials('Ana Maria De Souza')).toBe('AM');
    expect(initials('')).toBe('?');
  });

  it('gives the same person the same colour every time', () => {
    expect(avatarColor('priya@shah.in')).toBe(avatarColor('priya@shah.in'));
    expect(avatarColor('')).toBeTruthy();
  });
});
