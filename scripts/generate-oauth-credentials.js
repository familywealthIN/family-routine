#!/usr/bin/env node

/**
 * Generate OAuth Credentials for MCP Server
 *
 * This script generates secure OAuth credentials for ChatGPT integration
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('\n🔐 Family Routine MCP - OAuth Credential Generator\n');
console.log('='.repeat(60));

// Generate OAuth Client Secret
const clientSecret = `frt_secret_${crypto.randomBytes(16).toString('hex')}`;

console.log('\n✅ Generated OAuth Credentials:\n');
console.log('Client ID:');
console.log('  routine-notes-mcp\n');
console.log('Client Secret:');
console.log(`  ${clientSecret}\n`);

console.log('='.repeat(60));
console.log('\n📋 Next Steps:\n');
console.log('1. Add these to your secrets.json:');
console.log('\n{');
console.log('  "OAUTH_CLIENT_ID": "routine-notes-mcp",');
console.log(`  "OAUTH_CLIENT_SECRET": "${clientSecret}",`);
console.log('  "MCP_BASE_URL": "https://your-api-domain.com",');
console.log('  "WEB_APP_URL": "https://routine-notes.netlify.app"');
console.log('}\n');

console.log('2. Update your environment variables in serverless.yml');
console.log('3. Deploy your backend: serverless deploy');
console.log('4. Configure ChatGPT with these credentials\n');

// Optionally update secrets.json
const secretsPath = path.join(__dirname, '..', 'secrets.json');

if (fs.existsSync(secretsPath)) {
    console.log('📝 Found secrets.json file\n');
    console.log('Would you like to update it automatically? (y/n)');

    // For now, just show instructions
    console.log('\n💡 Manual Update Required:');
    console.log(`   Edit: ${secretsPath}`);
    console.log('   Add the credentials shown above\n');
} else {
    console.log('⚠️  secrets.json not found');
    console.log('   Create it from secrets.example.json and add the credentials\n');
}

console.log('='.repeat(60));
console.log('\n✨ Credentials generated successfully!\n');
console.log('📚 Documentation: docs/oauth-credentials.md\n');
