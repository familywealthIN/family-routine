// Load environment variables for local development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config(); // eslint-disable-line global-require
}

const connectDatabase = require('./src/server/db');
const { HttpMCPServer } = require('./src/server/mcp-http-server');

// Create MCP server instance
const mcpServer = new HttpMCPServer();

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false; // eslint-disable-line no-param-reassign

  try {
    console.log('Lambda handler started', {
      environment: {
        MONGDO_DB: process.env.MONGDO_DB ? 'SET' : 'NOT_SET',
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? 'SET' : 'NOT_SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
      },
    });

    // Connect to database
    console.log('Connecting to database...');
    await connectDatabase();
    console.log('Database connected successfully');

    // Return serverless handler
    console.log('Creating serverless handler...');
    const handler = mcpServer.createServerlessHandler();
    console.log('Executing serverless handler...');

    const result = await handler(event, context);
    console.log('Handler result:', result);

    return result;
  } catch (error) {
    console.error('Could not start MCP server', {
      error: error.message,
      stack: error.stack,
      event: JSON.stringify(event),
    });

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack,
        debug: {
          nodeVersion: process.version,
          platform: process.platform,
          environment: {
            MONGDO_DB: process.env.MONGDO_DB ? 'SET' : 'NOT_SET',
            ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ? 'SET' : 'NOT_SET',
          },
        },
      }),
    };
  }
};
