// src/services/pushService.js
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isSignedIn } from './pushSession';
import {
  ACTION_TYPES, actionTypeFor, buttonOf, isDrawnByApp, routeFor,
} from './notificationRoutes';

// LocalNotifications ids must fit a 32-bit int on Android; Date.now() does not.
const localId = () => Math.floor(Date.now() % 2147483647);

class PushService {
  constructor() {
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    try {
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        console.warn('Push notification permission not granted');
        return;
      }

      const localPermResult = await LocalNotifications.requestPermissions();
      if (localPermResult.display !== 'granted') {
        console.warn('Local notification permission not granted');
        return;
      }

      // Both platforms: on iOS these become the UNNotificationCategories a
      // push's `aps.category` picks its buttons from.
      await this.registerNotificationCategories();

      // Token registration with the server is App.vue's (registerDevicePush).
      await PushNotifications.register();
      this.setupListeners();

      this.isInitialized = true;
      console.log('PushService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PushService:', error);
    }
  }

  async registerNotificationCategories() {
    try {
      await LocalNotifications.registerActionTypes({ types: ACTION_TYPES });
      console.log('✅ Notification action categories registered successfully');
    } catch (error) {
      console.error('❌ Error registering notification categories:', error);
    }
  }

  setupListeners() {
    // Foreground: the OS does not show it, so re-post it with its buttons —
    // unless the Android app already drew it (RoutineNotification.java).
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      if (!isSignedIn() || isDrawnByApp(notification.data)) return;
      await this.showLocalNotificationWithActions(notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', async (action) => {
      await this.handleNotificationAction(action);
    });

    LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
      await this.handleNotificationAction(action);
    });
  }

  async showLocalNotificationWithActions(notification) {
    try {
      const data = notification.data || {};
      const title = notification.title || data.title || 'Routine Reminder';
      const body = notification.body || data.body || 'Time for your routine!';

      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id: localId(),
          schedule: { at: new Date(Date.now() + 500) },
          sound: 'default',
          actionTypeId: actionTypeFor(data),
          channelId: data.cue === 'alarm' || data.cue === 'alarmRepeat' ? 'routine-alarms' : 'routine-notifications',
          extra: { ...data, originalTitle: title, originalBody: body },
        }],
      });
    } catch (error) {
      console.error('❌ Error showing local notification with actions:', error);
    }
  }

  async handleNotificationAction(action) {
    const { actionId, notification } = action;
    const data = notification?.data || notification?.extra || {};

    try {
      if (!isSignedIn()) return;
      // Android's own notification reports every tap as 'tap' and names the
      // button in the data; route it as the iOS button of the same id.
      const route = routeFor(buttonOf(actionId, data), data);
      const router = window.app && window.app.$router;
      if (route && router) router.push(route).catch(() => {});
      this.trackAction(buttonOf(actionId, data), data);
    } catch (error) {
      console.error(`❌ Error handling action ${actionId}:`, error);
    }
  }

  trackAction(action, data) {
    if (window.app?.$analytics) {
      window.app.$analytics.track('notification_action', {
        action,
        routineId: data.routineId || data.taskId,
        kind: data.kind || data.cue,
      });
    }
  }
}

export default new PushService();
