// src/services/pushService.js
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isSignedIn } from './pushSession';
import { ACTION_TYPES, actionTypeFor, routeFor } from './notificationRoutes';

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
    // Foreground: the OS does not show it, so re-post it with its buttons.
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      if (!isSignedIn()) return;
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
      if (actionId === 'SNOOZE' || actionId === 'REMIND_LATER') {
        await this.handleSnooze(data);
        return;
      }
      if (actionId === 'SKIP') {
        await this.handleSkip(data);
        return;
      }
      const route = routeFor(actionId, data);
      const router = window.app && window.app.$router;
      if (route && router) router.push(route).catch(() => {});
      this.trackAction(actionId, data);
    } catch (error) {
      console.error(`❌ Error handling action ${actionId}:`, error);
    }
  }

  async handleSnooze(data) {
    console.log('😴 Snooze action triggered', data);

    // Schedule another notification in 10 minutes
    const snoozeTime = new Date(Date.now() + 10 * 60 * 1000);

    await LocalNotifications.schedule({
      notifications: [{
        title: `⏰ ${data.originalTitle || 'Routine Reminder'} (Snoozed)`,
        body: data.originalBody || 'Time for your routine!',
        id: localId(),
        schedule: { at: snoozeTime },
        actionTypeId: actionTypeFor(data),
        extra: data,
      }],
    });

    await this.showFeedbackNotification('Snoozed for 10 minutes ⏰', 'info');
    this.trackAction('snooze', data);
  }

  async handleSkip(data) {
    console.log('⏭️ Skip action triggered', data);
    await this.showFeedbackNotification('Task skipped', 'info');
    this.trackAction('skip', data);
  }

  async showFeedbackNotification(message, type = 'info') {
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️',
    };

    await LocalNotifications.schedule({
      notifications: [{
        title: `${icons[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        body: message,
        id: localId(),
        schedule: { at: new Date(Date.now() + 100) },
        sound: type === 'error' ? 'default' : null,
      }],
    });
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
