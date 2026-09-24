/* eslint-env jest */
/**
 * D-10 follow-up: the header points chip read `0` while the API was down —
 * a balance the app does not actually know. Both layouts own a copy of the
 * chip, so both must flag a failed xpBalance load and both must keep a cached
 * balance in preference to the dash.
 *
 * Hooks are exercised against a minimal vm-like context (no mount), matching
 * the pages/__tests__/loadErrorState.test.js convention.
 */
// These layouts pull the ui barrels, which transitively import third-party
// components shipped as raw .vue files in node_modules (jest won't transform
// them). Stub them — they play no part in the error handling.
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
// Same for the native sign-in plugins, which ship untranspiled ESM.
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

const DesktopLayout = require('../DesktopLayout.vue').default;
const MobileLayout = require('../MobileLayout.vue').default;

describe.each([
  ['DesktopLayout', DesktopLayout],
  ['MobileLayout', MobileLayout],
])('%s xpBalance load error', (name, Layout) => {
  const query = () => Layout.apollo.xpBalance;

  it('starts with no failure recorded', () => {
    expect(Layout.data().xpBalanceError).toBe(false);
  });

  it('flags a failed balance load', () => {
    const vm = { xpBalanceError: false };
    query().error.call(vm, new Error('Failed to fetch'));
    expect(vm.xpBalanceError).toBe(true);
  });

  it('clears the failure once a result arrives', () => {
    const vm = { xpBalanceError: true };
    query().result.call(vm, { data: { xpBalance: { available: 12 } } });
    expect(vm.xpBalanceError).toBe(false);
  });

  it('keeps the failure when a result carries no data', () => {
    const vm = { xpBalanceError: true };
    query().result.call(vm, { data: undefined });
    expect(vm.xpBalanceError).toBe(true);
  });
});
