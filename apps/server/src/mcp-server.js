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

            // Helper: run a GraphQL operation and return formatted MCP content
            const runGraphQL = async (query, variables, context) => {
                try {
                    const result = await graphql(
                        schema,
                        query,
                        null,
                        context || {},
                        variables || {}
                    );
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

            if (name === 'graphql_query') {
                const { query, variables, context } = args;
                if (!query) throw new Error('GraphQL query is required');
                return runGraphQL(query, variables, context);
            }

            if (name === 'get_daily_goals') {
                const { date, context } = args;
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
                    { date },
                    context
                );
            }

            if (name === 'get_routine') {
                const { date, context } = args;
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
                    { date },
                    context
                );
            }

            if (name === 'search_goals') {
                const { query, limit, taskRef, tags, context } = args;
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
                    { query, limit, taskRef, tags },
                    context
                );
            }

            if (name === 'add_goal_item') {
                const { context, ...variables } = args;
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
                    variables,
                    context
                );
            }

            if (name === 'complete_goal_item') {
                const { id, taskRef, date, period, isComplete, isMilestone, context } = args;
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
                    { id, taskRef, date, period, isComplete, isMilestone },
                    context
                );
            }

            if (name === 'bulk_add_goal_items') {
                const { goals, context } = args;
                return runGraphQL(
                    `mutation BulkAddGoalItems($goals: [GoalItemInput]!) {
                        addBulkGoalItems(goals: $goals) {
                            id body period date isComplete isMilestone
                            deadline contribution reward taskRef goalRef tags
                            status createdAt originalDate
                        }
                    }`,
                    { goals },
                    context
                );
            }

            if (name === 'generate_milestone_plan') {
                const { query, systemPrompt, context } = args;
                return runGraphQL(
                    `mutation GenerateMilestonePlan($query: String!, $systemPrompt: String) {
                        generateMilestonePlan(query: $query, systemPrompt: $systemPrompt) {
                            period title error rawResponse
                            entries { period periodName date title description }
                        }
                    }`,
                    { query, systemPrompt },
                    context
                );
            }

            if (name === 'extract_day_task') {
                const { query, systemPrompt, context } = args;
                return runGraphQL(
                    `mutation ExtractDayTask($query: String!, $systemPrompt: String) {
                        extractDayTask(query: $query, systemPrompt: $systemPrompt) {
                            title description tags dueDate priority error
                        }
                    }`,
                    { query, systemPrompt },
                    context
                );
            }

            if (name === 'get_progress') {
                const { period, startDate, endDate, context } = args;
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
                    { period, startDate, endDate },
                    context
                );
            }

            if (name === 'get_priority_goals') {
                const { date, context } = args;
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
                    { date },
                    context
                );
            }

            if (name === 'reschedule_goal_item') {
                const { id, oldDate, newDate, period, context } = args;
                return runGraphQL(
                    `mutation RescheduleGoalItem($id: ID!, $oldDate: String!, $newDate: String!, $period: String!) {
                        rescheduleGoalItem(id: $id, oldDate: $oldDate, newDate: $newDate, period: $period) {
                            id body status originalDate date period
                        }
                    }`,
                    { id, oldDate, newDate, period },
                    context
                );
            }

            throw new Error(`Unknown tool: ${name}`);
        });

        // List available tools
        this.server.setRequestHandler('tools/list', async () => {
            return {
                tools: [
                    {
                        name: 'graphql_query',
                        description: 'Execute any GraphQL query or mutation against the Routine Notes API. Use the graphql://schema resource to discover available operations. All dates use DD-MM-YYYY format. Authentication context must be provided via the context.user.email field or a JWT token.',
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
                                    description: 'Context object for the GraphQL execution (e.g. { user: { email: "..." } } or { token: "Bearer ..." })',
                                },
                            },
                            required: ['query'],
                        },
                    },
                    {
                        name: 'get_daily_goals',
                        description: 'Get all active goals for a specific date across all periods (day, week, month, year). Uses the optimized query to minimise DB round-trips.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                date: {
                                    type: 'string',
                                    description: 'Date in DD-MM-YYYY format',
                                },
                                context: {
                                    type: 'object',
                                    description: 'Auth context with user email or JWT token',
                                },
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
                                date: {
                                    type: 'string',
                                    description: 'Date in DD-MM-YYYY format',
                                },
                                context: {
                                    type: 'object',
                                    description: 'Auth context with user email or JWT token',
                                },
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
                                query: {
                                    type: 'string',
                                    description: 'Search text (minimum 2 characters)',
                                },
                                limit: {
                                    type: 'string',
                                    description: 'Maximum number of goal items to return (default: 50)',
                                },
                                taskRef: {
                                    type: 'string',
                                    description: 'Optional: filter results by routine task ID',
                                },
                                tags: {
                                    type: 'string',
                                    description: 'Optional: filter results by tag',
                                },
                                context: {
                                    type: 'object',
                                    description: 'Auth context with user email or JWT token',
                                },
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
                                context: { type: 'object', description: 'Auth context' },
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
                                context: { type: 'object', description: 'Auth context' },
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
                                context: { type: 'object', description: 'Auth context' },
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
                                context: { type: 'object', description: 'Auth context' },
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
                                context: { type: 'object', description: 'Auth context' },
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
                                context: { type: 'object', description: 'Auth context' },
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
                                context: { type: 'object', description: 'Auth context' },
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
                                context: { type: 'object', description: 'Auth context' },
                            },
                            required: ['id', 'oldDate', 'newDate', 'period'],
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
