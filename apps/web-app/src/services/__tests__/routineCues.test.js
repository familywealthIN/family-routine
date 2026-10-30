jest.mock('@capacitor/core', () => {
  const plugin = {
    status: jest.fn(),
    endLiveActivities: jest.fn(() => Promise.resolve()),
    requestAlarmAuthorization: jest.fn(),
    syncAlarms: jest.fn(() => Promise.resolve({ scheduled: 0 })),
    addListener: jest.fn(),
  };
  return {
    Capacitor: { getPlatform: jest.fn(() => 'ios') },
    registerPlugin: jest.fn(() => plugin),
    mockPlugin: plugin,
  };
});

/* eslint-disable import/first */
import { Capacitor, mockPlugin } from '@capacitor/core';
import { GC_AUTH_TOKEN, GC_NOTIFICATION_TOKEN } from '../../constants/settings';
import {
  alarmKey, clearRoutineCues, routeForCue, startRoutineCues, syncAlarms, syncRoutineCues,
} from '../routineCues';
/* eslint-enable import/first */

const alarm = (fireAt, title, repeat) => ({
  routineId: 'r1',
  time: '07:00',
  date: '30-10-2026',
  fireAt,
  title,
  button: 'START_AGENT',
  buttonTitle: 'Start agent',
  repeat,
});
const plan = {
  through: '2026-11-06T04:00:00.000Z',
  alarms: [
    alarm('2026-10-30T11:00:00.000Z', 'Yoga', false),
    alarm('2026-10-30T11:05:00.000Z', 'Still on: Yoga', true),
  ],
};
const client = (deviceAlarms = plan) => ({
  query: jest.fn(() => Promise.resolve({ data: { deviceAlarms } })),
  mutate: jest.fn(() => Promise.resolve({})),
});
const mutations = (c) => c.mutate.mock.calls.map(([call]) => [call.mutation.definitions[0].name.value, call.variables]);

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(GC_AUTH_TOKEN, 'jwt');
  localStorage.setItem(GC_NOTIFICATION_TOKEN, 'fcm-iphone');
  Capacitor.getPlatform.mockReturnValue('ios');
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => console.log.mockRestore());

describe('syncAlarms', () => {
  it('schedules the planned alarms and tells the server which routines it rings', async () => {
    const c = client();
    await expect(syncAlarms(c, 'fcm-iphone', { alarms: 'authorized' })).resolves.toBe('authorized');
    expect(mockPlugin.syncAlarms).toHaveBeenCalledWith({
      alarms: plan.alarms.map(({
        fireAt, title, routineId, button, buttonTitle,
      }) => ({
        fireAt, title, routineId, button, buttonTitle,
      })),
    });
    expect(mutations(c)).toEqual([['registerAlarmDevice', {
      notificationId: 'fcm-iphone', through: plan.through, routines: ['r1@07:00'],
    }]]);
  });

  it('asks for the alarm permission only once there is an alarm to ring', async () => {
    mockPlugin.requestAlarmAuthorization.mockResolvedValueOnce({ alarms: 'authorized' });
    await syncAlarms(client(), 'fcm-iphone', { alarms: 'notDetermined' });
    expect(mockPlugin.requestAlarmAuthorization).toHaveBeenCalledTimes(1);

    const none = client({ through: plan.through, alarms: [] });
    await expect(syncAlarms(none, 'fcm-iphone', { alarms: 'notDetermined' })).resolves.toBe('notDetermined');
    expect(mockPlugin.requestAlarmAuthorization).toHaveBeenCalledTimes(1);
  });

  it('not allowed: schedules nothing, and the alarm push keeps coming', async () => {
    const c = client();
    await expect(syncAlarms(c, 'fcm-iphone', { alarms: 'denied' })).resolves.toBe('denied');
    expect(mockPlugin.syncAlarms).not.toHaveBeenCalled();
    expect(mutations(c)).toEqual([['registerAlarmDevice', { notificationId: 'fcm-iphone', through: null }]]);
  });

  it('before iOS 26 asks the server nothing', async () => {
    const c = client();
    await expect(syncAlarms(c, 'fcm-iphone', { alarms: 'unsupported' })).resolves.toBe('unsupported');
    expect(c.query).not.toHaveBeenCalled();
    expect(c.mutate).not.toHaveBeenCalled();
  });
});

describe('syncRoutineCues', () => {
  it('registers the Live Activity token, or takes it back when turned off', async () => {
    mockPlugin.status.mockResolvedValueOnce({ liveActivities: true, startToken: 'ab12', alarms: 'unsupported' });
    const c = client();
    await expect(syncRoutineCues(c, 'fcm-iphone', { force: true })).resolves.toBe(true);
    expect(mutations(c)).toEqual([['registerLiveActivity', { notificationId: 'fcm-iphone', startToken: 'ab12' }]]);

    mockPlugin.status.mockResolvedValueOnce({ liveActivities: false, startToken: 'ab12', alarms: 'unsupported' });
    const off = client();
    await syncRoutineCues(off, 'fcm-iphone', { force: true });
    expect(mutations(off)).toEqual([['registerLiveActivity', { notificationId: 'fcm-iphone', startToken: null }]]);
  });

  it('runs at most once a minute unless forced, only on a signed-in iPhone, and never throws', async () => {
    mockPlugin.status.mockResolvedValue({ liveActivities: false, alarms: 'unsupported' });
    await syncRoutineCues(client(), 'fcm-iphone', { force: true });
    await expect(syncRoutineCues(client(), 'fcm-iphone')).resolves.toBe(false);

    Capacitor.getPlatform.mockReturnValue('android');
    await expect(syncRoutineCues(client(), 'fcm-phone', { force: true })).resolves.toBe(false);
    Capacitor.getPlatform.mockReturnValue('ios');
    localStorage.removeItem(GC_AUTH_TOKEN);
    await expect(syncRoutineCues(client(), 'fcm-iphone', { force: true })).resolves.toBe(false);

    localStorage.setItem(GC_AUTH_TOKEN, 'jwt');
    mockPlugin.status.mockRejectedValueOnce(new Error('not implemented'));
    await expect(syncRoutineCues(client(), 'fcm-iphone', { force: true })).resolves.toBe(false);
  });
});

describe('buttons', () => {
  it('go where the notification button of the same id goes', () => {
    expect(routeForCue({ button: 'DO_NOW', routineId: 'r1' })).toBe('/home/r1/focus?src=push');
    expect(routeForCue({ button: 'COMPLETE', routineId: 'r1' })).toBe('/home/r1/complete?src=push');
    expect(routeForCue({ button: 'START_AGENT', routineId: 'r1' })).toBe('/home/r1/start?src=push');
    expect(routeForCue({ button: 'BUILD_AGENT', routineId: 'r1' })).toBe('/home/r1/build?src=push');
    // A tap on the card opens the routine, acting on nothing.
    expect(routeForCue({ button: 'tap', routineId: 'r1' })).toBe('/home/r1/focus?src=push');
  });

  it('a tap routes the app, clears the cards, and resyncs when the app comes back', () => {
    mockPlugin.status.mockResolvedValue({ liveActivities: false, alarms: 'unsupported' });
    const push = jest.fn(() => Promise.resolve());
    startRoutineCues(client(), { router: () => ({ push }) });
    expect(mockPlugin.endLiveActivities).toHaveBeenCalledTimes(1);
    const onAction = mockPlugin.addListener.mock.calls.find(([name]) => name === 'action')[1];
    onAction({ button: 'START_AGENT', routineId: 'r1' });
    expect(push).toHaveBeenCalledWith('/home/r1/start?src=push');

    localStorage.removeItem(GC_AUTH_TOKEN);
    onAction({ button: 'DO_NOW', routineId: 'r1' });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('names alarms the way the server and cron do', () => {
    expect(alarmKey({ routineId: 'r1', time: '07:00' })).toBe('r1@07:00');
  });
});

describe('clearRoutineCues', () => {
  it('sign-out ends the cards and cancels the alarms', async () => {
    mockPlugin.status.mockResolvedValueOnce({ alarms: 'authorized' });
    await clearRoutineCues();
    expect(mockPlugin.endLiveActivities).toHaveBeenCalled();
    expect(mockPlugin.syncAlarms).toHaveBeenCalledWith({ alarms: [] });
  });
});
