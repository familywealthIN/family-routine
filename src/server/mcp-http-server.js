/* eslint-disable */
const express = require('express');
const cors = require('cors');
const { createServer, proxy } = require('aws-serverless-express');
const { graphql } = require('graphql');
const { schema } = require('./resolvers');
const { UserModel } = require('./schema/UserSchema');
const connectDatabase = require('./db');

// MCP Protocol types
const MCP_PROTOCOL_VERSION = '2024-11-05';

class HttpMCPServer {
    constructor() {
        this.app = express();
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
            res.json({
                protocol: 'mcp',
                version: MCP_PROTOCOL_VERSION,
                name: 'Routine Notes GraphQL MCP Server',
                description: 'MCP Server for Routine Notes GraphQL API',
                capabilities: {
                    resources: true,
                    tools: true,
                },
                endpoints: {
                    'POST /mcp/call': 'Execute MCP requests',
                    'GET /mcp/resources': 'List available resources',
                    'GET /mcp/tools': 'List available tools',
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
    }

    async handleMCPRequest(method, params, context) {
        switch (method) {
            case 'resources/list':
                return {
                    resources: [
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
                    ],
                };

            case 'tools/call':
                return this.handleToolCall(params, context);

            default:
                throw new Error(`Unknown method: ${method}`);
        }
    }

    async handleResourceRead(uri, context) {
        if (uri === 'graphql://schema') {
            return {
                contents: [
                    {
                        uri,
                        mimeType: 'application/graphql',
                        text: this.getSchemaSDL(),
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

    getSchemaSDL() {
        return `
# Routine Notes GraphQL Schema
# This schema provides access to user routines, goals, and related data

type Query {
  # User queries
  getUserTags: UserItem
  showInvite: UserItem
  getUsersByGroupId(groupId: String!): [UserItem]
  
  # Add other queries based on your actual resolvers...
}

type Mutation {
  # User mutations
  generateApiKey: UserItem
  authGoogle(accessToken: String!, notificationId: String!): UserItem
  
  # Add other mutations based on your actual resolvers...
}

type UserItem {
  name: String
  email: String
  picture: String
  groupId: String
  apiKey: String
  token: String
  notificationId: String
  holidays: Int
  inviterEmail: String
  invitedEmail: String
  isNew: Boolean
  motto: [MottoItem]
  tags: [String]
}

type MottoItem {
  text: String
  category: String
}

# Add other types based on your actual schema...
`;
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
        return (event, context) => {
            context.callbackWaitsForEmptyEventLoop = false;
            const server = createServer(this.app);
            return proxy(server, event, context);
        };
    }
}

module.exports = { HttpMCPServer };
