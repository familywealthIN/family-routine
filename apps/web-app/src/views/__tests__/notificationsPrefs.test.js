jest.mock('../../containers/AppShellContainer.vue', () => ({ render: () => null }));
jest.mock('../../utils/signOut', () => ({ signOut: jest.fn() }));

/* eslint-disable import/first */
import Notifications, { PREF_ROWS, UPDATE_NOTIFICATION_PREFS } from '../Notifications.vue';
/* eslint-enable import/first */

const vm = (mutate) => ({
  prefs: Notifications.data().prefs,
  $apollo: { mutate },
  $notify: jest.fn(),
});

describe('notification settings page', () => {
  it('lists every lifecycle notification, with times for morning and evening', () => {
    expect(PREF_ROWS.map((r) => r.key)).toEqual(['morning', 'plan', 'evening', 'streak', 'insights', 'reengage']);
    expect(PREF_ROWS.filter((r) => r.timeKey).map((r) => r.timeKey)).toEqual(['morningTime', 'eveningTime']);
  });

  it('saves one change at a time and takes the server\'s answer', async () => {
    const mutate = jest.fn(() => Promise.resolve({
      data: { updateNotificationPrefs: { ...Notifications.data().prefs, morning: false } },
    }));
    const self = vm(mutate);
    await Notifications.methods.setPref.call(self, 'morning', false);
    expect(mutate).toHaveBeenCalledWith({ mutation: UPDATE_NOTIFICATION_PREFS, variables: { prefs: { morning: false } } });
    expect(self.prefs.morning).toBe(false);
  });

  it('puts the switch back when the save fails', async () => {
    const self = vm(jest.fn(() => Promise.reject(new Error('offline'))));
    await Notifications.methods.setPref.call(self, 'evening', false);
    expect(self.prefs.evening).toBe(true);
    expect(self.$notify).toHaveBeenCalled();
  });
});
