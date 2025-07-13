// Example MCP client to test the Routine Notes MCP Server
const axios = require('axios');

class FamilyRoutineMCPClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.headers = {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    };
  }

  async getServerInfo() {
    try {
      const response = await axios.get(`${this.baseUrl}`, { headers: this.headers });
      return response.data;
    } catch (error) {
      console.error('Error getting server info:', error.response?.data || error.message);
      throw error;
    }
  }

  async listResources() {
    try {
      const response = await axios.get(`${this.baseUrl}/resources`, { headers: this.headers });
      return response.data;
    } catch (error) {
      console.error('Error listing resources:', error.response?.data || error.message);
      throw error;
    }
  }

  async listTools() {
    try {
      const response = await axios.get(`${this.baseUrl}/tools`, { headers: this.headers });
      return response.data;
    } catch (error) {
      console.error('Error listing tools:', error.response?.data || error.message);
      throw error;
    }
  }

  async executeGraphQL(query, variables = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/graphql`,
        { query, variables },
        { headers: this.headers });
      return response.data;
    } catch (error) {
      console.error('Error executing GraphQL:', error.response?.data || error.message);
      throw error;
    }
  }

  async callTool(name, args) {
    try {
      const response = await axios.post(`${this.baseUrl}/call`, {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
        id: Date.now(),
      }, { headers: this.headers });

      return response.data;
    } catch (error) {
      console.error('Error calling tool:', error.response?.data || error.message);
      throw error;
    }
  }
}

// Example usage
async function testMCPClient() {
  const API_KEY = process.env.FAMILY_ROUTINE_API_KEY || 'your-api-key-here';
  const BASE_URL = 'http://localhost:4000/mcp';

  console.log('=== Testing Routine Notes MCP Client ===\n');

  if (API_KEY === 'your-api-key-here') {
    console.log('⚠️  Please set your API key in the FAMILY_ROUTINE_API_KEY environment variable');
    console.log('   or update the API_KEY variable in this script.\n');
    console.log('   You can generate an API key in the ProfileTime page of the Routine Notes app.\n');
    return;
  }

  const client = new FamilyRoutineMCPClient(BASE_URL, API_KEY);

  try {
    // Test server info
    console.log('1. Getting server info...');
    const serverInfo = await client.getServerInfo();
    console.log('✅ Server info:', JSON.stringify(serverInfo, null, 2));
    console.log();

    // Test listing resources
    console.log('2. Listing resources...');
    const resources = await client.listResources();
    console.log('✅ Resources:', JSON.stringify(resources, null, 2));
    console.log();

    // Test listing tools
    console.log('3. Listing tools...');
    const tools = await client.listTools();
    console.log('✅ Tools:', JSON.stringify(tools, null, 2));
    console.log();

    // Test GraphQL query
    console.log('4. Testing GraphQL query...');
    const userQuery = `
      query getUserProfile {
        getUserTags {
          name
          email
          picture
          groupId
        }
      }
    `;

    const userResult = await client.executeGraphQL(userQuery);
    console.log('✅ GraphQL Result:', JSON.stringify(userResult, null, 2));
    console.log();

    // Test MCP tool call
    console.log('5. Testing MCP tool call...');
    const toolResult = await client.callTool('graphql_query', {
      query: userQuery,
    });
    console.log('✅ Tool Call Result:', JSON.stringify(toolResult, null, 2));
    console.log();

    console.log('🎉 All tests passed! The MCP server is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (error.response?.status === 401) {
      console.log('\n💡 Authentication failed. Please check your API key.');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused. Make sure the MCP server is running:');
      console.log('   npm run mcp:server');
    }
  }
}

if (require.main === module) {
  testMCPClient();
}

module.exports = { FamilyRoutineMCPClient };
