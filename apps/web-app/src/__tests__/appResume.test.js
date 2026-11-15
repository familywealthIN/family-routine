/* eslint-env jest */
/**
 * Coming back to the app. It used to reload the whole app after 15 minutes
 * away, so most opens started from nothing. Now only a day change OFF Home
 * reloads: Home rolls over in place, and every other page was built for a day
 * that has ended.
 */
jest.mock('firebase/app', () => ({ initializeApp: jest.fn(), messaging: jest.fn() }));
jest.mock('firebase/messaging', () => ({}));
jest.mock('@capacitor/push-notifications', () => ({ PushNotifications: {} }));
jest.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }));
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' } }));
jest.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: {} }));
jest.mock('vue-radar', () => ({ __esModule: true, default: {} }));
jest.mock('vue-easymde', () => ({ __esModule: true, default: {} }));
jest.mock('../blob/config', () => ({
  config: {}, publicKey: '', isDevelopment: false, netlify: false, gauthOption: {}, graphQLUrl: '',
}), { virtual: true });

const moment = require('moment');
const App = require('../App.vue').default;

const { handleAppVisibility } = App.methods;

function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

describe('coming back to the app', () => {
  let reload;

  beforeEach(() => {
    reload = jest.fn();
    jest.useFakeTimers('modern');
    jest.setSystemTime(moment('11-11-2026 21:00', 'DD-MM-YYYY HH:mm').toDate());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const away = (vm, until) => {
    setVisibility('hidden');
    handleAppVisibility.call(vm);
    jest.setSystemTime(moment(until, 'DD-MM-YYYY HH:mm').toDate());
    setVisibility('visible');
    handleAppVisibility.call(vm);
  };

  it('does not reload after a long time away on the same day', () => {
    const vm = { hiddenOnDay: '', reloadApp: reload, $route: { meta: { appShell: true } } };
    away(vm, '11-11-2026 23:30');
    expect(reload).not.toHaveBeenCalled();
  });

  it('does not reload Home on a new day: Home rolls over in place', () => {
    const vm = { hiddenOnDay: '', reloadApp: reload, $route: { meta: { focusHome: true } } };
    away(vm, '12-11-2026 07:00');
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads any other page once on a new day', () => {
    const vm = { hiddenOnDay: '', reloadApp: reload, $route: { meta: { appShell: true } } };
    away(vm, '12-11-2026 07:00');
    expect(reload).toHaveBeenCalledTimes(1);
    // A second wake the same morning does not reload again.
    setVisibility('visible');
    handleAppVisibility.call(vm);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
