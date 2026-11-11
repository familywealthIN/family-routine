/* eslint-env jest */
/**
 * /connect, the MCP connector's consent step. The server checks the request
 * before anything can be pressed and again on Allow; Cancel goes back to the
 * app with access_denied; and signing in first returns here, never elsewhere.
 */
const Vue = require('vue');

jest.mock('../../utils/signOut', () => ({ signOut: jest.fn(() => Promise.resolve()) }));

const { signOut } = require('../../utils/signOut');
const ConnectApp = require('../ConnectApp.vue').default;
const { MCP_AUTH_REQUEST, APPROVE_MCP_ACCESS } = require('../ConnectApp.vue');
const { rememberAfterSignIn, takeAfterSignIn } = require('../../utils/afterSignIn');

Vue.config.productionTip = false;
Vue.config.devtools = false;

const QUERY = {
  client_id: 'cid-1',
  redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
  state: 'st',
  code_challenge: 'cc',
  code_challenge_method: 'S256',
};
const FULL_PATH = '/connect?client_id=cid-1&state=st';
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function mount({
  signedIn = true, query = QUERY, check, approve,
} = {}) {
  if (signedIn) localStorage.setItem('token', 'session'); else localStorage.removeItem('token');
  localStorage.setItem('email', 'alex@example.com');
  const apollo = {
    query: jest.fn(check || (() => Promise.resolve({ data: { mcpAuthRequest: { clientName: 'Claude', redirectHost: 'claude.ai' } } }))),
    mutate: jest.fn(approve || (() => Promise.resolve({ data: { approveMcpAccess: { redirectTo: 'https://claude.ai/api/mcp/auth_callback?code=abc&state=st' } } }))),
  };
  const router = { replace: jest.fn(() => Promise.resolve()) };
  const vm = new Vue({
    render: (h) => h(ConnectApp),
    beforeCreate() {
      Object.defineProperty(Vue.prototype, '$apollo', { value: apollo, configurable: true });
      Object.defineProperty(Vue.prototype, '$route', { value: { query, fullPath: FULL_PATH }, configurable: true });
      Object.defineProperty(Vue.prototype, '$router', { value: router, configurable: true });
    },
  }).$mount();
  return {
    vm, page: vm.$children[0], el: vm.$el, apollo, router,
  };
}

beforeEach(() => {
  sessionStorage.clear();
});

/** Where the page navigated out to (it never really leaves jsdom). */
const watchLeave = (page) => {
  const leave = jest.fn();
  // eslint-disable-next-line no-param-reassign
  page.leave = leave;
  return leave;
};

describe('/connect', () => {
  it('checks the request with the server before offering Allow', async () => {
    const { apollo, el, vm } = mount();
    expect(el.querySelector('[data-testid="connect-consent-allow"]')).toBeNull();
    await flush();
    await vm.$nextTick();
    expect(apollo.query.mock.calls[0][0]).toMatchObject({
      query: MCP_AUTH_REQUEST,
      fetchPolicy: 'no-cache',
      variables: {
        clientId: 'cid-1', redirectUri: QUERY.redirect_uri, codeChallenge: 'cc', state: 'st',
      },
    });
    expect(el.textContent).toContain('Allow Claude to use Routine Notes?');
    expect(el.textContent).toContain('alex@example.com');
  });

  it('Allow asks the server again, then goes back to the app with the code', async () => {
    const { page, apollo } = mount();
    const assign = watchLeave(page);
    await flush();
    await page.allow();
    expect(apollo.mutate.mock.calls[0][0]).toMatchObject({ mutation: APPROVE_MCP_ACCESS, variables: { clientId: 'cid-1' } });
    expect(assign).toHaveBeenCalledWith('https://claude.ai/api/mcp/auth_callback?code=abc&state=st');
  });

  it('Cancel tells the app access was denied, keeping its state', async () => {
    const { page } = mount();
    const assign = watchLeave(page);
    await flush();
    page.cancel();
    expect(assign).toHaveBeenCalledWith('https://claude.ai/api/mcp/auth_callback?error=access_denied&state=st');
  });

  it('a request the server refuses shows why and never redirects', async () => {
    const refused = Object.assign(new Error('GraphQL error'), { graphQLErrors: [{ message: '400:redirect_uri is not registered for this client' }] });
    const { page, el, vm } = mount({ check: () => Promise.reject(refused) });
    const assign = watchLeave(page);
    await flush();
    await vm.$nextTick();
    expect(page.status).toBe('invalid');
    expect(el.textContent).toContain('redirect_uri is not registered for this client');
    page.cancel();
    await page.allow();
    expect(assign).not.toHaveBeenCalled();
  });

  it('a request missing its client or return address is invalid without asking', async () => {
    const { page, apollo } = mount({ query: { state: 'st' } });
    await flush();
    expect(page.status).toBe('invalid');
    expect(apollo.query).not.toHaveBeenCalled();
  });

  it('signs you in first, then brings you back here', () => {
    const { router, apollo } = mount({ signedIn: false });
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(apollo.query).not.toHaveBeenCalled();
    expect(takeAfterSignIn('home')).toBe(FULL_PATH);
    expect(takeAfterSignIn('home')).toBe('home');
  });

  it('Not you? signs out and comes back as the next account', async () => {
    const { page } = mount();
    await flush();
    await page.switchAccount();
    expect(signOut).toHaveBeenCalled();
    expect(takeAfterSignIn('home')).toBe(FULL_PATH);
  });
});

describe('afterSignIn', () => {
  it('only ever returns to /connect', () => {
    ['https://evil.example', '//evil.example', '/home', '/connectx'].forEach((path) => {
      rememberAfterSignIn(path);
      expect(takeAfterSignIn('home')).toBe('home');
    });
    rememberAfterSignIn('/connect');
    expect(takeAfterSignIn('home')).toBe('/connect');
  });
});
