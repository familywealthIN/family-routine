/* eslint-env jest */
const mockKeep = { saved: false, applied: true, calls: [] };
jest.mock('../../services/keepAwake', () => ({
  isAlwaysOnSaved: () => mockKeep.saved,
  setAlwaysOn: (on) => { mockKeep.calls.push(on); return Promise.resolve(mockKeep.applied); },
}));

const Vue = require('vue');
const ProfileDisplayContainer = require('../ProfileDisplayContainer.vue').default;

const mount = () => {
  const vm = new Vue({ render: (h) => h(ProfileDisplayContainer) }).$mount();
  return { container: vm.$children[0], el: vm.$el };
};
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  mockKeep.saved = false;
  mockKeep.applied = true;
  mockKeep.calls = [];
});

describe('ProfileDisplayContainer', () => {
  it('starts from what this device saved', () => {
    mockKeep.saved = true;
    expect(mount().container.alwaysOn).toBe(true);
  });

  it('turns it on and hands the page its toast', async () => {
    const { container } = mount();
    const toasts = [];
    container.$on('changed', (t) => toasts.push(t.title));
    await container.setAlwaysOn(true);
    expect(container.alwaysOn).toBe(true);
    expect(mockKeep.calls).toEqual([true]);
    expect(toasts).toEqual(['Always on display is on']);
  });

  it('puts the switch back when the device refuses, and says so', async () => {
    mockKeep.applied = false;
    const { container } = mount();
    const failed = [];
    container.$on('failed', (m) => failed.push(m));
    await container.setAlwaysOn(true);
    await flush();
    expect(container.alwaysOn).toBe(false);
    expect(mockKeep.calls).toEqual([true, false]);
    expect(failed).toEqual(['This device kept its usual screen sleep']);
  });
});
