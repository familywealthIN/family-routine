/**
 * Migration script to encrypt existing data in the database
 *
 * This script should be run once when implementing encryption
 * to encrypt all existing unencrypted data.
 *
 * Usage: node scripts/encrypt-existing-data.js
 */

// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');
const { encryption, ENCRYPTION_FIELDS } = require('../src/server/utils/encryption');

// Import models
const { GoalModel } = require('../src/server/schema/GoalSchema');
const { UserModel } = require('../src/server/schema/UserSchema');
const { RoutineModel } = require('../src/server/schema/RoutineSchema');

// Check if data is already encrypted (basic heuristic)
function isDataEncrypted(data) {
  if (!data || typeof data !== 'string') return false;
  // Check if it looks like base64 encrypted data
  return /^[A-Za-z0-9+/=]+$/.test(data) && data.length > 50;
}

async function encryptGoals() {
  console.log('Starting goal encryption...');

  const goals = await GoalModel.find({}).lean();
  let encryptedCount = 0;

  for (const goal of goals) {
    let needsUpdate = false;
    const updatedGoalItems = [];

    if (goal.goalItems && goal.goalItems.length > 0) {
      for (const goalItem of goal.goalItems) {
        const updatedGoalItem = { ...goalItem };

        // Encrypt goal item fields
        ENCRYPTION_FIELDS.goalItem.forEach((field) => {
          if (updatedGoalItem[field] && !isDataEncrypted(updatedGoalItem[field])) {
            updatedGoalItem[field] = encryption.encrypt(updatedGoalItem[field]);
            needsUpdate = true;
          }
        });

        // Encrypt subtasks
        if (updatedGoalItem.subTasks && updatedGoalItem.subTasks.length > 0) {
          updatedGoalItem.subTasks = updatedGoalItem.subTasks.map((subTask) => {
            const updatedSubTask = { ...subTask };
            ENCRYPTION_FIELDS.subTask.forEach((field) => {
              if (updatedSubTask[field] && !isDataEncrypted(updatedSubTask[field])) {
                updatedSubTask[field] = encryption.encrypt(updatedSubTask[field]);
                needsUpdate = true;
              }
            });
            return updatedSubTask;
          });
        }

        updatedGoalItems.push(updatedGoalItem);
      }
    }

    if (needsUpdate) {
      await GoalModel.findByIdAndUpdate(goal._id, { goalItems: updatedGoalItems });
      encryptedCount += 1;
      console.log(`Encrypted goal ${goal._id}`);
    }
  }

  console.log(`Encrypted ${encryptedCount} goals`);
}

async function encryptUsers() {
  console.log('Starting user encryption...');

  const users = await UserModel.find({}).lean();
  let encryptedCount = 0;

  for (const user of users) {
    let needsUpdate = false;
    const updates = {};

    // Encrypt user fields
    ENCRYPTION_FIELDS.user.forEach((field) => {
      if (user[field] && !isDataEncrypted(user[field])) {
        updates[field] = encryption.encrypt(user[field]);
        needsUpdate = true;
      }
    });

    // Encrypt motto items
    if (user.motto && user.motto.length > 0) {
      const encryptedMotto = user.motto.map((mottoItem) => {
        const updatedMotto = { ...mottoItem };
        ENCRYPTION_FIELDS.motto.forEach((field) => {
          if (updatedMotto[field] && !isDataEncrypted(updatedMotto[field])) {
            updatedMotto[field] = encryption.encrypt(updatedMotto[field]);
            needsUpdate = true;
          }
        });
        return updatedMotto;
      });

      if (needsUpdate) {
        updates.motto = encryptedMotto;
      }
    }

    if (needsUpdate) {
      await UserModel.findByIdAndUpdate(user._id, updates);
      encryptedCount += 1;
      console.log(`Encrypted user ${user._id} (${user.email})`);
    }
  }

  console.log(`Encrypted ${encryptedCount} users`);
}

async function encryptRoutines() {
  console.log('Starting routine encryption...');

  const routines = await RoutineModel.find({}).lean();
  let encryptedCount = 0;

  for (const routine of routines) {
    let needsUpdate = false;
    const updatedTasklist = [];

    if (routine.tasklist && routine.tasklist.length > 0) {
      for (const task of routine.tasklist) {
        const updatedTask = { ...task };

        // Encrypt routine item fields
        ENCRYPTION_FIELDS.routineItem.forEach((field) => {
          if (updatedTask[field] && !isDataEncrypted(updatedTask[field])) {
            updatedTask[field] = encryption.encrypt(updatedTask[field]);
            needsUpdate = true;
          }
        });

        // Encrypt steps
        if (updatedTask.steps && updatedTask.steps.length > 0) {
          updatedTask.steps = updatedTask.steps.map((step) => {
            const updatedStep = { ...step };
            if (updatedStep.name && !isDataEncrypted(updatedStep.name)) {
              updatedStep.name = encryption.encrypt(updatedStep.name);
              needsUpdate = true;
            }
            return updatedStep;
          });
        }

        updatedTasklist.push(updatedTask);
      }
    }

    if (needsUpdate) {
      await RoutineModel.findByIdAndUpdate(routine._id, { tasklist: updatedTasklist });
      encryptedCount += 1;
      console.log(`Encrypted routine ${routine._id}`);
    }
  }

  console.log(`Encrypted ${encryptedCount} routines`);
}

async function main() {
  try {
    console.log('Starting data encryption migration...');

    // Connect to MongoDB
    const mongoUrl = process.env.MONGDO_DB || 'mongodb://localhost:27017/family-routine-dev';
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if encryption key is set
    if (!process.env.ENCRYPTION_KEY) {
      console.error('ENCRYPTION_KEY environment variable is not set!');
      console.error('Please set ENCRYPTION_KEY before running this migration.');
      process.exit(1);
    }

    // Run encryption for each collection
    await encryptUsers();
    await encryptGoals();
    await encryptRoutines();

    console.log('Data encryption migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  main, encryptGoals, encryptUsers, encryptRoutines,
};
