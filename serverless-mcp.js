// Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const connectDatabase = require('./src/server/db');
const { HttpMCPServer } = require('./src/server/mcp-http-server');

// Create MCP server instance
const mcpServer = new HttpMCPServer();

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Connect to database
    await connectDatabase();

    // Return serverless handler
    return mcpServer.createServerlessHandler()(event, context);
  } catch (error) {
    console.error('Could not start MCP server', { error });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
