/* eslint-disable */
require('./utils/suppressMongooseWarnings')();
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const serverlessExpress = require('@vendia/serverless-express');
const { graphql } = require('graphql');
const { schema } = require('./resolvers');
const { UserModel } = require('./schema/UserSchema');
const { getSchemaSDL } = require('./schema/mcpSchema');
const connectDatabase = require('./db');
const { createAuthRouter, publicBase } = require('./mcpAuthRoutes');
const { emailForAccessToken } = require('./utils/mcpOAuth');

// MCP Protocol types
const MCP_PROTOCOL_VERSION = '2024-11-05';
// Newest first: `initialize` answers with the client's version when it is one
// of these, otherwise with the newest.
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER_INSTRUCTIONS = 'Routine Notes: a day of time-boxed routines with goals at day, week, '
  + 'month and year. Dates are DD-MM-YYYY; call get_current_date first when the user says today or tomorrow.';

class HttpMCPServer {
  constructor() {
    this.app = express();
    this.sseClients = new Map(); // Store SSE connections
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Public: any AI app, from any origin (GraphQL is the one limited to the
    // app's own sites). Browser clients need to read the sign-in challenge.
    this.app.use(cors({
      origin: '*',
      exposedHeaders: ['WWW-Authenticate', 'Mcp-Session-Id', 'Mcp-Protocol-Version'],
      maxAge: 600,
    }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // OAuth discovery, registration, authorize and token, at the origin root.
    this.app.use(createAuthRouter());

    // Every /mcp route needs a caller: an OAuth access token, a token from the
    // retired per-user flow, or a legacy API key.
    this.app.use('/mcp', async (req, res, next) => {
      if (req.path === '/.well-known/mcp-configuration') return next();

      const authHeader = req.headers.authorization || '';
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const challenge = (error) => {
        const metadata = `${publicBase(req)}/.well-known/oauth-protected-resource/mcp`;
        res.set('WWW-Authenticate', `Bearer resource_metadata="${metadata}"${error ? `, error="${error}"` : ''}`);
        return res.status(401).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: error ? 'Invalid or expired access token' : 'Authentication required' },
          id: null,
        });
      };

      const email = bearer ? emailForAccessToken(bearer) : null;
      if (email) {
        req.context = { decodedToken: { email } };
        return next();
      }

      try {
        let user = null;
        if (bearer) {
          user = await UserModel.findOne({ 'oauth.accessToken': bearer }).exec();
          if (user && user.oauth.expiresAt && new Date(user.oauth.expiresAt) < new Date()) user = null;
        }
        const apiKey = req.headers['x-api-key'] || bearer;
        if (!user && apiKey) user = await UserModel.findOne({ apiKey }).exec();
        if (!user) return challenge(bearer ? 'invalid_token' : '');
        req.user = user;
        req.context = { decodedToken: { email: user.email } };
        return next();
      } catch (error) {
        return res.status(500).json({ jsonrpc: '2.0', error: { code: -32002, message: 'Authentication error' }, id: null });
      }
    });
  }

  setupRoutes() {
    // Retired discovery document; the standard ones live in mcpAuthRoutes.js.
    this.app.get('/mcp/.well-known/mcp-configuration', (req, res) => {
      const base = publicBase(req);
      res.json({
        oauth: {
          authorizationUrl: `${base}/authorize`,
          tokenUrl: `${base}/token`,
          scopes: ['read', 'write'],
        },
      });
    });

    // MCP Streamable HTTP: JSON-RPC in, JSON out. No sessions and no server
    // stream, which a Lambda can't hold open anyway.
    this.app.post('/mcp', async (req, res) => {
      const body = req.body;
      const batch = Array.isArray(body);
      const messages = batch ? body : [body];
      if (!messages.length || messages.some((m) => !m || m.jsonrpc !== '2.0')) {
        return res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: null });
      }
      const replies = (await Promise.all(messages.map((m) => this.handleRpc(m, req.context)))).filter(Boolean);
      if (!replies.length) return res.status(202).end();
      return res.json(batch ? replies : replies[0]);
    });

    // Clients may open a server stream or end a session; this server has neither.
    this.app.get('/mcp', (req, res, next) => {
      if (!String(req.get('accept') || '').includes('text/event-stream')) return next();
      return res.status(405).set('Allow', 'POST').end();
    });
    this.app.delete('/mcp', (req, res) => res.status(405).set('Allow', 'POST').end());

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
        authentication: {
          type: 'oauth',
          oauth_config_url: '/.well-known/oauth-protected-resource/mcp',
          legacy_api_key: 'supported (X-API-Key header)',
        },
        capabilities: {
          resources: true,
          tools: true,
          sse: true,
        },
        endpoints: {
          'POST /mcp': 'MCP Streamable HTTP (JSON-RPC)',
          'POST /mcp/call': 'Execute MCP requests',
          'GET /mcp/resources': 'List available resources',
          'GET /mcp/tools': 'List available tools',
          'GET /mcp/events': 'SSE endpoint for real-time updates',
          'POST /mcp/events/send': 'Send events to SSE clients',
          'GET /.well-known/oauth-authorization-server': 'OAuth configuration',
          'GET /authorize': 'OAuth authorization',
          'POST /token': 'OAuth token exchange',
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

  /**
   * One JSON-RPC message: a reply, or null for a notification (no `id`).
   * Errors become JSON-RPC errors, never an HTTP failure for the whole batch.
   */
  async handleRpc(message, context) {
    const { id, method, params } = message;
    if (id === undefined || id === null) return null;
    try {
      let result;
      if (method === 'initialize') {
        const asked = params && params.protocolVersion;
        result = {
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(asked) ? asked : SUPPORTED_PROTOCOL_VERSIONS[0],
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'routine-notes', title: 'Routine Notes', version: '1.0.0' },
          instructions: SERVER_INSTRUCTIONS,
        };
      } else if (method === 'ping') {
        result = {};
      } else if (['tools/list', 'tools/call', 'resources/list', 'resources/read'].includes(method)) {
        result = await this.handleMCPRequest(method, params || {}, context);
      } else {
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
      }
      return { jsonrpc: '2.0', id, result };
    } catch (error) {
      return { jsonrpc: '2.0', id, error: { code: -32603, message: error.message } };
    }
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
              description: 'Execute any GraphQL query or mutation against the Routine Notes API. Use the graphql://schema resource to discover available operations. All dates use DD-MM-YYYY format.',
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
            {
              name: 'get_daily_goals',
              description: 'Get all active goals for a specific date across all periods (day, week, month, year). Uses the optimized query to minimise DB round-trips.',
              inputSchema: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'Date in DD-MM-YYYY format' },
                },
                required: ['date'],
              },
            },
            {
              name: 'get_routine',
              description: 'Get the daily routine snapshot for a specific date, including all tasks with their ticked/passed/wait state and stimulus points.',
              inputSchema: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'Date in DD-MM-YYYY format' },
                },
                required: ['date'],
              },
            },
            {
              name: 'search_goals',
              description: 'Full-text search across all goal items (body and contribution fields). Returns matching goals with filtered goalItems.',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Search text (minimum 2 characters)' },
                  limit: { type: 'string', description: 'Maximum number of goal items to return (default: 50)' },
                  taskRef: { type: 'string', description: 'Optional: filter results by routine task ID' },
                  tags: { type: 'string', description: 'Optional: filter results by tag' },
                },
                required: ['query'],
              },
            },
            {
              name: 'add_goal_item',
              description: 'Add a new goal item for a given date and period. Use period "day" for daily tasks, "week" for weekly goals, "month"/"year"/"lifetime" for longer horizons.',
              inputSchema: {
                type: 'object',
                properties: {
                  body: { type: 'string', description: 'Goal item text' },
                  period: { type: 'string', description: 'day | week | month | year | lifetime' },
                  date: { type: 'string', description: 'Date in DD-MM-YYYY format' },
                  isComplete: { type: 'boolean' },
                  isMilestone: { type: 'boolean' },
                  deadline: { type: 'string', description: 'Deadline date in DD-MM-YYYY format' },
                  contribution: { type: 'string', description: 'Markdown notes / progress journal' },
                  reward: { type: 'string' },
                  taskRef: { type: 'string', description: 'Routine task ID to link this goal to' },
                  goalRef: { type: 'string', description: 'Parent goal item ID (required when isMilestone is true)' },
                  tags: { type: 'array', items: { type: 'string' } },
                  originalDate: { type: 'string', description: 'Original date if this is a rescheduled item' },
                },
                required: ['body', 'period', 'date'],
              },
            },
            {
              name: 'complete_goal_item',
              description: 'Mark a goal item as complete or incomplete. Also updates stimulus points on the linked routine task and cascades completion up to weekly/monthly/yearly goals.',
              inputSchema: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Goal item ID' },
                  taskRef: { type: 'string', description: 'Linked routine task ID (pass empty string if none)' },
                  date: { type: 'string', description: 'Date in DD-MM-YYYY format' },
                  period: { type: 'string', description: 'day | week | month | year | lifetime' },
                  isComplete: { type: 'boolean' },
                  isMilestone: { type: 'boolean' },
                },
                required: ['id', 'taskRef', 'date', 'period', 'isComplete', 'isMilestone'],
              },
            },
            {
              name: 'bulk_add_goal_items',
              description: 'Add multiple goal items across any dates and periods in a single call. Ideal for initialising a week plan or creating AI-generated milestone entries.',
              inputSchema: {
                type: 'object',
                properties: {
                  goals: {
                    type: 'array',
                    description: 'Array of goal item objects',
                    items: {
                      type: 'object',
                      properties: {
                        body: { type: 'string' },
                        period: { type: 'string' },
                        date: { type: 'string' },
                        isComplete: { type: 'boolean' },
                        isMilestone: { type: 'boolean' },
                        deadline: { type: 'string' },
                        contribution: { type: 'string' },
                        reward: { type: 'string' },
                        taskRef: { type: 'string' },
                        goalRef: { type: 'string' },
                        tags: { type: 'array', items: { type: 'string' } },
                        status: { type: 'string' },
                        originalDate: { type: 'string' },
                      },
                      required: ['body', 'period', 'date'],
                    },
                  },
                },
                required: ['goals'],
              },
            },
            {
              name: 'generate_milestone_plan',
              description: 'Use AI to generate a structured milestone plan for a goal (e.g. "Learn Spanish in 6 months"). Returns period-dated entries ready to be saved with bulk_add_goal_items.',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Natural language goal description' },
                  systemPrompt: { type: 'string', description: 'Optional custom system prompt to steer the AI' },
                },
                required: ['query'],
              },
            },
            {
              name: 'extract_day_task',
              description: 'Use AI to parse a natural language string into a structured task (title, tags, priority, due date).',
              inputSchema: {
                type: 'object',
                properties: {
                  query: { type: 'string', description: 'Natural language task description, e.g. "Call Alice about the Q2 report tomorrow morning"' },
                  systemPrompt: { type: 'string', description: 'Optional custom system prompt' },
                },
                required: ['query'],
              },
            },
            {
              name: 'get_progress',
              description: 'Get a progress report showing D/K/G stimulus totals and goal completion rates for a given period and date range.',
              inputSchema: {
                type: 'object',
                properties: {
                  period: { type: 'string', description: 'Reporting period: day | week | month | year' },
                  startDate: { type: 'string', description: 'Start date in DD-MM-YYYY format' },
                  endDate: { type: 'string', description: 'End date in DD-MM-YYYY format' },
                },
                required: ['period', 'startDate', 'endDate'],
              },
            },
            {
              name: 'get_priority_goals',
              description: 'Get goal items for a day sorted into the Eisenhower priority matrix buckets: do (urgent+important), plan (not urgent+important), delegate (urgent+not important), automate (not urgent+not important).',
              inputSchema: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'Date in DD-MM-YYYY format' },
                },
                required: ['date'],
              },
            },
            {
              name: 'reschedule_goal_item',
              description: 'Move a goal item from one date to another. Sets status to "rescheduled" and preserves the original date.',
              inputSchema: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Goal item ID' },
                  oldDate: { type: 'string', description: 'Current date in DD-MM-YYYY format' },
                  newDate: { type: 'string', description: 'Target date in DD-MM-YYYY format' },
                  period: { type: 'string', description: 'Goal period (usually "day")' },
                },
                required: ['id', 'oldDate', 'newDate', 'period'],
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

    // Helper: run a GraphQL operation and return formatted MCP content
    const runGraphQL = async (query, variables) => {
      try {
        const result = await graphql(schema, query, null, context, variables || {});
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !!(result.errors && result.errors.length),
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: error.message }, null, 2) }],
          isError: true,
        };
      }
    };

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
      if (!query) throw new Error('GraphQL query is required');
      return runGraphQL(query, variables);
    }

    if (name === 'get_daily_goals') {
      const { date } = args;
      return runGraphQL(
        `query GetDailyGoals($date: String!) {
            optimizedDailyGoals(date: $date) {
                id date period
                goalItems {
                    id body period date isComplete isMilestone
                    deadline contribution reward taskRef goalRef
                    tags status createdAt completedAt originalDate progress
                    subTasks { id body isComplete }
                }
            }
        }`,
        { date }
      );
    }

    if (name === 'get_routine') {
      const { date } = args;
      return runGraphQL(
        `query GetRoutine($date: String!) {
            routineDate(date: $date) {
                id date skip
                tasklist {
                    id name description time points ticked passed wait
                    startEvent endEvent tags
                    steps { id name }
                    stimuli { name splitRate earned }
                }
            }
        }`,
        { date }
      );
    }

    if (name === 'search_goals') {
      const { query, limit, taskRef, tags } = args;
      return runGraphQL(
        `query SearchGoals($query: String!, $limit: String, $taskRef: String, $tags: String) {
            searchGoals(query: $query, limit: $limit, taskRef: $taskRef, tags: $tags) {
                id date period
                goalItems {
                    id body period date isComplete isMilestone
                    deadline contribution tags status createdAt completedAt originalDate
                }
            }
        }`,
        { query, limit, taskRef, tags }
      );
    }

    if (name === 'add_goal_item') {
      const {
        body, period, date, isComplete, isMilestone, deadline,
        contribution, reward, taskRef, goalRef, tags, originalDate,
      } = args;
      return runGraphQL(
        `mutation AddGoalItem(
            $body: String!, $period: String!, $date: String!,
            $isComplete: Boolean, $isMilestone: Boolean, $deadline: String,
            $contribution: String, $reward: String, $taskRef: String,
            $goalRef: String, $tags: [String], $originalDate: String
        ) {
            addGoalItem(
                body: $body, period: $period, date: $date,
                isComplete: $isComplete, isMilestone: $isMilestone, deadline: $deadline,
                contribution: $contribution, reward: $reward, taskRef: $taskRef,
                goalRef: $goalRef, tags: $tags, originalDate: $originalDate
            ) {
                id body period date isComplete isMilestone deadline
                contribution reward taskRef goalRef tags status
                createdAt completedAt originalDate
            }
        }`,
        { body, period, date, isComplete, isMilestone, deadline, contribution, reward, taskRef, goalRef, tags, originalDate }
      );
    }

    if (name === 'complete_goal_item') {
      const { id, taskRef, date, period, isComplete, isMilestone } = args;
      return runGraphQL(
        `mutation CompleteGoalItem(
            $id: ID!, $taskRef: String!, $date: String!, $period: String!,
            $isComplete: Boolean!, $isMilestone: Boolean!
        ) {
            completeGoalItem(
                id: $id, taskRef: $taskRef, date: $date, period: $period,
                isComplete: $isComplete, isMilestone: $isMilestone
            ) {
                id body isComplete status completedAt
            }
        }`,
        { id, taskRef, date, period, isComplete, isMilestone }
      );
    }

    if (name === 'bulk_add_goal_items') {
      const { goals } = args;
      return runGraphQL(
        `mutation BulkAddGoalItems($goals: [GoalItemInput]!) {
            addBulkGoalItems(goals: $goals) {
                id body period date isComplete isMilestone
                deadline contribution reward taskRef goalRef tags
                status createdAt originalDate
            }
        }`,
        { goals }
      );
    }

    if (name === 'generate_milestone_plan') {
      const { query, systemPrompt } = args;
      return runGraphQL(
        `mutation GenerateMilestonePlan($query: String!, $systemPrompt: String) {
            generateMilestonePlan(query: $query, systemPrompt: $systemPrompt) {
                period title error rawResponse
                entries { period periodName date title description }
            }
        }`,
        { query, systemPrompt }
      );
    }

    if (name === 'extract_day_task') {
      const { query, systemPrompt } = args;
      return runGraphQL(
        `mutation ExtractDayTask($query: String!, $systemPrompt: String) {
            extractDayTask(query: $query, systemPrompt: $systemPrompt) {
                title description tags dueDate priority error
            }
        }`,
        { query, systemPrompt }
      );
    }

    if (name === 'get_progress') {
      const { period, startDate, endDate } = args;
      return runGraphQL(
        `query GetProgress($period: String!, $startDate: String!, $endDate: String!) {
            getProgress(period: $period, startDate: $startDate, endDate: $endDate) {
                D K G totalPoints
                goalProgress {
                    day { complete total }
                    week { complete total }
                    month { complete total }
                    year { complete total }
                }
            }
        }`,
        { period, startDate, endDate }
      );
    }

    if (name === 'get_priority_goals') {
      const { date } = args;
      return runGraphQL(
        `query GetPriorityGoals($date: String!) {
            priorityGoals(date: $date) {
                goalId date period
                do { id body tags status isComplete deadline }
                plan { id body tags status isComplete deadline }
                delegate { id body tags status isComplete deadline }
                automate { id body tags status isComplete deadline }
            }
        }`,
        { date }
      );
    }

    if (name === 'reschedule_goal_item') {
      const { id, oldDate, newDate, period } = args;
      return runGraphQL(
        `mutation RescheduleGoalItem($id: ID!, $oldDate: String!, $newDate: String!, $period: String!) {
            rescheduleGoalItem(id: $id, oldDate: $oldDate, newDate: $newDate, period: $period) {
                id body status originalDate date period
            }
        }`,
        { id, oldDate, newDate, period }
      );
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

  // Serverless handler — uses @vendia/serverless-express v4 modern API.
  // The legacy createServer/proxy path in v4 silently returns undefined,
  // causing API Gateway 502s. Cache the wrapped handler across invocations.
  createServerlessHandler() {
    if (!this._cachedServerlessHandler) {
      this._cachedServerlessHandler = serverlessExpress({ app: this.app });
    }
    return (event, context) => {
      context.callbackWaitsForEmptyEventLoop = false;
      return this._cachedServerlessHandler(withFullPath(event), context);
    };
  }
}

/**
 * serverless-express takes the path from a `{proxy+}` parameter when there is
 * one, so `/.well-known/{proxy+}` reached Express as `/oauth-protected-resource`
 * and `/mcp/{proxy+}` lost its `/mcp`. Drop the parameter so it uses
 * `event.path`, the whole path (without the stage).
 */
function withFullPath(event) {
  if (!event || !event.path || !event.pathParameters || !event.pathParameters.proxy) return event;
  const { proxy, ...pathParameters } = event.pathParameters;
  return { ...event, pathParameters };
}

module.exports = { HttpMCPServer, withFullPath };

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
