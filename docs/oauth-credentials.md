# OAuth Credentials for ChatGPT MCP Integration

## 🔐 Your OAuth Configuration

Use these credentials to connect your Family Routine MCP server to ChatGPT:

### Server URL

```
Production: https://your-api-domain.com/dev/mcp
Local Dev: http://localhost:4000/mcp
```

### OAuth Client ID

```
routine-notes-mcp
```

### OAuth Client Secret

```
Contact your system administrator or check your environment variables for the OAUTH_CLIENT_SECRET value.

Default format: frt_secret_<random_32_chars>
```

⚠️ **Important**: The OAuth Client Secret should be set in your environment variables as `OAUTH_CLIENT_SECRET` . If not set, a random secret will be generated on server startup.

---

## 🚀 Quick Setup Guide

### Step 1: Configure Environment Variables

Add to your `secrets.json` :

```json
{
  "OAUTH_CLIENT_ID": "routine-notes-mcp",
  "OAUTH_CLIENT_SECRET": "frt_secret_YOUR_SECURE_RANDOM_STRING_HERE",
  "MCP_BASE_URL": "https://your-api-domain.com",
  "WEB_APP_URL": "https://routine-notes.netlify.app"
}
```

### Step 2: Generate a Secure Client Secret

Run this command to generate a secure random secret:

```bash
node -e "console.log('frt_secret_' + require('crypto').randomBytes(16).toString('hex'))"
```

Copy the output and use it as your `OAUTH_CLIENT_SECRET` .

### Step 3: Add to ChatGPT

1. Open ChatGPT
2. Go to **Settings** → **Beta Features** → **MCP Servers**
3. Click **Add MCP Server**
4. Enter your Server URL
5. When prompted, enter:
   - **Client ID**: `routine-notes-mcp`

   - **Client Secret**: Your generated secret from Step 2
6. Click **Authorize**
7. You'll be redirected to your Routine Notes app
8. Click **Authorize** to grant permissions
9. Done! ✅

---

## 📋 What You'll See in Profile Page

When you visit **Settings → Profile**, you'll see:

1. **OAuth Configuration Section**
   - Server URL (with copy button)
   - OAuth Client ID (with copy button)
   - OAuth Client Secret (masked, with show/copy buttons)
   - Setup instructions

2. **OAuth Connection Status**
   - Shows "Connected" when ChatGPT is authorized
   - Green checkmark indicator

3. **Legacy API Key Section** (optional)
   - For backward compatibility
   - Not required if using OAuth

---

## 🔒 Security Best Practices

1. **Never commit secrets** to version control
2. **Rotate secrets regularly** (every 90 days recommended)
3. **Use different secrets** for production and development
4. **Store secrets securely** in environment variables
5. **Monitor OAuth token usage** in your logs

---

## 🧪 Testing Your OAuth Setup

### Test OAuth Configuration Endpoint

```bash
curl https://your-domain.com/mcp/.well-known/mcp-configuration
```

Expected response:

```json
{
  "oauth": {
    "authorizationUrl": "https://your-domain.com/mcp/oauth/authorize",
    "tokenUrl": "https://your-domain.com/mcp/oauth/token",
    "scopes": ["read", "write"]
  }
}
```

### Test Token Exchange (after getting auth code)

```bash
curl -X POST https://your-domain.com/mcp/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_AUTH_CODE" \
  -d "client_id=routine-notes-mcp" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

### Test Authenticated Request

```bash
curl -X POST https://your-domain.com/mcp/call \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'
```

---

## 🆘 Troubleshooting

### "Invalid client credentials"

* **Cause**: Client ID or Secret doesn't match
* **Solution**: Verify your environment variables match what you entered in ChatGPT

### "OAuth token expired"

* **Cause**: Access token expired (1 hour lifetime)
* **Solution**: ChatGPT will automatically refresh using the refresh token

### "Connection not showing as Connected"

* **Cause**: OAuth flow not completed
* **Solution**: Complete the authorization flow in ChatGPT

### Cannot find OAuth Client Secret

* **Check**: Environment variable `OAUTH_CLIENT_SECRET`
* **Check**: Profile page in your app (it's displayed there)
* **Generate new**: Use the command in Step 2 above

---

## 📚 Related Documentation

* [OAuth Integration Guide](./oauth-chatgpt-integration.md)
* [Migration Summary](./oauth-migration-summary.md)
* [Quick Start Guide](./oauth-quick-start.md)

---

## 🔄 Rotating Credentials

To rotate your OAuth Client Secret:

1. Generate a new secret:
   

```bash
   node -e "console.log('frt_secret_' + require('crypto').randomBytes(16).toString('hex'))"
   ```

2. Update `OAUTH_CLIENT_SECRET` in your `secrets.json`

3. Redeploy your backend:
   

```bash
   serverless deploy
   ```

4. Reconnect ChatGPT with the new secret

---

**Last Updated**: January 16, 2026  
**Version**: 1.0  
**Status**: Production Ready
