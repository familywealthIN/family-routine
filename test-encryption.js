require('dotenv').config();
const mongoose = require('mongoose');
const { DataEncryption } = require('./src/server/utils/encryption');

const { MONGODB_URI } = process.env;

async function testEncryption() {
  console.log('Testing encryption system...');

  // Test 1: Basic encryption/decryption
  const encryption = new DataEncryption();
  const testData = 'This is sensitive information';

  console.log('\n--- Test 1: Basic Encryption/Decryption ---');
  console.log('Original:', testData);

  const encrypted = encryption.encrypt(testData);
  console.log('Encrypted:', encrypted);

  const decrypted = encryption.decrypt(encrypted);
  console.log('Decrypted:', decrypted);
  console.log('Match:', testData === decrypted);

  // Test 2: Object encryption
  console.log('\n--- Test 2: Object Encryption ---');
  const testObject = {
    name: 'John Doe',
    email: 'john@example.com',
    sensitive: 'secret data',
    normal: 'public data',
  };

  console.log('Original object:', testObject);

  const encryptedObject = encryption.encryptObject(testObject, ['name', 'email', 'sensitive']);
  console.log('Encrypted object:', encryptedObject);

  const decryptedObject = encryption.decryptObject(encryptedObject, ['name', 'email', 'sensitive']);
  console.log('Decrypted object:', decryptedObject);

  // Test 3: Database connection and schema test
  if (MONGODB_URI) {
    console.log('\n--- Test 3: Database Schema Test ---');
    try {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB');

      // Import schemas to test encryption middleware
      // eslint-disable-next-line global-require
      const User = require('./src/server/schema/UserSchema');
      // eslint-disable-next-line global-require
      const Goal = require('./src/server/schema/GoalSchema');
      // eslint-disable-next-line global-require
      const RoutineItem = require('./src/server/schema/RoutineItemSchema');

      console.log('Schemas loaded successfully');
      console.log('User schema has encryption middleware:', !!User.schema.post);
      console.log('Goal schema has encryption middleware:', !!Goal.schema.post);
      console.log('RoutineItem schema has encryption middleware:', !!RoutineItem.schema.post);

      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Database test error:', error.message);
    }
  } else {
    console.log('MONGODB_URI not found, skipping database test');
  }

  console.log('\n--- Encryption Test Complete ---');
}

testEncryption().catch(console.error);
