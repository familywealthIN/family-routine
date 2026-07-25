/* eslint-env jest */
/**
 * Regression guard for the web Google sign-in cancel bug.
 *
 * `$gAuth.signIn()` builds a GIS token client. GIS invokes the success
 * `callback` ONLY when a token is granted; when the user closes/cancels the
 * consent popup it invokes a separate `error_callback`. That callback was
 * missing, so a cancelled popup left the signIn() promise pending forever —
 * `LoginRoutine` had already set `isLoading = true`, so its `.catch` never ran
 * and the login screen stayed stuck on its loading spinner ("after login
 * cancel the login page doesn't show up"). The fix wires `error_callback` to
 * reject the promise so the caller can recover.
 */

const loadGauth = () => {
  jest.resetModules();
  // eslint-disable-next-line global-require
  const plugin = require('@/plugins/vue-google-oauth2-new').default;
  const VueStub = { prototype: {} };
  plugin.install(VueStub); // no options → does not kick off installClient()/load()
  const g = VueStub.prototype.$gAuth;
  g.isInit = true;
  g.isAuthorized = false;
  g.credential = null;
  return g;
};

const mockGis = () => {
  const state = { cfg: null };
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: (cfg) => {
          state.cfg = cfg;
          return { requestAccessToken: () => {} };
        },
      },
    },
  };
  return state;
};

describe('vue-google-oauth2-new $gAuth.signIn', () => {
  afterEach(() => {
    delete window.google;
    delete global.fetch;
  });

  it('rejects with type "popup_closed" when the user cancels the consent popup', async () => {
    const g = loadGauth();
    const gis = mockGis();

    const signInPromise = g.signIn();

    // The fix: an error_callback must be registered so cancels settle the promise.
    expect(typeof gis.cfg.error_callback).toBe('function');

    // Simulate the user closing/cancelling the Google popup.
    gis.cfg.error_callback({ type: 'popup_closed' });

    await expect(signInPromise).rejects.toMatchObject({ type: 'popup_closed' });
    expect(g.isAuthorized).toBe(false);
  });

  it('invokes the supplied errorCallback when the popup is cancelled', async () => {
    const g = loadGauth();
    const gis = mockGis();
    const errorCallback = jest.fn();

    const p = g.signIn(undefined, errorCallback).catch(() => {});
    gis.cfg.error_callback({ type: 'popup_closed' });
    await p;

    expect(errorCallback).toHaveBeenCalledTimes(1);
    expect(errorCallback.mock.calls[0][0]).toMatchObject({ type: 'popup_closed' });
  });

  it('still resolves with a credential on a successful token grant', async () => {
    const g = loadGauth();
    const gis = mockGis();
    global.fetch = jest.fn(() => Promise.resolve({
      json: () => Promise.resolve({ email: 'a@b.com', name: 'A' }),
    }));

    const signInPromise = g.signIn();
    gis.cfg.callback({ access_token: 'tok123' });

    const result = await signInPromise;
    expect(result.credential).toContain('tok123');
    expect(g.isAuthorized).toBe(true);
  });

  it('rejects when Google Auth is not initialized', async () => {
    const g = loadGauth();
    g.isInit = false;
    await expect(g.signIn()).rejects.toThrow('not initialized');
  });
});
