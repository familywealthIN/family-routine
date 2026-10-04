/* eslint-env jest */
/**
 * D-28: the period groups on /goals/milestones are titled from `period.name`,
 * which is the stored lowercase period key, so they read "day Goals" under a
 * card titled "Goals".
 *
 * The filter is exercised directly (no mount), matching the loadErrorState
 * convention for this page.
 */
// MilestonesTime pulls the ui barrels, which transitively import third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in the headings.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));

const MilestonesTime = require('../MilestonesTime.vue').default;
const { periodsArray } = require('../../constants/goals');

describe('MilestonesTime period headings', () => {
  const { capitalize } = MilestonesTime.filters;

  it('titles every period group to match the "Goals" card', () => {
    expect(periodsArray.map((period) => `${capitalize(period.name)} Goals`)).toEqual([
      'Day Goals',
      'Week Goals',
      'Month Goals',
      'Year Goals',
      'Lifetime Goals',
    ]);
  });

  it('renders nothing rather than throwing on a missing period name', () => {
    expect(capitalize(undefined)).toBe('');
  });
});
