import { PushNotifications } from '@capacitor/push-notifications';
import { handlePendingAction } from './actionHandler';

class PushService {

  async init() {

    await PushNotifications.requestPermissions();
    await PushNotifications.register();

    // Token
    PushNotifications.addListener('registration', (token) => {
      console.log('Token:', token.value);
    });

    // When user taps notification OR button
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (event) => {

        // store action (important for cold start)
        localStorage.setItem(
          "pendingAction",
          JSON.stringify(event)
        );

      }
    );

    // process stored action after app loads
    handlePendingAction();

  }
}

export default new PushService();