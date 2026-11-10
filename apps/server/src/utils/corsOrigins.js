/**
 * Which browser origins may call the GraphQL API.
 *
 * The web app runs on routinenotes.app and familywealth.in (the apex or any
 * subdomain, https only), and the mobile apps load it from Capacitor's local
 * origin (capacitor://localhost on iOS, http(s)://localhost on Android).
 * localhost, 127.0.0.1 and private LAN addresses (a phone testing the dev
 * server) on any port cover local development.
 *
 * CORS only stops other websites from calling the API from a browser: a
 * request with no Origin (curl, cron, server to server) is let through, and
 * the session token remains the real gate.
 *
 * The MCP server is the opposite on purpose: AI apps call it from anywhere,
 * so it keeps CORS open (mcp-http-server.js).
 */
const SITE_DOMAINS = ['routinenotes.app', 'familywealth.in'];

const LOCAL_ORIGIN = /^(capacitor|ionic):\/\/localhost$|^https?:\/\/(localhost|127\.0\.0\.1|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2})(:\d+)?$/;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (LOCAL_ORIGIN.test(origin)) return true;
  let url;
  try {
    url = new URL(origin);
  } catch (e) {
    return false;
  }
  if (url.protocol !== 'https:' || url.port) return false;
  return SITE_DOMAINS.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
}

/** Options for the `cors` middleware: echo an allowed origin, refuse the rest. */
const graphqlCorsOptions = {
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  maxAge: 600,
};

/**
 * Refuse a browser request from any other site outright, so a request that
 * skips the preflight (a plain form post) never reaches a resolver either.
 */
function rejectForeignOrigin(req, res, next) {
  if (isAllowedOrigin(req.headers.origin)) return next();
  return res.status(403).json({ errors: [{ message: 'Origin not allowed' }] });
}

module.exports = {
  SITE_DOMAINS, isAllowedOrigin, graphqlCorsOptions, rejectForeignOrigin,
};
