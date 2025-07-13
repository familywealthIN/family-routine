const crypto = require('crypto');

// Configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is always 16
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

class DataEncryption {
  constructor() {
    // Get encryption key from environment variable
    this.encryptionKey = process.env.ENCRYPTION_KEY;

    if (!this.encryptionKey) {
      console.warn('WARNING: ENCRYPTION_KEY not found in environment variables. Using default key for development.');
      // Generate a default key for development (should never be used in production)
      this.encryptionKey = crypto.scryptSync('default-dev-key', 'salt', 32);
    } else {
      // Derive key from environment variable
      this.encryptionKey = crypto.scryptSync(this.encryptionKey, 'family-routine-salt', 32);
    }
  }

  /**
   * Encrypt a string value
   * @param {string} text - The text to encrypt
   * @returns {string} - Base64 encoded encrypted data
   */
  encrypt(text) {
    if (!text || typeof text !== 'string') {
      return text; // Return as-is if not a string or empty
    }

    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const salt = crypto.randomBytes(SALT_LENGTH);

      const cipher = crypto.createCipher(ALGORITHM, this.encryptionKey);
      cipher.setAAD(salt);

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]);

      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption error:', error);
      return text; // Return original text if encryption fails
    }
  }

  /**
   * Decrypt a string value
   * @param {string} encryptedText - Base64 encoded encrypted data
   * @returns {string} - Decrypted text
   */
  decrypt(encryptedText) {
    if (!encryptedText || typeof encryptedText !== 'string') {
      return encryptedText; // Return as-is if not a string or empty
    }

    try {
      const combined = Buffer.from(encryptedText, 'base64');

      // Extract components
      const salt = combined.slice(0, SALT_LENGTH);
      const tag = combined.slice(TAG_POSITION, ENCRYPTED_POSITION);
      const encrypted = combined.slice(ENCRYPTED_POSITION);

      const decipher = crypto.createDecipher(ALGORITHM, this.encryptionKey);
      decipher.setAAD(salt);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return encryptedText; // Return encrypted text if decryption fails
    }
  }

  /**
   * Encrypt an object's specified fields
   * @param {Object} obj - The object to encrypt
   * @param {Array} fields - Array of field names to encrypt
   * @returns {Object} - Object with encrypted fields
   */
  encryptObject(obj, fields) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const encrypted = { ...obj };

    fields.forEach((field) => {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    });

    return encrypted;
  }

  /**
   * Decrypt an object's specified fields
   * @param {Object} obj - The object to decrypt
   * @param {Array} fields - Array of field names to decrypt
   * @returns {Object} - Object with decrypted fields
   */
  decryptObject(obj, fields) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const decrypted = { ...obj };

    fields.forEach((field) => {
      if (decrypted[field]) {
        decrypted[field] = this.decrypt(decrypted[field]);
      }
    });

    return decrypted;
  }

  /**
   * Encrypt an array of objects
   * @param {Array} array - Array of objects to encrypt
   * @param {Array} fields - Array of field names to encrypt
   * @returns {Array} - Array with encrypted objects
   */
  encryptArray(array, fields) {
    if (!Array.isArray(array)) {
      return array;
    }

    return array.map((item) => this.encryptObject(item, fields));
  }

  /**
   * Decrypt an array of objects
   * @param {Array} array - Array of objects to decrypt
   * @param {Array} fields - Array of field names to decrypt
   * @returns {Array} - Array with decrypted objects
   */
  decryptArray(array, fields) {
    if (!Array.isArray(array)) {
      return array;
    }

    return array.map((item) => this.decryptObject(item, fields));
  }
}

// Create singleton instance
const encryption = new DataEncryption();

// Define which fields should be encrypted for each schema
const ENCRYPTION_FIELDS = {
  user: ['name'], // Encrypt user names but not email (needed for lookups)
  goal: ['body', 'contribution', 'reward'], // Encrypt goal content
  goalItem: ['body', 'contribution', 'reward'], // Encrypt goal item content
  subTask: ['body'], // Encrypt subtask content
  routine: [], // Date and email not encrypted (needed for queries)
  routineItem: ['name', 'description'], // Encrypt routine item details
  progress: ['notes'], // Encrypt any progress notes
  motto: ['text'], // Encrypt motto text
};

module.exports = {
  encryption,
  ENCRYPTION_FIELDS,
  DataEncryption,
};
