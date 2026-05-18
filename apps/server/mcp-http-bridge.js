#!/usr/bin/env node

/**
 * MCP HTTP to STDIO Bridge
 *
 * This script acts as a bridge between Claude Desktop (which expects stdio)
 * and our HTTP MCP server. It translates stdio JSON-RPC messages to HTTP requests.
 */

const http = require('http');
const readline = require('readline');

class MCPHttpBridge {
  constructor(httpUrl, apiKey) {
    this.httpUrl = httpUrl;
    this.apiKey = apiKey;
    this.requestId = 0;

    // Set up stdio interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    this.setupStdioInterface();
  }

  setupStdioInterface() {
    // Handle incoming JSON-RPC messages from Claude Desktop
    this.rl.on('line', async (line) => {
      try {
        const message = JSON.parse(line);
        const response = await this.handleMessage(message);
        // Only send response if it's not null (notifications return null)
        if (response !== null) {
          console.log(JSON.stringify(response));
        }
      } catch (error) {
        console.error(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error.message,
          },
          id: null,
        }));
      }
    });

    // Handle process termination
    process.on('SIGINT', () => {
      this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.cleanup();
      process.exit(0);
    });

    // Send initial ready message
    process.stderr.write('MCP HTTP Bridge ready\n');
  }

  async handleMessage(message) {
    const {
      jsonrpc, method, params, id,
    } = message;

    if (jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid JSON-RPC version',
        },
        id: id || null,
      };
    }

    try {
      // Handle initialization
      if (method === 'initialize') {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        const currentDate = `${day}-${month}-${year}`;

        return {
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              resources: {},
              tools: {},
            },
            serverInfo: {
              name: 'Routine Notes MCP Server',
              version: '1.0.0',
              description: 'Family routine and task management with date context support',
            },
            contextInfo: {
              currentDate,
              dateFormat: 'dd-mm-yyyy',
              note: 'Date context is automatically provided in dd-mm-yyyy format for all operations',
            },
          },
          id,
        };
      }

      // Handle notifications (can come with or without id)
      if (method.startsWith('notifications/')) {
        // Notifications don't require a response in JSON-RPC
        return null;
      }

      // Handle tools/list request
      if (method === 'tools/list') {
        const result = await this.forwardToHttpServer(method, params);
        return {
          jsonrpc: '2.0',
          result: result || { tools: [] },
          id,
        };
      }

      // Handle resources/list request
      if (method === 'resources/list') {
        const result = await this.forwardToHttpServer(method, params);
        return {
          jsonrpc: '2.0',
          result: result || { resources: [] },
          id,
        };
      }

      // Forward other requests to HTTP server
      const result = await this.forwardToHttpServer(method, params);
      return {
        jsonrpc: '2.0',
        result,
        id,
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error.message,
        },
        id,
      };
    }
  }

  async forwardToHttpServer(method, params) {
    return new Promise((resolve, reject) => {
      this.requestId += 1;
      const postData = JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: this.requestId,
      });

      const url = new URL(this.httpUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname === '/mcp' ? '/mcp/call' : `${url.pathname}/call`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'X-API-Key': this.apiKey,
        },
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          } catch (error) {
            reject(new Error('Invalid JSON response from HTTP server'));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  cleanup() {
    if (this.rl) {
      this.rl.close();
    }
    process.stderr.write('MCP HTTP Bridge shutting down\n');
  }
}

// Get configuration from environment variables
const HTTP_URL = process.env.MCP_HTTP_URL || 'http://localhost:4000/mcp';
const API_KEY = process.env.MCP_API_KEY || process.env.X_API_KEY;

if (!API_KEY) {
  console.error('Error: MCP_API_KEY environment variable is required');
  process.exit(1);
}

// Start the bridge
// eslint-disable-next-line no-unused-vars
const bridge = new MCPHttpBridge(HTTP_URL, API_KEY);
