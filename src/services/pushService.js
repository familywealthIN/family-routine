// src/services/pushService.js
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

class PushService {
  constructor() {
    this.isInitialized = false;
    this.pendingActions = [];
  }

  async init() {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        console.warn('Push notification permission not granted');
        return;
      }

      // Register for push notifications
      await PushNotifications.register();

      // Set up listeners
      this.setupListeners();

      // Process any pending actions from cold start
      await this.processPendingActions();

      this.isInitialized = true;
      console.log('PushService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PushService:', error);
    }
  }

  setupListeners() {
    // Foreground notification listener - create interactive notification
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('Push notification received in foreground:', notification);

      // Check if this notification should have actions
      if (notification.data?.hasActions === 'true') {
        await this.showInteractiveLocalNotification(notification);
      } else {
        // Show regular notification
        await this.showRegularLocalNotification(notification);
      }
    });

    // Handle notification taps and actions
    PushNotifications.addListener('pushNotificationActionPerformed', async (action) => {
      console.log('Push notification action performed:', action);
      await this.handleNotificationAction(action);
    });

    // Handle local notification actions
    LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
      console.log('Local notification action performed:', action);
      await this.handleLocalNotificationAction(action);
    });
  }

  async handleLocalNotificationAction(action) {
    const { actionId, notification } = action;
    const data = notification?.extra || {};

    console.log(`Handling local notification action: ${actionId}`, data);

    switch (actionId) {
      case 'DO_NOW':
        await this.handleDoNow(data);
        break;
      case 'COMPLETE':
        await this.handleComplete(data);
        break;
      case 'SNOOZE':
        await this.handleSnooze(data);
        break;
      default:
        console.log('Unknown local notification action:', actionId);
    }
  }
  async showRegularLocalNotification(notification) {
    try {
      const localNotification = {
        title: notification.title || 'Notification',
        body: notification.body || '',
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 100) },
        sound: 'default',
        extra: notification.data || {},
      };

      await LocalNotifications.schedule({
        notifications: [localNotification],
      });
    } catch (error) {
      console.error('Error showing regular local notification:', error);
    }
  }
  async showInteractiveLocalNotification(notification) {
    try {
      const data = notification.data || {};

      // Create local notification with actions
      const localNotification = {
        title: notification.title || data.title || 'Routine Reminder',
        body: notification.body || data.body || 'Time for your routine!',
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 100) },
        sound: 'default',
        actionTypeId: 'ROUTINE_ACTIONS',
        extra: data,
        actions: [
          {
            id: 'DO_NOW',
            title: data.action1Title || 'Do Now',
            requiresAuthentication: false,
            foreground: true,
          },
          {
            id: 'COMPLETE',
            title: data.action2Title || 'Complete',
            requiresAuthentication: false,
            foreground: true,
          },
          {
            id: 'SNOOZE',
            title: data.action3Title || 'Snooze 10min',
            requiresAuthentication: false,
            foreground: false,
          },
        ],
      };

      await LocalNotifications.schedule({
        notifications: [localNotification],
      });

      console.log('Interactive local notification scheduled');
    } catch (error) {
      console.error('Error showing interactive local notification:', error);
    }
  }
  async showLocalNotificationWithActions(notification) {
    try {
      const localNotification = {
        title: notification.title || 'Routine Reminder',
        body: notification.body || 'Time for your routine!',
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 100) },
        sound: 'default',
        actionTypeId: 'ROUTINE_ACTIONS',
        extra: notification.data || {},
        actions: [
          {
            id: 'DO_NOW',
            title: 'Do Now',
            requiresAuthentication: false,
            foreground: true,
          },
          {
            id: 'COMPLETE',
            title: 'Complete',
            requiresAuthentication: false,
            foreground: true,
          },
          {
            id: 'SNOOZE',
            title: 'Snooze 10min',
            requiresAuthentication: false,
            foreground: false,
          },
        ],
      };

      await LocalNotifications.schedule({
        notifications: [localNotification],
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  storeAction(action) {
    // Store action in localStorage for cold start scenarios
    const storedActions = JSON.parse(localStorage.getItem('pendingNotificationActions') || '[]');
    storedActions.push({
      ...action,
      timestamp: Date.now(),
    });

    // Keep only last 10 actions
    if (storedActions.length > 10) {
      storedActions.splice(0, storedActions.length - 10);
    }

    localStorage.setItem('pendingNotificationActions', JSON.stringify(storedActions));
  }

  async processPendingActions() {
    try {
      const storedActions = JSON.parse(localStorage.getItem('pendingNotificationActions') || '[]');

      // Process actions from last 5 minutes only
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const recentActions = storedActions.filter(action => action.timestamp > fiveMinutesAgo);

      for (const action of recentActions) {
        await this.handleNotificationAction(action);
      }

      // Clear processed actions
      localStorage.removeItem('pendingNotificationActions');
    } catch (error) {
      console.error('Error processing pending actions:', error);
    }
  }

  async handleNotificationAction(action) {
    const { actionId, notification } = action;
    const data = notification?.data || {};

    console.log(`Handling action: ${actionId}`, data);

    try {
      switch (actionId) {
        case 'DO_NOW':
          await this.handleDoNow(data);
          break;
        case 'COMPLETE':
          await this.handleComplete(data);
          break;
        case 'SNOOZE':
          await this.handleSnooze(data);
          break;
        default:
          console.log('Unknown action:', actionId);
      }
    } catch (error) {
      console.error(`Error handling action ${actionId}:`, error);
    }
  }

  async handleDoNow(data) {
    console.log('Do Now action triggered', data);

    // Navigate to the specific routine/task
    if (data.taskId) {
      // Use Vue router or your navigation method
      if (window.app && window.app.$router) {
        window.app.$router.push(`/routine/${data.taskId}`);
      }
    }

    // Send analytics event
    this.trackAction('do_now', data);
  }

  async handleComplete(data) {
    console.log('Complete action triggered', data);

    try {
      // Call your API to mark task as complete
      const response = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          taskId: data.taskId,
          habitId: data.habitId,
          completedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        // Show success notification
        await this.showSuccessNotification('Task completed successfully!');

        // Refresh app data if app is open
        if (window.app && window.app.$apollo) {
          window.app.$apollo.queries.goals?.refetch();
          window.app.$apollo.queries.tasklist?.refetch();
        }
      }
    } catch (error) {
      console.error('Error completing task:', error);
      await this.showErrorNotification('Failed to complete task');
    }

    this.trackAction('complete', data);
  }

  async handleSnooze(data) {
    console.log('Snooze action triggered', data);

    // Schedule another notification in 10 minutes
    const snoozeTime = new Date(Date.now() + 10 * 60 * 1000);

    await LocalNotifications.schedule({
      notifications: [{
        title: data.title || 'Routine Reminder (Snoozed)',
        body: data.body || 'Time for your routine!',
        id: Date.now(),
        schedule: { at: snoozeTime },
        extra: data,
        actionTypeId: 'ROUTINE_ACTIONS',
        actions: [
          { id: 'DO_NOW', title: 'Do Now', foreground: true },
          { id: 'COMPLETE', title: 'Complete', foreground: true },
          { id: 'SNOOZE', title: 'Snooze 10min', foreground: false },
        ],
      }],
    });

    this.trackAction('snooze', data);
  }

  async showSuccessNotification(message) {
    await LocalNotifications.schedule({
      notifications: [{
        title: 'Success',
        body: message,
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 100) },
      }],
    });
  }

  async showErrorNotification(message) {
    await LocalNotifications.schedule({
      notifications: [{
        title: 'Error',
        body: message,
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 100) },
      }],
    });
  }

  async sendTokenToServer(token) {
    try {
      await fetch('/api/push-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.error('Failed to send token to server:', error);
    }
  }

  trackAction(action, data) {
    // Send analytics event
    if (window.app && window.app.$analytics) {
      window.app.$analytics.track('notification_action', {
        action,
        taskId: data.taskId,
        habitId: data.habitId,
      });
    }
  }
}

export default new PushService();
