/* eslint-disable quote-props */
require('dotenv').config();

const mongoose = require('mongoose');
const admin = require('firebase-admin');

const crypto = require('crypto');

const serviceAccount = require('../serviceAccountKey.json');

const {
  MONGDO_DB,
  DOMAIN,
  ENCRYPTION_KEY,
} = process.env;

// Inline decryption — mirrors src/server/utils/encryption.js
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

const encryptionKey = ENCRYPTION_KEY
  ? crypto.scryptSync(ENCRYPTION_KEY, 'family-routine-salt', 32)
  : crypto.scryptSync('default-dev-key', 'salt', 32);

function isEncrypted(text) {
  if (!text || typeof text !== 'string' || text.length < 50) return false;
  if (!/^[A-Za-z0-9+/=]+$/.test(text)) return false;
  try {
    return Buffer.from(text, 'base64').length >= ENCRYPTED_POSITION + 1;
  } catch { return false; }
}

function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  if (!isEncrypted(encryptedText)) return encryptedText;

  try {
    const combined = Buffer.from(encryptedText, 'base64');
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, TAG_POSITION);
    const tag = combined.slice(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = combined.slice(ENCRYPTED_POSITION);

    if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH
      || tag.length !== TAG_LENGTH || encrypted.length === 0) {
      return encryptedText;
    }

    // Try new format (createDecipheriv) first
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
      decipher.setAAD(salt);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      // Fall back to legacy createDecipher for old encrypted data
      const legacyDecipher = crypto.createDecipher(ALGORITHM, encryptionKey);
      legacyDecipher.setAAD(salt);
      legacyDecipher.setAuthTag(tag);
      let decrypted = legacyDecipher.update(encrypted, null, 'utf8');
      decrypted += legacyDecipher.final('utf8');
      return decrypted;
    }
  } catch {
    return encryptedText;
  }
}

function decryptFields(obj, fields) {
  const result = { ...obj };
  fields.forEach((f) => { if (result[f]) result[f] = decrypt(result[f]); });
  return result;
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // databaseURL: 'https://groutine-21c1b.firebaseio.com',
});

function sendNotification(token, name, description, url) {
  if (!token) {
    console.log('No device token provided.');
    return Promise.resolve();
  }

  const payload = {
    token,
    notification: {
      title: name,
      body: description,
    },
    data: {
      click_action: url || DOMAIN,
    },
    android: {
      priority: 'high',
      ttl: 60 * 60 * 1000,
    },
  };

  return admin.messaging().send(payload)
    .then((response) => console.log('Successfully sent message:', response))
    .catch((error) => console.log('Error sending message:', error));
}

function exitProcess() {
  console.log(`process ended at ${new Date()}`);
  process.exit();
}

function getNewYorkTime() {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const time = getNewYorkTime();

console.log(`Process Started for time ${time}`);
const notificationList = [];

mongoose.connect(MONGDO_DB, { useNewUrlParser: true });
const db = mongoose.connection;
db.once('open', () => {
  db.collection('routineitems')
    .aggregate([
      { $match: { time } },
      {
        $project: {
          name: 1,
          description: 1,
          email: 1,
          notificationId: 1,
        },
      },
      {
        $lookup:
        {
          from: 'users',
          localField: 'email',
          foreignField: 'email',
          as: 'userDetails',
        },
      },
      {
        '$addFields': {
          'userDetails': {
            '$map': {
              'input': '$userDetails',
              'in': {
                'notificationId': '$$this.notificationId',
              },
            },
          },
        },
      },
    ]).toArray((err, result) => {
      result.forEach((user) => {
        const decrypted = decryptFields(user, ['name', 'description']);
        const {
          name, email, description, userDetails, ticked,
        } = decrypted;
        if (!ticked) {
          const { notificationId } = userDetails[0];
          console.log(`Sending notification of ${email} with name ${name} to ${notificationId}`);
          notificationList.push(sendNotification(notificationId, name, description));
        }
      });

      Promise.all(notificationList)
        .then(() => exitProcess())
        .catch(() => exitProcess());
    });
});

setTimeout(() => exitProcess(), 59 * 1000);
