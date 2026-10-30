package com.routine.note;

import android.content.Intent;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /**
     * Also runs for the launch intent (BridgeActivity.onCreate passes it here).
     * Android clears a notification when its body is tapped but not when one
     * of its buttons is, so a RoutineNotification button clears it here.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String id = intent != null ? intent.getStringExtra(RoutineNotification.EXTRA_NOTIFICATION_ID) : null;
        if (id == null) return;
        try {
            NotificationManagerCompat.from(this).cancel(Integer.parseInt(id));
        } catch (NumberFormatException ignored) {
            // Not one of ours.
        }
    }
}
