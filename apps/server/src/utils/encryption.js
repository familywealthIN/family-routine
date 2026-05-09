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

      const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);
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
   * Check if a string looks like it was encrypted by this class.
   * Encrypted values are base64-encoded and must be at least
   * SALT(64) + IV(16) + TAG(16) + 1 byte of ciphertext = 97 bytes when decoded.
   * @param {string} text
   * @returns {boolean}
   */
  static isEncrypted(text) {
    if (!text || typeof text !== 'string') return false;

    // Quick heuristic: encrypted base64 for 97+ bytes is at least ~130 chars
    // and should not contain spaces or common plaintext patterns.
    if (text.length < 50) return false;

    // Must be valid base64
    if (!/^[A-Za-z0-9+/=]+$/.test(text)) return false;

    try {
      const buf = Buffer.from(text, 'base64');
      // Minimum length: salt + iv + tag + at least 1 byte of data
      return buf.length >= ENCRYPTED_POSITION + 1;
    } catch {
      return false;
    }
  }

  /**
   * Decrypt a string value. Returns the original string as-is if
   * the data does not look like valid encrypted output.
   * @param {string} encryptedText - Base64 encoded encrypted data
   * @returns {string} - Decrypted text, or original string if not encrypted
   */
  decrypt(encryptedText) {
    if (!encryptedText || typeof encryptedText !== 'string') {
      return encryptedText; // Return as-is if not a string or empty
    }

    // If the value doesn't look like encrypted data, return it as-is (plaintext)
    if (!DataEncryption.isEncrypted(encryptedText)) {
      return encryptedText;
    }

    try {
      const combined = Buffer.from(encryptedText, 'base64');

      // Extract components
      const salt = combined.slice(0, SALT_LENGTH);
      const iv = combined.slice(SALT_LENGTH, TAG_POSITION);
      const tag = combined.slice(TAG_POSITION, ENCRYPTED_POSITION);
      const encrypted = combined.slice(ENCRYPTED_POSITION);

      // Validate extracted component lengths
      if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH || encrypted.length === 0) {
        return encryptedText; // Malformed data — return as-is
      }

      // Try createDecipheriv first (new format with proper IV)
      try {
        const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
        decipher.setAAD(salt);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(encrypted, null, 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
      } catch (newFormatError) {
        // Fall back to deprecated createDecipher for legacy data
        // that was encrypted before the migration to createCipheriv
        try {
          const legacyDecipher = crypto.createDecipher(ALGORITHM, this.encryptionKey);
          legacyDecipher.setAAD(salt);
          legacyDecipher.setAuthTag(tag);

          let decrypted = legacyDecipher.update(encrypted, null, 'utf8');
          decrypted += legacyDecipher.final('utf8');

          return decrypted;
        } catch (legacyError) {
          // Neither format worked
          if (legacyError.code !== 'ERR_CRYPTO_INVALID_AUTH_TAG') {
            console.error('Decryption error:', legacyError.message);
          }
          return encryptedText; // Return original text if decryption fails
        }
      }
    } catch (error) {
      console.error('Decryption error:', error.message);
      return encryptedText; // Return original text if decryption fails
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
