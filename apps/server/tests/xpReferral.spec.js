const {
  referralDecision,
  REFERRAL_MIN_SETTLED_DAYS,
  REFERRAL_MAX_REWARDED_INVITES,
  REFERRAL_REWARD_AMOUNT,
  WELCOME_GRANT_AMOUNT,
} = require('../src/utils/xpLedger');

describe('referralDecision', () => {
  it('waits until the invitee has 3 settled nonzero-earning days', () => {
    expect(referralDecision({ settledDays: 0, rewardedCount: 0 })).toBe('wait');
    expect(referralDecision({ settledDays: 2, rewardedCount: 0 })).toBe('wait');
  });

  it('rewards at exactly 3 settled days', () => {
    expect(referralDecision({ settledDays: 3, rewardedCount: 0 })).toBe('reward');
    expect(referralDecision({ settledDays: 30, rewardedCount: 5 })).toBe('reward');
  });

  it('caps the inviter at 10 lifetime rewarded invites', () => {
    expect(referralDecision({ settledDays: 3, rewardedCount: 10 })).toBe('cap');
    expect(referralDecision({ settledDays: 99, rewardedCount: 11 })).toBe('cap');
    expect(referralDecision({ settledDays: 3, rewardedCount: 9 })).toBe('reward');
  });

  it('the settled-day gate wins over the cap check (no cap flip while waiting)', () => {
    // A pending referral must never be terminally capped before the invitee
    // even qualifies — the inviter might free up cap room later.
    expect(referralDecision({ settledDays: 1, rewardedCount: 10 })).toBe('wait');
  });
});

describe('reward constants (product decisions)', () => {
  it('matches the agreed economy', () => {
    expect(REFERRAL_MIN_SETTLED_DAYS).toBe(3);
    expect(REFERRAL_MAX_REWARDED_INVITES).toBe(10);
    expect(REFERRAL_REWARD_AMOUNT).toBe(300);
    expect(WELCOME_GRANT_AMOUNT).toBe(300);
  });
});
