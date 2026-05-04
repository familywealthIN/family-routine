/**
 * Simple encryption setup script
 * Run this once to enable encryption for the application
 */

const crypto = require('crypto');

function generateEncryptionKey() {
  const key = crypto.randomBytes(32).toString('hex');
  console.log('Generated encryption key:');
  console.log(`ENCRYPTION_KEY=${key}`);
  console.log('');
  console.log('Add this to your .env file for production security.');
  console.log('WARNING: Store this key securely - losing it means data cannot be decrypted!');
}

function showSetupInstructions() {
  console.log('=== Data Encryption Setup ===');
  console.log('');
  console.log('1. Generate an encryption key by running this script');
  console.log('2. Add the ENCRYPTION_KEY to your .env file');
  console.log('3. Restart your application');
  console.log('4. All new data will be automatically encrypted');
  console.log('');
  console.log('Note: Existing data will remain unencrypted until updated.');
  console.log('The application will handle both encrypted and unencrypted data gracefully.');
  console.log('');
}

if (require.main === module) {
  showSetupInstructions();
  generateEncryptionKey();
}

module.exports = { generateEncryptionKey, showSetupInstructions };
