jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
jest.mock('../../blob/config', () => ({ gauthOption: {} }), { virtual: true });
jest.mock('../../token', () => ({ clearData: jest.fn(() => Promise.resolve()) }));
jest.mock('localforage', () => ({ clear: jest.fn(() => Promise.resolve()) }));

/* eslint-disable import/first */
import localforage from 'localforage';
import { signOut } from '../signOut';
/* eslint-enable import/first */

function makeVm(overrides = {}) {
  const calls = [];
  localforage.clear.mockImplementation(() => { calls.push('localforage.clear'); return Promise.resolve(); });
  const vm = {
    $gAuth: { signOut: jest.fn(() => Promise.resolve()) },
    $apollo: {
      provider: {
        defaultClient: {
          clearStore: jest.fn(() => { calls.push('clearStore'); return Promise.resolve(); }),
        },
      },
    },
    $root: { $data: { name: 'Old User', email: 'old@example.com', picture: 'http://x/old.png' } },
    $router: { push: jest.fn(() => Promise.resolve()) },
    ...overrides,
  };
  return { vm, calls };
}

describe('signOut', () => {
  beforeEach(() => jest.clearAllMocks());

  it('clears the in-memory Apollo store before the persisted cache', async () => {
    const { vm, calls } = makeVm();
    await signOut(vm);
    expect(vm.$apollo.provider.defaultClient.clearStore).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['clearStore', 'localforage.clear']);
  });

  it('resets the signed-in identity the shell reads off the root', async () => {
    const { vm } = makeVm();
    await signOut(vm);
    expect(vm.$root.$data).toEqual({ name: '', email: '', picture: '' });
    expect(vm.$router.push).toHaveBeenCalledWith('/');
  });

  it('still clears persisted storage and navigates when clearStore fails', async () => {
    const { vm } = makeVm();
    vm.$apollo.provider.defaultClient.clearStore.mockImplementation(() => Promise.reject(new Error('boom')));
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await signOut(vm);
    expect(localforage.clear).toHaveBeenCalledTimes(1);
    expect(vm.$router.push).toHaveBeenCalledWith('/');
    console.log.mockRestore();
  });

  it('tolerates a caller without $apollo', async () => {
    const { vm } = makeVm({ $apollo: undefined });
    await signOut(vm);
    expect(localforage.clear).toHaveBeenCalledTimes(1);
  });
});
