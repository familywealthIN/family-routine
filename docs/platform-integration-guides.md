# Platform Integration Guides

## Overview

Your Family Routine MCP server can be integrated with multiple AI platforms using OAuth 2.0 authentication. This document provides quick setup guides for each supported platform.

---

## 🔐 Universal OAuth Credentials

**Use these credentials for ALL platforms:**

* **Server URL**: Your MCP server endpoint
  + Production: `https://your-domain.com/dev/mcp`
  + Local: `http://localhost:4000/mcp`

* **OAuth Client ID**: `routine-notes-mcp`

* **OAuth Client Secret**: Generate using:
  

```bash
  node scripts/generate-oauth-credentials.js
  ```

  Format: `frt_secret_<32_hex_chars>`

---

## 🤖 ChatGPT Integration

### Prerequisites

* ChatGPT Plus or Team subscription
* Access to Beta features

### Setup Steps

01. Open **ChatGPT**
02. Click your profile → **Settings**
03. Navigate to **Beta Features**
04. Find **MCP Servers** section
05. Click **Add MCP Server**
06. Enter the **Server URL**
07. Enter **Client ID**: `routine-notes-mcp`
08. Enter **Client Secret**
09. Click **Authorize**
10. Complete authorization in your app
11. ✅ Done!

### Use Cases

* Ask ChatGPT about your daily routines
* Get AI insights on your goals
* Create tasks via natural language
* Analyze your progress and patterns

---

## 🔄 n8n Workflow Automation

### Prerequisites

* n8n instance (cloud or self-hosted)
* OAuth2 credentials support

### Setup Steps

01. Open your **n8n** instance
02. Go to **Credentials** section
03. Click **New Credential**
04. Select **OAuth2 API**
05. Configure:
   - **Grant Type**: Authorization Code
   - **Authorization URL**: `{server_url}/oauth/authorize`

   - **Access Token URL**: `{server_url}/oauth/token`

   - **Client ID**: `routine-notes-mcp`

   - **Client Secret**: (from your profile)
   - **Scope**: `read write`

06. Click **Connect my account**
07. Authorize in your app
08. Use **HTTP Request** node with this credential
09. Make requests to: `{server_url}/call`

### Use Cases

* Automate routine creation
* Sync goals with other apps
* Create scheduled workflows
* Build custom integrations

### Example Workflow

```json
{
  "nodes": [
    {
      "name": "Get Daily Goals",
      "type": "n8n-nodes-base.httpRequest",
      "credentials": {
        "oAuth2Api": "Family Routine OAuth"
      },
      "parameters": {
        "url": "{{$env.MCP_SERVER_URL}}/call",
        "method": "POST",
        "jsonParameters": true,
        "bodyParametersJson": {
          "jsonrpc": "2.0",
          "method": "tools/call",
          "params": {
            "name": "graphql_query",
            "arguments": {
              "query": "query { dailyGoals(date: \"16-01-2026\") { id body } }"
            }
          },
          "id": 1
        }
      }
    }
  ]
}
```

---

## 🌟 Google Gemini Integration

### Prerequisites

* Google Gemini account
* Access to Extensions (when available)

### Setup Steps

01. Open **Google Gemini**
02. Navigate to **Settings**
03. Find **Extensions** or **Connected Apps**
04. Click **Add Extension**
05. Select **Custom OAuth App** or **MCP Server**
06. Enter configuration:
   - **Server URL**: (from profile)
   - **Client ID**: `routine-notes-mcp`

   - **Client Secret**: (from profile)
07. Click **Connect**
08. Authorize when prompted
09. ✅ Integration active!

### Use Cases

* Ask Gemini about your routine
* Get Google AI insights on goals
* Create visual planning with Gemini
* Multi-modal routine analysis

### Note

Gemini's MCP support may vary based on availability. Check Google's latest documentation.

---

## 🔍 Perplexity AI Integration

### Prerequisites

* Perplexity Pro subscription
* Access to API or MCP features

### Setup Steps

01. Open **Perplexity**
02. Go to **Settings** → **Integrations**
03. Find **Custom Integrations** or **API Connections**
04. Click **Add Integration**
05. Choose **OAuth 2.0** authentication
06. Enter credentials:
   - **Name**: Family Routine
   - **Server URL**: (from profile)
   - **Client ID**: `routine-notes-mcp`

   - **Client Secret**: (from profile)
07. Click **Connect**
08. Complete OAuth flow
09. ✅ Ready!

### Use Cases

* Research-based routine optimization
* Ask questions about your goals with sources
* Get factual insights on productivity
* Data-driven planning assistance

---

## 🔧 Common Configuration

All platforms use the same OAuth endpoints:

### Discovery Endpoint

```
GET {server_url}/.well-known/mcp-configuration
```

Returns:

```json
{
  "oauth": {
    "authorizationUrl": "{server_url}/oauth/authorize",
    "tokenUrl": "{server_url}/oauth/token",
    "scopes": ["read", "write"]
  }
}
```

### Authorization Flow

01. Platform redirects to: `{server_url}/oauth/authorize`
02. User authorizes in your app
03. Redirect back with auth code
04. Platform exchanges code for token at: `{server_url}/oauth/token`
05. Platform makes authenticated requests

### Token Details

* **Access Token Lifetime**: 1 hour
* **Refresh Token**: Automatic renewal
* **Token Format**: `mcp_<hex_string>`
* **Refresh Format**: `mcpr_<hex_string>`

---

## 🛠️ API Usage Examples

### GraphQL Query via MCP

```bash
curl -X POST {server_url}/call \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "graphql_query",
      "arguments": {
        "query": "query { goals { id body period } }"
      }
    },
    "id": 1
  }'
```

### Get Current Date Context

```bash
curl -X POST {server_url}/call \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_current_date",
      "arguments": {
        "format": "all"
      }
    },
    "id": 1
  }'
```

### List Available Tools

```bash
curl -X POST {server_url}/call \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'
```

---

## 🔒 Security Best Practices

01. **Never share your Client Secret** publicly
02. **Use HTTPS** in production
03. **Rotate secrets regularly** (every 90 days)
04. **Different secrets** for dev and production
05. **Monitor OAuth connections** in your Profile page
06. **Revoke access** if credentials are compromised

---

## 🆘 Troubleshooting

### "Invalid client credentials"

* Verify Client ID matches exactly
* Check Client Secret hasn't been changed
* Ensure no extra spaces in credentials

### "OAuth token expired"

* Normal behavior (1-hour lifetime)
* Platform should auto-refresh
* Reconnect if refresh fails

### "Authorization failed"

* Complete the authorization flow in your app
* Check popup blockers aren't preventing redirect
* Verify you're logged into your app

### Connection not showing in Profile

* Wait a few seconds and refresh
* Check OAuth flow completed successfully
* Verify platform supports MCP protocol

---

## 📊 Platform Comparison

| Platform | Status | Best For | MCP Support |
|----------|--------|----------|-------------|
| ChatGPT | ✅ Active | Conversational AI | Full |
| n8n | ✅ Active | Automation | Full (via HTTP) |
| Gemini | 🔄 Emerging | Multi-modal AI | Varies |
| Perplexity | 🔄 Emerging | Research AI | Varies |

---

## 📚 Additional Resources

* [OAuth Setup Guide](./oauth-credentials.md)
* [MCP Server Documentation](./oauth-chatgpt-integration.md)
* [Quick Start Guide](./oauth-quick-start.md)
* [API Reference](./mcp-api-reference.md)

---

**Last Updated**: January 16, 2026  
**Version**: 1.1  
**Platforms Supported**: 4
