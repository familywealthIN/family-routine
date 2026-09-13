/* eslint-env jest */

// The atoms barrel this organism imports reaches RadarCard, and vue-radar ships
// an untransformed .vue that jest cannot parse. Stubbed so the suite can load.
jest.mock('vue-radar', () => ({}));

const GoalItemList = require('./GoalItemList.vue').default;

// D-12: a week goal rendered as a bare checkbox — nothing on the row said how
// many of its milestones were met or how many were left.
const weekGoalItem = (overrides = {}) => ({
  id: 'W1',
  body: 'Ship the beta',
  isComplete: false,
  milestonesTotal: 7,
  milestonesComplete: 3,
  ...overrides,
});

describe('OrganismGoalItemList milestone tally', () => {
  describe('getMilestonesProgress', () => {
    it('renders met over declared milestones', () => {
      expect(GoalItemList.methods.getMilestonesProgress(weekGoalItem()))
        .toBe('3/7 milestones');
    });

    it('treats a missing complete count as zero', () => {
      expect(GoalItemList.methods.getMilestonesProgress(
        weekGoalItem({ milestonesComplete: undefined }),
      )).toBe('0/7 milestones');
    });

    it('returns nothing when the goal declared no milestones', () => {
      expect(GoalItemList.methods.getMilestonesProgress(
        weekGoalItem({ milestonesTotal: 0, milestonesComplete: 0 }),
      )).toBe('');
      expect(GoalItemList.methods.getMilestonesProgress({ id: 'd1', body: 'A day goal' }))
        .toBe('');
    });
  });

  describe('getMilestonesOutstanding', () => {
    it('says how many milestones are still open', () => {
      expect(GoalItemList.methods.getMilestonesOutstanding(weekGoalItem()))
        .toBe('4 of 7 milestones outstanding');
    });

    it('says the goal is fully met when nothing is outstanding', () => {
      expect(GoalItemList.methods.getMilestonesOutstanding(
        weekGoalItem({ milestonesComplete: 7 }),
      )).toBe('All 7 milestones met');
    });

    it('returns nothing when the goal declared no milestones', () => {
      expect(GoalItemList.methods.getMilestonesOutstanding({ id: 'd1', body: 'A day goal' }))
        .toBe('');
    });
  });
});
