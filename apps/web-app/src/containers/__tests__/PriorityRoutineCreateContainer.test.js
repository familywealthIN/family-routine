/* eslint-env jest */
/**
 * The AUTOMATE chip's "Make it a routine". The server now enforces a 1-point
 * minimum and the 100-point day budget, so the chip creates at 1 point and the
 * page shows the server's reason when the write is refused.
 */
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {}, graphQLUrl: '' }), { virtual: true });

const PriorityRoutineCreateContainer = require('../PriorityRoutineCreateContainer.vue').default;
const PriorityTime = require('../../pages/PriorityTime.vue').default;

const { automate } = PriorityRoutineCreateContainer.methods;

describe('PriorityRoutineCreateContainer', () => {
  it('creates the routine at the 1-point minimum the server accepts', async () => {
    const mutate = jest.fn(() => Promise.resolve({ data: { addRoutineItem: { id: 'r1' } } }));
    const ctx = { $apollo: { mutate }, $emit: jest.fn() };
    await automate.call(ctx, { id: 'g1', body: 'Water plants' }, { time: '09:00' });
    expect(mutate.mock.calls[0][0].variables.points).toBe(1);
  });
});

describe('PriorityTime automate failure toast', () => {
  const toastFor = (error) => {
    const showToast = jest.fn();
    PriorityTime.methods.onAutomateError.call({ showToast }, { item: { body: 'Water plants' }, error });
    return showToast.mock.calls[0][0];
  };

  it("says the server's reason when the day budget is full", () => {
    const error = {
      graphQLErrors: [{ message: '400:All 100 points of the day are already given out — lower another routine to make room' }],
    };
    expect(toastFor(error).sub).toBe('All 100 points of the day are already given out — lower another routine to make room');
  });

  it('falls back to the generic line when there is no reason', () => {
    expect(toastFor({}).sub).toBe('Water plants is still a one-off');
  });
});
