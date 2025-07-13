/* eslint-disable */
require('dotenv').config();
const { HttpMCPServer } = require('./src/server/mcp-http-server');
const connectDatabase = require('./src/server/db');

// Setup environment variables for local development
function setupEnvironment() {
    // Check if MongoDB URL is set
    if (process.env.MONGDO_DB) {
        console.log('✅ Using MongoDB URL from environment variable');
        return true;
    }

    // Provide default development MongoDB URL
    console.log('⚠️  No MongoDB URL found in .env file. Using default development URL.');
    console.log('   To fix this, create a .env file with:');
    console.log('   MONGDO_DB=your-mongodb-connection-string');
    console.log('   JWT_SECRET=your-jwt-secret\n');

    // Default development MongoDB URL
    process.env.MONGDO_DB = 'mongodb://localhost:27017/family-routine-dev';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

    return false;
}

async function testMCPServer() {
    try {
        console.log('=== Setting up Environment ===');
        const hasEnvFile = setupEnvironment();

        if (!hasEnvFile) {
            console.log('💡 For production setup, create a .env file with the required environment variables.');
            console.log();
        }

        console.log('Connecting to database...');
        const dbUrl = process.env.MONGDO_DB.includes('@')
            ? process.env.MONGDO_DB.replace(/\/\/.*@/, '//***@')
            : process.env.MONGDO_DB;
        console.log(`MongoDB URL: ${dbUrl}`);

        await connectDatabase();

        console.log('Starting MCP HTTP Server...');
        const mcpServer = new HttpMCPServer();

        const server = await mcpServer.startServer(4000);

        console.log('\n=== MCP Server Started Successfully ===');
        console.log('Server URL: http://localhost:4000/mcp');
        console.log('GraphQL Endpoint: http://localhost:4000/mcp/graphql');
        console.log('Resources: http://localhost:4000/mcp/resources');
        console.log('Tools: http://localhost:4000/mcp/tools');
        console.log('\nTo test with API key, first generate one in the ProfileTime page');
        console.log('Then use: curl -H "X-API-Key: your-api-key" http://localhost:4000/mcp/resources');

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\nShutting down server...');
            server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });
    } catch (error) {
        console.error('Error starting MCP server:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    testMCPServer();
}

module.exports = { testMCPServer };
