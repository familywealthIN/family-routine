jest.mock('../src/utils/getEmailfromSession', () => () => 'me@example.invalid');

const { RoutineItemModel } = require('../src/schema/RoutineItemSchema');
const { mutation } = require('../src/resolvers/routineItem');

const args = (notifyMode) => ({
  name: 'Run', description: '', time: '07:00', points: 10, steps: [], tags: [], notifyMode,
});

describe('routine notifyMode', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(['add', 'update'])('%s refuses an unknown mode before touching the database', async (op) => {
    const find = jest.spyOn(RoutineItemModel, 'find');
    const resolver = op === 'add' ? mutation.addRoutineItem : mutation.updateRoutineItem;
    await expect(resolver.resolve(null, { id: 'x', ...args('loud') }, {})).rejects.toThrow('notifyMode');
    expect(find).not.toHaveBeenCalled();
  });

  it('stores off / notify / alarm on the template', () => {
    ['off', 'notify', 'alarm'].forEach((mode) => {
      const doc = new RoutineItemModel({ name: 'Run', notifyMode: mode });
      expect(doc.validateSync()).toBeUndefined();
      expect(doc.notifyMode).toBe(mode);
    });
    expect(new RoutineItemModel({ notifyMode: 'loud' }).validateSync()).toBeDefined();
  });
});
