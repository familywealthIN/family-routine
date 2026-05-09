// src/services/pushService.js (Complete updated version)
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

class PushService {
  constructor() {
    this.isInitialized = false;
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

      const localPermResult = await LocalNotifications.requestPermissions();
      if (localPermResult.display !== 'granted') {
        console.warn('Local notification permission not granted');
        return;
      }

      // For iOS, we don't need to register categories here - they're in native code
      if (Capacitor.getPlatform() === 'android') {
        await this.registerNotificationCategories();
      }

      await PushNotifications.register();
      this.setupListeners();

      this.isInitialized = true;
      console.log('PushService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PushService:', error);
    }
  }

  // async init() {
  //   if (this.isInitialized) return;

  //   try {
  //     // Request permissions first
  //     const permResult = await PushNotifications.requestPermissions();
  //     if (permResult.receive !== 'granted') {
  //       console.warn('Push notification permission not granted');
  //       return;
  //     }

  //     const localPermResult = await LocalNotifications.requestPermissions();
  //     if (localPermResult.display !== 'granted') {
  //       console.warn('Local notification permission not granted');
  //       return;
  //     }

  //     // IMPORTANT: Register notification categories with actions
  //     await this.registerNotificationCategories();

  //     // Register for push notifications
  //     await PushNotifications.register();

  //     // Set up listeners
  //     this.setupListeners();

  //     this.isInitialized = true;
  //     console.log('PushService initialized successfully with action categories');
  //   } catch (error) {
  //     console.error('Failed to initialize PushService:', error);
  //   }
  // }

  async registerNotificationCategories() {
    try {
      // Register notification categories with actions
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'ROUTINE_ACTIONS',
            actions: [
              {
                id: 'DO_NOW',
                title: 'Do Now',
                requiresAuthentication: false,
                foreground: true,
                destructive: false,
              },
              {
                id: 'COMPLETE',
                title: 'Complete',
                requiresAuthentication: false,
                foreground: true,
                destructive: false,
              },
              {
                id: 'SNOOZE',
                title: 'Snooze 10min',
                requiresAuthentication: false,
                foreground: false,
                destructive: false,
              },
            ],
          },
          {
            id: 'HABIT_ACTIONS',
            actions: [
              {
                id: 'MARK_DONE',
                title: 'Mark Done',
                requiresAuthentication: false,
                foreground: true,
                destructive: false,
              },
              {
                id: 'SKIP',
                title: 'Skip',
                requiresAuthentication: false,
                foreground: false,
                destructive: true,
              },
              {
                id: 'REMIND_LATER',
                title: 'Remind Later',
                requiresAuthentication: false,
                foreground: false,
                destructive: false,
              },
            ],
          },
        ],
      });

      console.log('✅ Notification action categories registered successfully');
    } catch (error) {
      console.error('❌ Error registering notification categories:', error);
    }
  }

  setupListeners() {
    // Registration listener
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token:', token.value);
      this.sendTokenToServer(token.value);
    });

    // Foreground notification listener
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('📱 Push notification received in foreground:', notification);

      // Always show as local notification with actions for foreground
      await this.showLocalNotificationWithActions(notification);
    });

    // Background/killed app notification action listener
    PushNotifications.addListener('pushNotificationActionPerformed', async (action) => {
      console.log('🔔 Push notification action performed:', action);
      await this.handleNotificationAction(action);
    });

    // Local notification action listener
    LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
      console.log('📲 Local notification action performed:', action);
      await this.handleNotificationAction(action);
    });

    // Regular local notification received
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('📬 Local notification received:', notification);
    });
  }

  async showLocalNotificationWithActions(notification) {
    try {
      const data = notification.data || {};
      const title = notification.title || data.title || 'Routine Reminder';
      const body = notification.body || data.body || 'Time for your routine!';

      // Determine which action type to use
      const actionTypeId = data.actionType === 'habit_actions' ? 'HABIT_ACTIONS' : 'ROUTINE_ACTIONS';

      const localNotification = {
        title,
        body,
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 500) }, // Small delay to ensure proper display
        sound: 'default',
        actionTypeId, // This links to registered categories
        extra: {
          ...data,
          originalTitle: title,
          originalBody: body,
        },
        // Don't specify actions here - they come from the registered actionTypeId
      };

      await LocalNotifications.schedule({
        notifications: [localNotification],
      });

      console.log(`✅ Local notification with actions scheduled (${actionTypeId})`);
    } catch (error) {
      console.error('❌ Error showing local notification with actions:', error);
    }
  }

  async handleNotificationAction(action) {
    const { actionId, notification } = action;
    // Get data from either notification.data or notification.extra
    const data = notification?.data || notification?.extra || {};

    console.log(`🎯 Handling action: ${actionId}`, data);

    try {
      switch (actionId) {
        case 'DO_NOW':
        case 'MARK_DONE':
          await this.handleDoNow(data);
          break;
        case 'COMPLETE':
          await this.handleComplete(data);
          break;
        case 'SNOOZE':
        case 'REMIND_LATER':
          await this.handleSnooze(data);
          break;
        case 'SKIP':
          await this.handleSkip(data);
          break;
        default:
          console.log('❓ Unknown action:', actionId);
      }
    } catch (error) {
      console.error(`❌ Error handling action ${actionId}:`, error);
    }
  }

  async handleDoNow(data) {
    console.log('▶️ Do Now action triggered', data);

    // Show feedback notification
    await this.showFeedbackNotification('Starting now! 💪', 'success');

    // Navigate to the specific routine/task
    if (data.taskId && window.app?.$router) {
      window.app.$router.push(`/routine/${data.taskId}`);
    }

    this.trackAction('do_now', data);
  }

  async handleComplete(data) {
    console.log('✅ Complete action triggered', data);

    try {
      // Call your API to mark task as complete
      const authToken = localStorage.getItem('authToken') || localStorage.getItem('GC_AUTH_TOKEN');

      if (!authToken) {
        await this.showFeedbackNotification('Please log in to complete tasks', 'error');
        return;
      }

      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: `
            mutation completeTask($taskId: ID!) {
              completeTask(taskId: $taskId) {
                id
                completed
              }
            }
          `,
          variables: {
            taskId: data.taskId || data.habitId,
          },
        }),
      });

      if (response.ok) {
        await this.showFeedbackNotification('Task completed! 🎉', 'success');

        // Refresh app data if app is open
        if (window.app?.$apollo) {
          if (window.app.$apollo.queries.goals) window.app.$apollo.queries.goals.refetch();
          if (window.app.$apollo.queries.tasklist) window.app.$apollo.queries.tasklist.refetch();
        }
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      await this.showFeedbackNotification('Failed to complete task 😞', 'error');
    }

    this.trackAction('complete', data);
  }

  async handleSnooze(data) {
    console.log('😴 Snooze action triggered', data);

    // Schedule another notification in 10 minutes
    const snoozeTime = new Date(Date.now() + 10 * 60 * 1000);

    await LocalNotifications.schedule({
      notifications: [{
        title: `⏰ ${data.originalTitle || 'Routine Reminder'} (Snoozed)`,
        body: data.originalBody || 'Time for your routine!',
        id: Date.now(),
        schedule: { at: snoozeTime },
        actionTypeId: 'ROUTINE_ACTIONS',
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
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 100) },
        sound: type === 'error' ? 'default' : null,
      }],
    });
  }

  async sendTokenToServer(token) {
    try {
      const authToken = localStorage.getItem('authToken') || localStorage.getItem('GC_AUTH_TOKEN');

      await fetch('/api/push-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token }),
      });
    } catch (error) {
      console.error('Failed to send token to server:', error);
    }
  }

  trackAction(action, data) {
    if (window.app?.$analytics) {
      window.app.$analytics.track('notification_action', {
        action,
        taskId: data.taskId,
        habitId: data.habitId,
      });
    }
  }
}

export default new PushService();
