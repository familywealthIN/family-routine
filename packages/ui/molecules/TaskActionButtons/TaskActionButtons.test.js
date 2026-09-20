/* eslint-env jest */

const TaskActionButtons = require('./TaskActionButtons.vue').default;

// D-16: "Start Agent" on a passed task pays the task's frozen redeem price,
// so the buttons that spend points must carry that price before they are hit.
const costLabelFor = (redeemCost) => TaskActionButtons.computed.costLabel.call({ redeemCost });

describe('MoleculeTaskActionButtons costLabel', () => {
  it('shows the price the task will be charged', () => {
    expect(costLabelFor(15)).toBe('15');
  });

  it('rounds a fractional price to whole points', () => {
    expect(costLabelFor(14.6)).toBe('15');
  });

  it('shows nothing when the action is free', () => {
    expect(costLabelFor(0)).toBe('');
    expect(costLabelFor(undefined)).toBe('');
  });
});
