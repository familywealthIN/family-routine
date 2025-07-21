/* eslint-disable */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer, proxy } = require('@vendia/serverless-express');
const { graphql } = require('graphql');
const { schema } = require('./resolvers');
const { UserModel } = require('./schema/UserSchema');
const { getSchemaSDL } = require('./schema/mcpSchema');
const connectDatabase = require('./db');

// MCP Protocol types
const MCP_PROTOCOL_VERSION = '2024-11-05';

class HttpMCPServer {
  constructor() {
    this.app = express();
    this.sseClients = new Map(); // Store SSE connections
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // API Key authentication middleware
    this.app.use('/mcp', async (req, res, next) => {
      const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');

      if (!apiKey) {
        return res.status(401).json({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'API Key required. Please provide API key in X-API-Key header or Authorization header.',
          },
        });
      }

      try {
        const user = await UserModel.findOne({ apiKey }).exec();
        if (!user) {
          return res.status(401).json({
            jsonrpc: '2.0',
            error: {
              code: -32001,
              message: 'Invalid API Key',
            },
          });
        }

        req.user = user;
        req.context = { decodedToken: { email: user.email } };
        next();
      } catch (error) {
        return res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32002,
            message: 'Authentication error',
          },
        });
      }
    });
  }

  setupRoutes() {
    // MCP Server info endpoint
    this.app.get('/mcp', (req, res) => {
      const now = new Date();
      const currentDate = this.formatDateContext(now, 'dd-mm-yyyy');

      res.json({
        protocol: 'mcp',
        version: MCP_PROTOCOL_VERSION,
        name: 'Routine Notes GraphQL MCP Server',
        description: 'MCP Server for Routine Notes GraphQL API with date context support',
        current_date: currentDate.current_date,
        date_format: 'dd-mm-yyyy',
        capabilities: {
          resources: true,
          tools: true,
          sse: true,
        },
        endpoints: {
          'POST /mcp/call': 'Execute MCP requests',
          'GET /mcp/resources': 'List available resources',
          'GET /mcp/tools': 'List available tools',
          'GET /mcp/events': 'SSE endpoint for real-time updates',
          'POST /mcp/events/send': 'Send events to SSE clients',
        },
        date_context: {
          description: 'Date context is automatically provided in dd-mm-yyyy format',
          usage: 'Use get_current_date tool or context://current-date resource for date information',
        },
      });
    });

    // MCP JSON-RPC endpoint
    this.app.post('/mcp/call', async (req, res) => {
      try {
        const { jsonrpc, method, params, id } = req.body;

        if (jsonrpc !== '2.0') {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32600,
              message: 'Invalid JSON-RPC version',
            },
            id: id || null,
          });
        }

        const result = await this.handleMCPRequest(method, params, req.context);

        res.json({
          jsonrpc: '2.0',
          result,
          id: id || null,
        });
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error.message,
          },
          id: req.body.id || null,
        });
      }
    });

    // REST endpoints for easier testing
    this.app.get('/mcp/resources', async (req, res) => {
      try {
        const result = await this.handleMCPRequest('resources/list', {}, req.context);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/mcp/tools', async (req, res) => {
      try {
        const result = await this.handleMCPRequest('tools/list', {}, req.context);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/mcp/graphql', async (req, res) => {
      try {
        const { query, variables } = req.body;
        const result = await this.handleMCPRequest('tools/call', {
          name: 'graphql_query',
          arguments: { query, variables, context: req.context },
        }, req.context);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // SSE endpoint for real-time updates
    this.app.get('/mcp/events', (req, res) => {
      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      // Generate unique client ID
      const clientId = Date.now() + Math.random().toString(36).substr(2, 9);

      // Store client connection
      this.sseClients.set(clientId, {
        response: res,
        user: req.user,
        lastPing: Date.now()
      });

      // Send initial connection event
      res.write(`event: connected\n`);
      res.write(`data: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        if (this.sseClients.has(clientId)) {
          res.write(`event: ping\n`);
          res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
          this.sseClients.get(clientId).lastPing = Date.now();
        } else {
          clearInterval(heartbeat);
        }
      }, 30000); // 30 second heartbeat

      // Handle client disconnect
      req.on('close', () => {
        this.sseClients.delete(clientId);
        clearInterval(heartbeat);
        console.log(`SSE client ${clientId} disconnected`);
      });

      req.on('error', () => {
        this.sseClients.delete(clientId);
        clearInterval(heartbeat);
      });

      console.log(`SSE client ${clientId} connected`);
    });

    // Endpoint to send custom events to SSE clients
    this.app.post('/mcp/events/send', async (req, res) => {
      try {
        const { event, data, userId } = req.body;

        if (!event || !data) {
          return res.status(400).json({ error: 'Event and data are required' });
        }

        const sent = this.broadcastSSEEvent(event, data, userId);
        res.json({
          success: true,
          message: `Event sent to ${sent} clients`,
          clientCount: this.sseClients.size
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  async handleMCPRequest(method, params, context) {
    switch (method) {
      case 'resources/list':
        return {
          resources: [
            {
              uri: 'context://current-date',
              name: 'Current Date Context',
              description: 'Current date and time information in dd-mm-yyyy format and other formats for context',
              mimeType: 'application/json',
            },
            {
              uri: 'graphql://schema',
              name: 'GraphQL Schema',
              description: 'The GraphQL schema for the Routine Notes API',
              mimeType: 'application/graphql',
            },
            {
              uri: 'graphql://introspection',
              name: 'GraphQL Introspection',
              description: 'GraphQL introspection query result',
              mimeType: 'application/json',
            },
          ],
        };

      case 'resources/read':
        return this.handleResourceRead(params.uri, context);

      case 'tools/list':
        return {
          tools: [
            {
              name: 'graphql_query',
              description: 'Execute a GraphQL query or mutation on the Routine Notes API',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The GraphQL query or mutation to execute',
                  },
                  variables: {
                    type: 'object',
                    description: 'Variables for the GraphQL query',
                  },
                },
                required: ['query'],
              },
            },
            {
              name: 'get_current_date',
              description: 'Get the current date and time information in dd-mm-yyyy format along with other useful date formats',
              inputSchema: {
                type: 'object',
                properties: {
                  format: {
                    type: 'string',
                    description: 'Optional date format preference (dd-mm-yyyy, yyyy-mm-dd, iso, or all)',
                    enum: ['dd-mm-yyyy', 'yyyy-mm-dd', 'iso', 'all'],
                    default: 'all'
                  },
                  timezone: {
                    type: 'string',
                    description: 'Optional timezone (defaults to local timezone)',
                  },
                },
                required: [],
              },
            },
          ],
        };

      case 'tools/call':
        return this.handleToolCall(params, context);

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  async handleResourceRead(uri, context) {
    if (uri === 'context://current-date') {
      const now = new Date();
      const dateContext = this.formatDateContext(now);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(dateContext, null, 2),
          },
        ],
      };
    }

    if (uri === 'graphql://schema') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/graphql',
            text: getSchemaSDL(),
          },
        ],
      };
    }

    if (uri === 'graphql://introspection') {
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            queryType { name }
            mutationType { name }
            types {
              kind
              name
              description
              fields(includeDeprecated: true) {
                name
                description
                type {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
            }
          }
        }
      `;

      const result = await graphql(schema, introspectionQuery, null, context);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  }

  async handleToolCall(params, context) {
    const { name, arguments: args } = params;

    if (name === 'get_current_date') {
      const { format = 'all', timezone } = args || {};
      const now = timezone ? new Date(new Date().toLocaleString("en-US", { timeZone: timezone })) : new Date();
      const dateContext = this.formatDateContext(now, format);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(dateContext, null, 2),
          },
        ],
      };
    }

    if (name === 'graphql_query') {
      const { query, variables } = args;

      if (!query) {
        throw new Error('GraphQL query is required');
      }

      try {
        const result = await graphql(
          schema,
          query,
          null,
          context,
          variables || {}
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: error.message }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  }

  // SSE Broadcasting methods
  broadcastSSEEvent(event, data, userId = null) {
    let sentCount = 0;

    for (const [clientId, client] of this.sseClients.entries()) {
      try {
        // If userId is specified, only send to that user
        if (userId && client.user && client.user._id.toString() !== userId) {
          continue;
        }

        // Check if connection is still alive (last ping within 2 minutes)
        if (Date.now() - client.lastPing > 120000) {
          this.sseClients.delete(clientId);
          continue;
        }

        client.response.write(`event: ${event}\n`);
        client.response.write(`data: ${JSON.stringify(data)}\n\n`);
        sentCount++;
      } catch (error) {
        console.error(`Error sending SSE to client ${clientId}:`, error);
        this.sseClients.delete(clientId);
      }
    }

    return sentCount;
  }

  // Send routine updates
  notifyRoutineUpdate(routineData, userId = null) {
    return this.broadcastSSEEvent('routine_update', {
      type: 'routine_updated',
      routine: routineData,
      timestamp: new Date().toISOString()
    }, userId);
  }

  // Send goal updates
  notifyGoalUpdate(goalData, userId = null) {
    return this.broadcastSSEEvent('goal_update', {
      type: 'goal_updated',
      goal: goalData,
      timestamp: new Date().toISOString()
    }, userId);
  }

  // Send user updates
  notifyUserUpdate(userData, userId = null) {
    return this.broadcastSSEEvent('user_update', {
      type: 'user_updated',
      user: userData,
      timestamp: new Date().toISOString()
    }, userId);
  }

  // Send generic notifications
  sendNotification(message, type = 'info', userId = null) {
    return this.broadcastSSEEvent('notification', {
      type: 'notification',
      level: type,
      message,
      timestamp: new Date().toISOString()
    }, userId);
  }

  // Get SSE client count
  getSSEClientCount() {
    return this.sseClients.size;
  }

  formatDateContext(date, format = 'all') {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    const dateFormats = {
      'dd-mm-yyyy': `${day}-${month}-${year}`,
      'iso': date.toISOString(),
      'timestamp': date.getTime(),
      'time_24h': `${hours}:${minutes}:${seconds}`,
      'time_12h': date.toLocaleTimeString('en-US', { hour12: true }),
      'day_of_week': date.toLocaleDateString('en-US', { weekday: 'long' }),
      'month_name': date.toLocaleDateString('en-US', { month: 'long' }),
      'timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    if (format === 'all') {
      return {
        current_date: dateFormats['dd-mm-yyyy'],
        formats: dateFormats,
        context: {
          description: 'Current date and time context for routine and task management',
          primary_format: 'dd-mm-yyyy',
          note: 'Use this date context when creating, updating, or querying routine items, goals, and tasks'
        }
      };
    }

    return {
      current_date: dateFormats[format] || dateFormats['dd-mm-yyyy'],
      format: format,
      all_formats: format === 'dd-mm-yyyy' ? undefined : dateFormats,
    };
  }

  // Express server methods
  startServer(port = 4000) {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`Routine Notes MCP Server running on port ${port}`);
        console.log(`MCP Endpoint: http://localhost:${port}/mcp`);
        console.log(`GraphQL Endpoint: http://localhost:${port}/mcp/graphql`);
        resolve(this.server);
      });
    });
  }

  // Serverless handler
  createServerlessHandler() {
    const server = createServer(this.app);
    return (event, context, callback) => {
      context.callbackWaitsForEmptyEventLoop = false;
      return proxy(server, event, context, 'PROMISE').promise;
    };
  }
}

module.exports = { HttpMCPServer };

// Start the server if this file is run directly
if (require.main === module) {
  async function startServer() {
    try {
      console.log('Initializing Routine Notes MCP HTTP Server...');

      // Connect to database
      await connectDatabase();
      console.log('Connected to MongoDB');

      // Create and start MCP server
      const mcpServer = new HttpMCPServer();
      await mcpServer.startServer(4000);

      console.log('MCP Server initialized with:');
      console.log('- Date context support (dd-mm-yyyy format)');
      console.log('- SSE real-time updates');
      console.log('- Database encryption');
      console.log('- GraphQL API integration');

    } catch (error) {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  }

  startServer();
}
