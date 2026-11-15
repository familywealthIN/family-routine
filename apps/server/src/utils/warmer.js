/**
 * Keep GraphQL containers warm.
 *
 * Opening the app sends its first reads all at once, and every read that lands
 * on a container that is not running yet waits for it to start and connect to
 * Mongo: 2.6s at the median and 5.6s at p90, measured over three days of
 * CloudWatch logs (a warm call is 0.14s). A schedule (serverless.yml) sends a
 * `{ warmer: true, concurrency: N }` event every few minutes; the first
 * container to get it calls N - 1 more copies of itself and waits for them, so
 * N containers are busy at the same moment and Lambda has to keep N of them
 * alive. Each one opens its Mongo connection, which is the slow part of a start.
 *
 * A warm-up never reaches GraphQL and never touches a user's data.
 */

/** How long each copy holds its container, so the copies cannot share one. */
const HOLD_MS = 200;
/** Never fan out wider than this, whatever the event asks. */
const MAX_CONCURRENCY = 10;

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

function isWarmup(event) {
  return !!(event && event.warmer === true);
}

/** Call this function again, synchronously, as one more warm-up copy. */
async function invokeSelf(functionName) {
  // Provided by the Lambda runtime (esbuild leaves @aws-sdk/* out of the bundle).
  // eslint-disable-next-line global-require, import/no-unresolved
  const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
  const client = new LambdaClient({});
  return client.send(new InvokeCommand({
    FunctionName: functionName,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify({ warmer: true, copy: true })),
  }));
}

/**
 * Answer a warm-up event.
 *
 * @param {Object}   event      `{ warmer: true, concurrency?, copy? }`
 * @param {Object}   context    the Lambda context (functionName)
 * @param {Object}   deps
 * @param {Function} deps.connect   opens the Mongo connection
 * @param {Function} [deps.invoke]  calls one more copy (tests pass a fake)
 * @returns {Promise<{ warmed: number, failed: number }>}
 */
async function warm(event, context, { connect, invoke = invokeSelf }) {
  try {
    await connect();
  } catch (error) {
    // A warm-up that cannot reach Mongo is still a started container.
    console.log('[warmer] database connect failed:', error && error.message);
  }

  // A copy holds its container and stops: only the first call fans out.
  if (event.copy) {
    await sleep(HOLD_MS);
    return { warmed: 1, failed: 0 };
  }

  const wanted = Math.min(Math.max(Math.floor(Number(event.concurrency) || 1), 1), MAX_CONCURRENCY);
  const copies = Array.from({ length: wanted - 1 }, () => invoke(context.functionName)
    .then(() => true)
    .catch((error) => {
      console.log('[warmer] copy failed:', error && error.message);
      return false;
    }));
  const results = await Promise.all([sleep(HOLD_MS), ...copies]);
  const failed = results.slice(1).filter((ok) => !ok).length;
  console.log(`[warmer] warmed ${wanted - failed} of ${wanted}`);
  return { warmed: wanted - failed, failed };
}

module.exports = {
  warm, isWarmup, HOLD_MS, MAX_CONCURRENCY,
};
