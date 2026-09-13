process.env.ENCRYPTION_KEY = 'routine-day-state-test-key';

const { resetDayState } = require('../src/resolvers/routine');
const { validateRedeem } = require('../src/utils/xpLedger');

// 2026-08-22T10:00:00Z = 15:30 IST -> local date 22-08-2026 in Asia/Kolkata.
const NOW = new Date('2026-08-22T10:00:00Z');
const TODAY = '22-08-2026';

describe('resetDayState', () => {
  // D-05: one routineItem document is reused by every day, so a tick or a
  // redemption stored on the shared template would make the item unredeemable
  // — and its agent unstartable — on every future day.
  it('clears the per-day flags a shared routineItem template may carry', () => {
    const template = {
      _id: 't1',
      name: 'Wake Up',
      points: 15,
      ticked: true,
      passed: true,
      redeemed: true,
      passedPoints: 15,
    };

    resetDayState(template);

    expect(template.ticked).toBe(false);
    expect(template.passed).toBe(false);
    expect(template.redeemed).toBe(false);
    expect(template.passedPoints).toBeUndefined();
    // Everything that is genuinely per-item survives.
    expect(template.name).toBe('Wake Up');
    expect(template.points).toBe(15);
  });

  it('leaves a new day redeemable after the previous day was redeemed', () => {
    const yesterday = {
      _id: 't1', points: 15, ticked: true, passed: true, redeemed: true, passedPoints: 15,
    };
    const today = { ...yesterday };
    resetDayState(today);
    // The day still has to pass before it can be redeemed, exactly as normal.
    today.passed = true;
    today.passedPoints = 15;

    const verdict = validateRedeem({
      user: { timezone: 'Asia/Kolkata' },
      routine: { date: TODAY, tasklist: [today] },
      taskId: 't1',
      clientDate: TODAY,
      now: NOW,
      available: 100,
    });

    expect(verdict.ok).toBe(true);
    expect(verdict.cost).toBe(15);
    // Yesterday's document is untouched — its redeem stays recorded.
    expect(yesterday.redeemed).toBe(true);
  });
});
