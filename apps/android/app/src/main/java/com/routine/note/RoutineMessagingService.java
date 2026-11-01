package com.routine.note;

import androidx.annotation.NonNull;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;

/**
 * Replaces the push plugin's Firebase service (AndroidManifest.xml removes
 * the plugin's): routine cues sent data-only (display=app) are drawn with
 * their buttons by RoutineNotification. Everything still goes on to the
 * plugin, so the web app hears it; it does not re-post display=app messages.
 */
public class RoutineMessagingService extends MessagingService {

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        if (remoteMessage.getNotification() == null && "app".equals(remoteMessage.getData().get("display"))) {
            RoutineNotification.show(this, remoteMessage.getMessageId(), remoteMessage.getData());
        }
        super.onMessageReceived(remoteMessage);
    }
}
