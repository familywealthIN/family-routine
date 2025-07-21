/* eslint-disable */
const { Server } = require('@modelcontextprotocol/sdk/dist/cjs/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/dist/cjs/server/stdio.js');
const { graphql } = require('graphql');
const { schema } = require('./resolvers');
const { getSchemaSDL } = require('./schema/mcpSchema');

class GraphQLMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: 'family-routine-graphql',
                version: '1.0.0',
            },
            {
                capabilities: {
                    resources: {},
                    tools: {},
                },
            }
        );

        this.setupHandlers();
    }

    setupHandlers() {
        // List available resources (GraphQL schema info)
        this.server.setRequestHandler('resources/list', async () => {
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
        });

        // Read resource content
        this.server.setRequestHandler('resources/read', async (request) => {
            const { uri } = request.params;

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

                const result = await graphql(schema, introspectionQuery);

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
        });

        // Handle tool calls (GraphQL queries/mutations)
        this.server.setRequestHandler('tools/call', async (request) => {
            const { name, arguments: args } = request.params;

            if (name === 'graphql_query') {
                const { query, variables, context } = args;

                if (!query) {
                    throw new Error('GraphQL query is required');
                }

                try {
                    const result = await graphql(
                        schema,
                        query,
                        null,
                        context || {},
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
        });

        // List available tools
        this.server.setRequestHandler('tools/list', async () => {
            return {
                tools: [
                    {
                        name: 'graphql_query',
                        description: 'Execute a GraphQL query or mutation',
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
                                context: {
                                    type: 'object',
                                    description: 'Context object for the GraphQL execution',
                                },
                            },
                            required: ['query'],
                        },
                    },
                ],
            };
        });
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log('Routine Notes MCP Server running on stdio');
    }
}

module.exports = { GraphQLMCPServer };
