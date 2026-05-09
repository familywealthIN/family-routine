const { generateMilestonePlan } = require('../utils/aiApi');

/**
 * AWS Lambda handler function that processes API Gateway requests
 * This replaces the Python handler.py functionality
 */
async function lambdaHandler(event, context) {
  // AWS Lambda context parameter is required but not used in this function
  // eslint-disable-next-line no-unused-vars
  const lambdaContext = context;
  try {
    // Extract query parameters from the event
    const queryParameters = event.queryStringParameters || {};
    const userQuery = queryParameters.query;

    if (!userQuery) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required query parameter: query',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    // Generate the plan
    const plan = await generateMilestonePlan(userQuery);

    // Check if there was an error
    if (plan && typeof plan === 'object' && 'error' in plan) {
      return {
        statusCode: 500,
        body: JSON.stringify(plan),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      };
    }

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify(plan),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: `Unexpected error: ${error.message}`,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  }
}

/**
 * Express.js handler function for local development
 */
async function expressHandler(req, res) {
  try {
    const { query: userQuery } = req.query;

    if (!userQuery) {
      return res.status(400).json({
        error: 'Missing required query parameter: query',
      });
    }

    // Generate the plan
    const plan = await generateMilestonePlan(userQuery);

    // Check if there was an error
    if (plan && typeof plan === 'object' && 'error' in plan) {
      return res.status(500).json(plan);
    }

    // Return successful response
    return res.status(200).json(plan);
  } catch (error) {
    console.error('Express handler error:', error);
    return res.status(500).json({
      error: `Unexpected error: ${error.message}`,
    });
  }
}

module.exports = {
  lambdaHandler,
  expressHandler,
  generateMilestonePlan,
};
