/**
 * Profile's GraphQL operations.
 *
 * Kept out of `queries.js` so the Profile redesign owns its own operations, the
 * way `groupQueries.js` and `chatQueries.js` own theirs.
 *
 * ## Why no selection here carries `id`
 *
 * `UserItemType` (apps/server/src/schema/UserSchema.js) exposes **no `id`
 * field** — the user document is keyed by `email` on the server and by the
 * session on the client. So a `UserItem` can never normalize: Apollo stores it
 * inline under the field that asked for it. That is the right outcome and the
 * same property `groupQueries.js` relies on, for two reasons:
 *
 * 1. A **partial** normalized write is how this cache got corrupt before
 *    (ARCHITECTURE.md § 3.2). `updateUserTimezone` and `generateApiKey` both
 *    resolve through `UserModel.findOneAndUpdate`, which returns the mongoose
 *    document — and `oauthConnected` is NOT a field on that document. Only
 *    `getUserTags` computes it (`!!(user.oauth && user.oauth.accessToken)`). A
 *    mutation that claimed to return the complete entity would therefore come
 *    back with `oauthConnected: null` and flip a Connected panel to
 *    Not connected. Un-keyed results cannot do that.
 * 2. Nothing here needs `writeFragment`: there is no entity id to write by. The
 *    read is refreshed instead — one query, no variables, one cache entry, so
 *    there is nothing to drift out of step with.
 *
 * `queries.js` is deliberately untouched (another agent is working in it).
 */
import gql from 'graphql-tag';

/**
 * Everything Profile reads, in one request: who you are, whether an MCP client
 * has completed OAuth, the legacy key, and the saved timezone.
 *
 * `cache-and-network` at the call site (ARCHITECTURE.md § 3.4) — a stale
 * `oauthConnected` would otherwise claim a connection that has since lapsed.
 */
export const USER_PROFILE_QUERY = gql`
  query getUserTags {
    getUserTags {
      name
      email
      picture
      apiKey
      oauthConnected
      timezone
    }
  }
`;

/**
 * Mint (or replace) the legacy API key. The design generates `'rn_' + random`
 * in the browser; the real key is `frt_<uuid>` and only the server can issue it
 * — `docs/redesign/chassis.md` § Conflicts.
 *
 * Irreversible: the previous key stops working the moment this resolves.
 */
export const GENERATE_API_KEY_MUTATION = gql`
  mutation generateApiKey {
    generateApiKey {
      email
      apiKey
    }
  }
`;

/** The one editable server-side setting on this page. */
export const UPDATE_USER_TIMEZONE_MUTATION = gql`
  mutation updateUserTimezone($timezone: String!) {
    updateUserTimezone(timezone: $timezone) {
      email
      timezone
    }
  }
`;

/**
 * Permanently delete the account and everything under it. `success` is a
 * STRING on the server (`DeleteAccountResponse`), so the caller compares it to
 * `'true'` rather than treating it as a boolean.
 */
export const DELETE_ACCOUNT_MUTATION = gql`
  mutation deleteAccount {
    deleteAccount {
      success
      message
    }
  }
`;

export default {
  USER_PROFILE_QUERY,
  GENERATE_API_KEY_MUTATION,
  UPDATE_USER_TIMEZONE_MUTATION,
  DELETE_ACCOUNT_MUTATION,
};
