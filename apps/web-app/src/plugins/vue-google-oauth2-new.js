/* eslint-disable no-multi-assign */
const googleAuth = (function googleAuth() {
  function installClient() {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => resolve();
      document.getElementsByTagName('head')[0].appendChild(script);
    });
  }

  function initClient() {
    return new Promise((resolve, reject) => {
      try {
        resolve(window.google);
      } catch (error) {
        reject(error);
      }
    });
  }

  function Auth() {
    if (!(this instanceof Auth)) return new Auth();

    this.GoogleAuth = null;
    this.isAuthorized = false;
    this.isInit = false;
    this.credential = null;
    this.clientId = null;
    this.tokenClient = null;

    this.isLoaded = () => this.isInit;

    this.load = (config) => installClient()
      .then(() => initClient(config))
      .then((google) => {
        this.GoogleAuth = google;
        this.clientId = config.clientId;
        this.isInit = true;
        return google;
      });

    this.signIn = (successCallback, errorCallback) => new Promise((resolve, reject) => {
      if (!this.isInit) {
        const error = new Error('Google Auth is not initialized');
        if (typeof errorCallback === 'function') errorCallback(error);
        reject(error);
        return;
      }

      try {
        // Use popup-based authentication with token client
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: 'email profile openid',
          callback: async (response) => {
            if (response.access_token) {
              try {
                // Use access token to get user info and create ID token-like credential
                const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${response.access_token}`);
                const userInfo = await userInfoResponse.json();

                // Create a credential object with user info
                const credential = {
                  access_token: response.access_token,
                  user_info: userInfo,
                };

                this.credential = JSON.stringify(credential);
                this.isAuthorized = true;
                if (typeof successCallback === 'function') successCallback({ credential: this.credential });
                resolve({ credential: this.credential });
              } catch (fetchError) {
                if (typeof errorCallback === 'function') errorCallback(fetchError);
                reject(fetchError);
              }
            } else if (response.error) {
              const error = new Error(response.error);
              if (typeof errorCallback === 'function') errorCallback(error);
              reject(error);
            }
          },
        });

        // Request access token via popup
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } catch (error) {
        if (typeof errorCallback === 'function') errorCallback(error);
        reject(error);
      }
    });

    this.signOut = (successCallback, errorCallback) => new Promise((resolve, reject) => {
      try {
        // Clear credential and state
        this.credential = null;
        this.isAuthorized = false;
        this.tokenClient = null;

        if (typeof successCallback === 'function') successCallback();
        resolve();
      } catch (error) {
        if (typeof errorCallback === 'function') errorCallback(error);
        reject(error);
      }
    });
  }

  return new Auth();
}());

export default {
  install(Vue, options) {
    /* eslint-disable no-param-reassign */
    Vue.prototype.$gAuth = googleAuth;
    if (options) {
      Vue.prototype.$gAuth.load(options);
    }
    /* eslint-enable no-param-reassign */
  },
};
