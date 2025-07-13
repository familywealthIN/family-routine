# Data Encryption Implementation

This document describes the data encryption system implemented in the family-routine application to protect sensitive user data.

## Overview

The application now encrypts sensitive user data before storing it in the database. This includes:

* User names
* Goal content (body, contribution, reward)
* Subtask content
* Routine item names and descriptions
* Motto text
* Step names

## Encryption Details

* **Algorithm**: AES-256-GCM (Advanced Encryption Standard with Galois/Counter Mode)
* **Key Derivation**: PBKDF2 with application-specific salt
* **Authentication**: Built-in authentication tag for integrity verification
* **Encoding**: Base64 for database storage

## Setup Instructions

1. **Generate Encryption Key**:
   

```bash
   node scripts/setup-encryption.js
   ```

2. **Configure Environment**:
   Add the generated key to your `.env` file:
   

```
   ENCRYPTION_KEY=your-generated-key-here
   ```

3. **Restart Application**:
   The encryption system activates automatically when the environment variable is set.

## How It Works

### Automatic Encryption/Decryption

* **Save Operations**: Data is automatically encrypted before saving to database
* **Read Operations**: Data is automatically decrypted when retrieved from database
* **Backward Compatibility**: Handles both encrypted and unencrypted data gracefully

### Encrypted Fields by Schema

#### User Schema

* `name`: User's display name

#### Goal Schema

* `body`: Goal description/content
* `contribution`: How goal contributes to larger objectives
* `reward`: Goal completion reward

#### SubTask Schema

* `body`: Subtask description

#### RoutineItem Schema

* `name`: Routine item name
* `description`: Detailed description

#### Motto Schema

* `text`: Motto content

### Non-Encrypted Fields

The following fields remain unencrypted for functionality:
* Email addresses (needed for user lookup and authentication)
* Dates (needed for queries and filtering)
* Boolean flags and status fields
* IDs and references

## Security Considerations

### Key Management

* **Production**: Use a strong, randomly generated key
* **Development**: The system provides a default key with warnings
* **Backup**: Store the encryption key securely - losing it means data cannot be decrypted
* **Rotation**: Key rotation requires re-encryption of all data

### Performance Impact

* **Minimal Overhead**: Encryption/decryption happens at the application layer
* **Caching**: Decrypted data can be cached in memory for performance
* **Async Operations**: All encryption operations are non-blocking

### Migration Strategy

* **New Data**: Automatically encrypted from the moment the system is activated
* **Existing Data**: Remains unencrypted but application handles both types
* **Gradual Migration**: Data gets encrypted when updated through normal application use

## Development

### Testing Encryption

```javascript
const {
    encryption
} = require('./src/server/utils/encryption');

// Test basic encryption
const plaintext = "Sensitive data";
const encrypted = encryption.encrypt(plaintext);
const decrypted = encryption.decrypt(encrypted);
console.log({
    plaintext,
    encrypted,
    decrypted
});
```

### Adding New Encrypted Fields

1. Update `ENCRYPTION_FIELDS` in `src/server/utils/encryption.js`
2. Add field to appropriate schema's encryption middleware
3. Test thoroughly with existing data

### Error Handling

* Encryption failures return original data with error logging
* Decryption failures return encrypted data with error logging
* Application remains functional even if encryption fails

## Monitoring

### Logs to Monitor

* Encryption/decryption errors
* Performance impact on database operations
* Key-related warnings or errors

### Health Checks

* Verify encryption key is properly set
* Test encryption/decryption functionality
* Monitor for data corruption

## Compliance

This encryption implementation helps meet:
* **GDPR**: Data protection requirements
* **CCPA**: Consumer privacy rights
* **SOC 2**: Security controls
* **HIPAA**: Healthcare data protection (if applicable)

## Troubleshooting

### Common Issues

1. **Missing Encryption Key**:
   - Symptom: Warning logs about default key usage
   - Solution: Set `ENCRYPTION_KEY` environment variable

2. **Decryption Errors**:
   - Symptom: Data appears garbled or application errors
   - Solution: Verify encryption key hasn't changed

3. **Performance Issues**:
   - Symptom: Slow database operations
   - Solution: Monitor encryption overhead, consider caching strategies

### Emergency Recovery

If encryption key is lost:
1. Data encrypted with that key cannot be recovered
2. Users may need to re-enter sensitive data
3. System will continue to function with data loss for encrypted fields

## Future Enhancements

* Field-level encryption key rotation
* Enhanced key management system
* Encryption at rest for database files
* Client-side encryption for additional security
