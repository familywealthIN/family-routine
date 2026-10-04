/* eslint-env jest */
// A "Day skipped" event is posted with tone 'orange'; the model used to accept
// only green/blue, so the resolver coerced it to green.
const { RoutineChatMessageModel, TONES } = require('./RoutineChatSchema');

describe('RoutineChatMessage tone', () => {
  const event = (tone) => new RoutineChatMessageModel({
    email: 'e2e@example.com', date: '02-10-2026', taskRef: 't1', from: 'routine', kind: 'event', text: 'Day skipped', tone,
  });

  it('accepts orange alongside green and blue', () => {
    expect(TONES).toEqual(expect.arrayContaining(['green', 'blue', 'orange']));
    expect(event('orange').validateSync()).toBeUndefined();
  });

  it('still rejects an unknown tone', () => {
    expect(event('purple').validateSync()).toBeDefined();
  });
});
