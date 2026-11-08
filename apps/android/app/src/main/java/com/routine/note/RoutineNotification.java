package com.routine.note;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.util.Map;

/**
 * A routine cue drawn by the app itself, so it carries the planned buttons.
 *
 * Android has no equivalent of iOS's aps.category: a Firebase notification
 * message shown while the app is closed gets no buttons. The server therefore
 * sends routine cues to this build as data-only messages (display=app, see
 * apps/cron/src/utils/push.js) and RoutineMessagingService draws them here.
 *
 * The button sets are the iOS categories registered by the web app
 * (apps/web-app/src/services/notificationRoutes.js ACTION_TYPES) — keep them
 * in step; a test there reads this file to check.
 *
 * A tap (body or button) opens MainActivity with the message's data as
 * extras plus google.message_id, which the push plugin turns into
 * pushNotificationActionPerformed; a button adds `button`, which the web app
 * routes exactly as the iOS button of the same id.
 */
final class RoutineNotification {

    static final String EXTRA_NOTIFICATION_ID = "rn_notification_id";
    static final String EXTRA_BUTTON = "button";

    private static final String DEFAULT_CHANNEL = "routine-notifications";
    private static final String ALARM_CHANNEL = "routine-alarms";

    private RoutineNotification() {}

    /** [id, title] per button, by category. */
    static String[][] buttonsFor(String category) {
        if ("ROUTINE_ACTIONS".equals(category)) {
            return new String[][] { { "DO_NOW", "Do now" }, { "COMPLETE", "Complete" } };
        }
        if ("AGENT_START_ACTIONS".equals(category)) {
            return new String[][] { { "START_AGENT", "Start agent" } };
        }
        if ("AGENT_BUILD_ACTIONS".equals(category)) {
            return new String[][] { { "BUILD_AGENT", "Build agent" } };
        }
        return new String[0][];
    }

    static void show(Context context, String messageId, Map<String, String> data) {
        String channel = ALARM_CHANNEL.equals(data.get("channel")) ? ALARM_CHANNEL : DEFAULT_CHANNEL;
        ensureChannel(context, channel);

        int id = (messageId != null ? messageId : String.valueOf(System.currentTimeMillis())).hashCode();
        String title = valueOr(data.get("title"), "Routine Reminder");
        String body = valueOr(data.get("body"), "");

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channel)
            .setSmallIcon(smallIcon(context))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(ALARM_CHANNEL.equals(channel) ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(openApp(context, messageId, data, id, null, 0));

        String[][] buttons = buttonsFor(data.get("category"));
        for (int i = 0; i < buttons.length; i++) {
            builder.addAction(0, buttons[i][1], openApp(context, messageId, data, id, buttons[i][0], i + 1));
        }

        try {
            NotificationManagerCompat.from(context).notify(id, builder.build());
        } catch (SecurityException e) {
            // POST_NOTIFICATIONS not granted (Android 13+): nothing to show.
        }
    }

    private static PendingIntent openApp(Context context, String messageId, Map<String, String> data, int id, String button, int slot) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        Bundle extras = new Bundle();
        for (Map.Entry<String, String> entry : data.entrySet()) {
            extras.putString(entry.getKey(), entry.getValue());
        }
        // The push plugin only reports intents carrying a message id.
        extras.putString("google.message_id", messageId != null ? messageId : String.valueOf(id));
        extras.putString(EXTRA_NOTIFICATION_ID, String.valueOf(id));
        if (button != null) extras.putString(EXTRA_BUTTON, button);
        intent.putExtras(extras);
        // A distinct request code per notification and button, or Android
        // reuses one PendingIntent (and its extras) for all of them.
        return PendingIntent.getActivity(context, id * 31 + slot, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /**
     * The app creates both channels at start (App.vue); this covers a cue
     * arriving before the app was ever opened. Same settings, because a
     * channel's importance cannot change once it exists.
     */
    private static void ensureChannel(Context context, String channelId) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(channelId) != null) return;
        boolean alarm = ALARM_CHANNEL.equals(channelId);
        NotificationChannel channel = new NotificationChannel(
            channelId,
            alarm ? "Routine Alarms" : "Routine Notifications",
            NotificationManager.IMPORTANCE_MAX
        );
        channel.setDescription(alarm ? "Routines you set to ring like an alarm" : "Notifications for routine updates and reminders");
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        channel.enableLights(true);
        channel.setLightColor(Color.parseColor(alarm ? "#e8710a" : "#4285f4"));
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }

    /** The icon Firebase uses for the notifications it shows itself. */
    private static int smallIcon(Context context) {
        try {
            ApplicationInfo info = context.getPackageManager()
                .getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA);
            if (info.metaData != null) {
                int icon = info.metaData.getInt("com.google.firebase.messaging.default_notification_icon", 0);
                if (icon != 0) return icon;
            }
            return info.icon;
        } catch (PackageManager.NameNotFoundException e) {
            return context.getApplicationInfo().icon;
        }
    }

    private static String valueOr(String value, String fallback) {
        return value == null || value.isEmpty() ? fallback : value;
    }
}
