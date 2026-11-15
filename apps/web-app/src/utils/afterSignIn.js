/**
 * Where to go once sign-in finishes, when a page sent you to sign in first.
 *
 * Only the MCP connector's consent page (/connect) asks for this today: an AI
 * app opens it, you may not be signed in yet, and landing on Home afterwards
 * would strand the app mid-handshake. Kept to /connect so a crafted link can't
 * use sign-in to bounce anywhere else.
 */
const KEY = 'RN_AFTER_SIGN_IN';

const allowed = (path) => typeof path === 'string' && /^\/connect(\?|$)/.test(path);

export function rememberAfterSignIn(path) {
  if (!allowed(path)) return;
  try {
    sessionStorage.setItem(KEY, path);
  } catch (e) {
    // Private mode: the user lands on Home and connects again.
  }
}

/** The remembered path (once: it is forgotten here), or `fallback`. */
export function takeAfterSignIn(fallback) {
  let path = null;
  try {
    path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch (e) {
    path = null;
  }
  return allowed(path) ? path : fallback;
}
