// /* eslint-disable quote-props */
// require('dotenv').config();

// const admin = require('firebase-admin');

// const serviceAccount = require('./serviceAccountKey.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: 'https://groutine-21c1b.firebaseio.com',
// });

// function sendNotification(token, name, description) {
//   const payload = {
//     notification: {
//       title: name,
//       body: description,
//       icon: '/img/512.png',
//       click_action: 'http://localhost:8080',
//     },
//   };

//   const options = {
//     priority: 'normal',
//     timeToLive: 60 * 60,
//   };

//   return admin.messaging().sendToDevice(token, payload, options)
//     .then((response) => console.log('Successfully sent message:', response))
//     .catch((error) => console.log('Error sending message:', error));
// }

// sendNotification(
//   '',
//   'Hello',
//   'Hello World',
// );

// require('dotenv').config();
// const admin = require('firebase-admin');
// const serviceAccount = require('./serviceAccountKey.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: 'https://groutine-21c1b.firebaseio.com',
// });

// function sendNotification(token, name, description) {
//   if (!token) {
//     console.log('No device token provided.');
//     return;
//   }

//   console.log('Sending notification to token:', token);

//   const payload = {
//     token: "dCEbN4_rf0tWkXfenEOeHw:APA91bHXuslEEPDWlGGJPeioJA5G5rW1uDIndAc_t_e58g4DbikeMUGQU7LLihyIp69qqiiFOCsPCapHxwvKuzmpHlETfC_scJT09OqGWe4sgEUI2fiTVrY",
//     data: {
//       habitId: "1"
//     },

//     apns: {
//       headers: {
//         "apns-priority": "10",
//         "apns-push-type": "alert"
//       },
//       payload: {
//         aps: {
//           alert: {
//             title: "💧 Drink water",
//             body: "8 glasses remaining"
//           },
//           category: "HABIT_ACTIONS",
//           sound: "default"
//         }
//       }
//     }

//   };

//   const options = {
//     priority: 'high',
//     timeToLive: 60 * 60, // 1 hour
//   };

//   return admin.messaging().send(payload)
//     .then((response) => console.log('Notification sent:', response))
//     .catch((error) => console.error('Error sending notification:', error));
// }

// // Replace this with an actual device token
// sendNotification(
//   'YOUR_DEVICE_FCM_TOKEN',
//   'Hello',
//   'Hello World',
// );

// test-notification-with-actions.js
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://groutine-21c1b.firebaseio.com',
});

class InteractiveNotificationTester {
  // async sendNotificationWithActions(token, title, body, data = {}) {
  //   if (!token) {
  //     console.log('No device token provided.');
  //     return;
  //   }

  //   console.log('Sending notification with actions to token:', token);

  //   const payload = {
  //     token: token,
  //     notification: {
  //       title: title,
  //       body: body,
  //     },
  //     data: {
  //       habitId: data.habitId || "1",
  //       taskId: data.taskId || "",
  //       routineId: data.routineId || "",
  //       type: data.type || "routine_reminder",
  //       actionType: data.actionType || "routine_actions", // This determines which action set to use
  //       hasActions: "true",
  //       title: title, // Include in data for local notifications
  //       body: body,
  //       // Convert all data values to strings (FCM requirement)
  //       ...Object.fromEntries(
  //         Object.entries(data).map(([key, value]) => [key, String(value)])
  //       ),
  //     },
  //     android: {
  //       notification: {
  //         channelId: 'routine_notifications',
  //         priority: 'high',
  //         defaultSound: true,
  //         clickAction: 'FLUTTER_NOTIFICATION_CLICK',
  //       },
  //       priority: 'high',
  //       ttl: 3600000,
  //     },
  //     apns: {
  //       headers: {
  //         "apns-priority": "10",
  //         "apns-push-type": "alert"
  //       },
  //       payload: {
  //         aps: {
  //           alert: {
  //             title: title,
  //             body: body
  //           },
  //           category: "ROUTINE_ACTIONS", // This should match your registered category
  //           sound: "default",
  //           badge: 1,
  //           "mutable-content": 1,
  //         }
  //       }
  //     }
  //   };

  //   try {
  //     const response = await admin.messaging().send(payload);
  //     console.log('✅ Notification with actions sent successfully:', response);
  //     return response;
  //   } catch (error) {
  //     console.error('❌ Error sending notification:', error);
  //     throw error;
  //   }
  // }

  // Updated test notification for iOS
  async sendNotificationWithActionsIOS(token, title, body, data = {}) {
    if (!token) {
      console.log('No device token provided.');
      return;
    }

    console.log('Sending iOS notification with actions to token:', token);

    const payload = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        habitId: data.habitId || '1',
        taskId: data.taskId || '',
        routineId: data.routineId || '',
        type: data.type || 'routine_reminder',
        actionType: data.actionType || 'routine_actions',
        hasActions: 'true',
        title,
        body,
        ...Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, String(value)]),
        ),
      },
      android: {
        notification: {
          channelId: 'routine_notifications',
          priority: 'high',
          defaultSound: true,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
        priority: 'high',
        ttl: 3600000,
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            // This is the key - must match the category identifier in iOS
            category: data.actionType === 'habit_actions' ? 'HABIT_ACTIONS' : 'ROUTINE_ACTIONS',
            sound: 'default',
            badge: 1,
            'mutable-content': 1,
          },
        },
      },
    };

    try {
      const response = await admin.messaging().send(payload);
      console.log('✅ iOS notification with actions sent successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Error sending iOS notification:', error);
      throw error;
    }
  }

  async sendWaterReminder(token) {
    return this.sendNotificationWithActionsIOS(
      token,
      '💧 Drink Water',
      '8 glasses remaining - tap actions below',
      {
        habitId: 'water_habit_1',
        type: 'water_reminder',
        actionType: 'routine_actions',
        glasses_remaining: '8',
      },
    );
  }

  async sendExerciseReminder(token) {
    return this.sendNotificationWithActionsIOS(
      token,
      '🏃♂️ Morning Exercise',
      'Time for your 30-minute workout!',
      {
        habitId: 'exercise_habit_1',
        taskId: 'morning_exercise',
        type: 'exercise_reminder',
        actionType: 'routine_actions',
        duration: '30',
      },
    );
  }

  async sendHabitReminder(token) {
    return this.sendNotificationWithActionsIOS(
      token,
      '📚 Reading Habit',
      'Time to read for 20 minutes',
      {
        habitId: 'reading_habit_1',
        type: 'habit_reminder',
        actionType: 'habit_actions', // Different action set
        duration: '20',
      },
    );
  }
}

// Test function
async function runTests() {
  const tester = new InteractiveNotificationTester();

  const testToken = 'dpZcpmD03U_nsCXfl2nOd5:APA91bHoikCqD2LVGY32rW09pK7mzjd4H7jg-JD2XM3J0oCn_4I3_yCFC64g-7fZNv5ZSXQzw7MH0omMH5NVcdNehhFB7CESU2YCcEMHer6MyOf_JEFxpL8';

  try {
    console.log('\n=== Testing Notifications with Action Buttons ===\n');

    console.log('1. Sending water reminder with routine actions...');
    await tester.sendWaterReminder(testToken);
    await delay(5000);

    console.log('2. Sending exercise reminder with routine actions...');
    await tester.sendExerciseReminder(testToken);
    await delay(5000);

    console.log('3. Sending habit reminder with habit actions...');
    await tester.sendHabitReminder(testToken);

    console.log('\n=== All notifications sent! ===');
    console.log('📱 Check your device - you should see action buttons on the notifications');
    console.log('🔘 Available actions depend on the notification type');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = InteractiveNotificationTester;
