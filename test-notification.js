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


// test-notification-interactive-fixed.js
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://groutine-21c1b.firebaseio.com',
});

class InteractiveNotificationTester {
  
  // Fixed interactive notification without unsupported actions field
  async sendBasicInteractiveNotification(token, title, body, data = {}) {
    if (!token) {
      console.log('No device token provided.');
      return;
    }

    console.log('Sending interactive notification to token:', token);

    const payload = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: {
        habitId: data.habitId || "1",
        taskId: data.taskId || "",
        routineId: data.routineId || "",
        type: data.type || "routine_reminder",
        // Add action data for client-side handling
        hasActions: "true",
        actionType: "routine_actions",
        // Convert all data values to strings (FCM requirement)
        ...Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, String(value)])
        ),
      },
      android: {
        notification: {
          channelId: 'routine_notifications',
          priority: 'high',
          defaultSound: true,
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          // Remove unsupported actions field
        },
        priority: 'high',
        ttl: 3600000, // 1 hour
      },
      apns: {
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert"
        },
        payload: {
          aps: {
            alert: {
              title: title,
              body: body
            },
            category: "ROUTINE_ACTIONS", // This enables action buttons on iOS
            sound: "default",
            badge: 1,
            // Add custom data for iOS actions
            "mutable-content": 1,
          }
        }
      }
    };

    try {
      const response = await admin.messaging().send(payload);
      console.log('Interactive notification sent successfully:', response);
      return response;
    } catch (error) {
      console.error('Error sending interactive notification:', error);
      throw error;
    }
  }

  // Alternative: Send data-only message for full client control
  async sendDataOnlyNotification(token, title, body, data = {}) {
    if (!token) {
      console.log('No device token provided.');
      return;
    }

    console.log('Sending data-only notification to token:', token);

    const payload = {
      token: token,
      // No notification field - this makes it a data-only message
      data: {
        title: title,
        body: body,
        habitId: data.habitId || "1",
        taskId: data.taskId || "",
        routineId: data.routineId || "",
        type: data.type || "routine_reminder",
        hasActions: "true",
        actionType: "routine_actions",
        // Action definitions as data
        action1: "DO_NOW",
        action1Title: "Do Now",
        action2: "COMPLETE", 
        action2Title: "Complete",
        action3: "SNOOZE",
        action3Title: "Snooze 10min",
        // Convert all data values to strings
        ...Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, String(value)])
        ),
      },
      android: {
        priority: 'high',
        ttl: 3600000,
      },
      apns: {
        headers: {
          "apns-priority": "10",
          "apns-push-type": "background"
        },
        payload: {
          aps: {
            "content-available": 1,
            category: "ROUTINE_ACTIONS",
          }
        }
      }
    };

    try {
      const response = await admin.messaging().send(payload);
      console.log('Data-only notification sent successfully:', response);
      return response;
    } catch (error) {
      console.error('Error sending data-only notification:', error);
      throw error;
    }
  }

  // Routine reminder with actions (fixed version)
  async sendRoutineReminder(token, routineData) {
    const data = {
      habitId: routineData.id || "1",
      taskId: routineData.id || "",
      routineId: routineData.routineId || "",
      type: "routine_reminder",
      time: routineData.time || "",
      description: routineData.description || "",
    };

    return this.sendBasicInteractiveNotification(
      token,
      `⏰ Time for ${routineData.name}`,
      routineData.description || `Your routine "${routineData.name}" is scheduled now`,
      data
    );
  }

  // Water reminder (fixed version)
  async sendWaterReminder(token) {
    const data = {
      habitId: "water_habit_1",
      type: "water_reminder",
      glasses_remaining: "8",
    };

    return this.sendBasicInteractiveNotification(
      token,
      "💧 Drink water",
      "8 glasses remaining",
      data
    );
  }

  // Data-only version for full client control
  async sendWaterReminderDataOnly(token) {
    const data = {
      habitId: "water_habit_1",
      type: "water_reminder",
      glasses_remaining: "8",
    };

    return this.sendDataOnlyNotification(
      token,
      "💧 Drink water",
      "8 glasses remaining - Tap for actions",
      data
    );
  }

  // Exercise reminder
  async sendExerciseReminder(token) {
    const data = {
      habitId: "exercise_habit_1",
      taskId: "morning_exercise",
      type: "exercise_reminder",
      duration: "30",
    };

    return this.sendBasicInteractiveNotification(
      token,
      "🏃♂️ Morning Exercise",
      "Time for your 30-minute workout!",
      data
    );
  }
}

// Test function
async function runTests() {
  const tester = new InteractiveNotificationTester();
  
  // Replace with your actual FCM token
  const testToken = "dCEbN4_rf0tWkXfenEOeHw:APA91bHXuslEEPDWlGGJPeioJA5G5rW1uDIndAc_t_e58g4DbikeMUGQU7LLihyIp69qqiiFOCsPCapHxwvKuzmpHlETfC_scJT09OqGWe4sgEUI2fiTVrY";
  
  try {
    console.log('\n=== Testing Fixed Interactive Notifications ===\n');

    // Test 1: Fixed water reminder
    console.log('1. Sending fixed water reminder...');
    await tester.sendWaterReminder(testToken);
    await delay(3000);

    // Test 2: Data-only water reminder (for full client control)
    console.log('2. Sending data-only water reminder...');
    await tester.sendWaterReminderDataOnly(testToken);
    await delay(3000);

    // Test 3: Exercise routine
    console.log('3. Sending exercise reminder...');
    await tester.sendExerciseReminder(testToken);
    await delay(3000);

    // Test 4: Custom routine
    console.log('4. Sending custom routine reminder...');
    await tester.sendRoutineReminder(testToken, {
      id: "routine_123",
      name: "Morning Routine",
      description: "Start your day with energy!",
      time: "07:00",
      routineId: "morning_routine_set"
    });

    console.log('\n=== All test notifications sent successfully! ===');
    console.log('📱 Check your device for notifications.');
    console.log('💡 The app will handle creating action buttons based on the data payload.');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Helper function for delays
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the tests
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\nTest completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = InteractiveNotificationTester;
