import { PushNotifications } from '@capacitor/push-notifications';
import { handlePendingAction } from './actionHandler';

class PushService {

  async init() {

    await PushNotifications.requestPermissions();
    await PushNotifications.register();

    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (event) => {

        console.log("Action clicked:", event);

        // store for cold start
        localStorage.setItem(
          "pendingAction",
          JSON.stringify(event)
        );

      }
    );

    // process after app loads
    handlePendingAction();

  }

}

export default new PushService();