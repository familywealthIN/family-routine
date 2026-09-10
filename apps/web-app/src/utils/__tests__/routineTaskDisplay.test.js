/* eslint-env jest */
/**
 * Unit tests for routineTaskDisplay — the pure display/derivation helpers
 * shared by the dashboard containers (via the provider) and the page's
 * tick/redeem orchestration.
 */
const {
  isRedeemable,
  getRedeemCost,
  describeRedeemFailure,
  canAffordRedeem,
  getCurrentButtonColor,
  getButtonIcon,
  getButtonDisabled,
  getTaskStatus,
  filterTaskGoalsPeriod,
  countTaskPercentage,
  countTaskCompleted,
  countTaskTotal,
} = require('../routineTaskDisplay');

const passed = {
  id: 't', passed: true, ticked: false, redeemed: false, points: 10, passedPoints: 8,
};

describe('routineTaskDisplay', () => {
  describe('isRedeemable', () => {
    it('true for a passed, unticked, non-redeemed task on today', () => {
      expect(isRedeemable(passed, true)).toBe(true);
    });
    it('false when not today', () => {
      expect(isRedeemable(passed, false)).toBe(false);
    });
    it('false when ticked / redeemed / not passed / null', () => {
      expect(isRedeemable({ ...passed, ticked: true }, true)).toBe(false);
      expect(isRedeemable({ ...passed, redeemed: true }, true)).toBe(false);
      expect(isRedeemable({ ...passed, passed: false }, true)).toBe(false);
      expect(isRedeemable(null, true)).toBe(false);
    });
  });

  describe('getRedeemCost', () => {
    it('uses frozen passedPoints when numeric', () => {
      expect(getRedeemCost({ passedPoints: 8, points: 10 })).toBe(8);
      expect(getRedeemCost({ passedPoints: 0, points: 10 })).toBe(0);
    });
    it('falls back to points, then 0', () => {
      expect(getRedeemCost({ points: 10 })).toBe(10);
      expect(getRedeemCost({})).toBe(0);
      expect(getRedeemCost(null)).toBe(0);
    });
  });

  describe('describeRedeemFailure', () => {
    it('names Start agent rather than "redeem this task" (D-05)', () => {
      const { title, text } = describeRedeemFailure(
        'GraphQL error: 400:Redemption is only available for today',
        { startingAgent: true },
      );
      expect(title).toBe("Couldn't start the agent");
      expect(text).toContain("today's routine");
    });
    it('names the task when the check button was pressed', () => {
      expect(describeRedeemFailure('409:Task is already checked').title)
        .toBe("Couldn't complete this task");
    });
    it('maps each server reason to its own explanation', () => {
      expect(describeRedeemFailure('409:Task is already checked').text)
        .toBe('This task is already checked off for today.');
      expect(describeRedeemFailure('400:Task has not passed yet').text)
        .toContain("hasn't passed yet");
      expect(describeRedeemFailure('404:Task not found').text)
        .toContain("no longer on today's routine");
      expect(describeRedeemFailure('404:Routine not found').text)
        .toContain("no longer on today's routine");
      expect(describeRedeemFailure('400:Date does not match routine').text)
        .toContain("today's routine");
    });
    it('falls back to a generic retry for unknown / empty errors', () => {
      expect(describeRedeemFailure('500:Boom').text).toBe('Something went wrong. Please try again.');
      expect(describeRedeemFailure(null).text).toBe('Something went wrong. Please try again.');
      expect(describeRedeemFailure(undefined, {}).title).toBe("Couldn't complete this task");
    });
  });

  describe('canAffordRedeem', () => {
    it('true when balance missing or entitled (server backstops)', () => {
      expect(canAffordRedeem(passed, null)).toBe(true);
      expect(canAffordRedeem(passed, { entitled: true, available: 0 })).toBe(true);
    });
    it('compares available against the frozen cost', () => {
      expect(canAffordRedeem(passed, { available: 8 })).toBe(true); // cost 8
      expect(canAffordRedeem(passed, { available: 7 })).toBe(false);
    });
  });

  describe('getCurrentButtonColor', () => {
    it('success ticked, white redeemable, error non-redeemable, empty active', () => {
      expect(getCurrentButtonColor({ ticked: true }, true)).toBe('success');
      expect(getCurrentButtonColor(passed, true)).toBe('white');
      expect(getCurrentButtonColor(passed, false)).toBe('error');
      expect(getCurrentButtonColor({ ticked: false, passed: false }, true)).toBe('');
    });
  });

  describe('getButtonIcon', () => {
    it('check / diamond / close / alarm / more_horiz', () => {
      expect(getButtonIcon({ ticked: true }, true)).toBe('check');
      expect(getButtonIcon(passed, true)).toBe('diamond');
      expect(getButtonIcon(passed, false)).toBe('close');
      expect(getButtonIcon({ passed: false, ticked: false, wait: false }, true)).toBe('alarm');
      expect(getButtonIcon(null, true)).toBe('more_horiz');
    });
  });

  describe('getButtonDisabled', () => {
    it('enabled when redeemable; disabled when passed/wait & unticked; enabled when active', () => {
      expect(getButtonDisabled(passed, true)).toBe(false); // redeemable
      expect(getButtonDisabled(passed, false)).toBe(true); // passed, unticked, not today
      expect(getButtonDisabled({ ticked: false, wait: true }, false)).toBe(true);
      expect(getButtonDisabled({ ticked: false, passed: false, wait: false }, true)).toBe(false);
    });
  });

  describe('getTaskStatus', () => {
    it('maps flags to status', () => {
      expect(getTaskStatus({ ticked: true })).toBe('completed');
      expect(getTaskStatus({ passed: true })).toBe('passed');
      expect(getTaskStatus({ wait: true })).toBe('waiting');
      expect(getTaskStatus({})).toBe('pending');
      expect(getTaskStatus(null)).toBe('pending');
    });
  });

  describe('filterTaskGoalsPeriod', () => {
    const goals = [
      {
        id: 'g1', period: 'day', date: 'd', goalItems: [{ id: 'a', taskRef: 't1' }, { id: 'b', taskRef: 't2' }],
      },
      {
        id: 'g2', period: 'week', date: 'd', goalItems: [{ id: 'c', taskRef: 't1' }],
      },
    ];
    it('keeps only the period + taskRef matches, regrouped', () => {
      const res = filterTaskGoalsPeriod('t1', goals, 'day');
      expect(res).toEqual([{
        id: 'g1', period: 'day', date: 'd', goalItems: [{ id: 'a', taskRef: 't1' }],
      }]);
    });
    it('empty when nothing matches / bad input', () => {
      expect(filterTaskGoalsPeriod('t9', goals, 'day')).toEqual([]);
      expect(filterTaskGoalsPeriod('t1', null, 'day')).toEqual([]);
    });
  });

  describe('count helpers', () => {
    const task = {
      id: 't', points: 100, stimuli: [{ name: 'D', splitRate: 3, earned: 60 }, { name: 'K', splitRate: 1, earned: 50 }],
    };
    it('countTaskTotal = D/K split count', () => {
      expect(countTaskTotal(task)).toBe(3);
    });
    it('countTaskCompleted = count * (K.earned / points), rounded', () => {
      expect(countTaskCompleted(task)).toBe(2); // 3 * 0.5 = 1.5 -> 2
    });
    it('countTaskPercentage = 100 * K.earned / points', () => {
      expect(countTaskPercentage(task)).toBe(50);
    });
    it('0 for missing stimuli / task', () => {
      expect(countTaskTotal(null)).toBe(0);
      expect(countTaskCompleted({ id: 't', points: 100, stimuli: [] })).toBe(0);
      expect(countTaskPercentage({ points: 100 })).toBe(0);
    });
  });
});
