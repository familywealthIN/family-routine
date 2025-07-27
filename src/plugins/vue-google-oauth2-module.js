/* eslint-disable no-multi-assign */
/* eslint-disable func-names */
const googleAuth = (function () {
  function installClient() {
    const apiUrl = 'https://accounts.google.com/gsi/client';
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => {
        resolve();
      };
      document.getElementsByTagName('head')[0].appendChild(script);
    });
  }

  function initClient(config) {
    return new Promise((resolve, reject) => {
      try {
        window.google.accounts.id.initialize({
          client_id: config.clientId,
          callback: (response) => {
            if (response.credential) {
              resolve({ credential: response.credential });
            } else {
              reject(new Error('No credential received'));
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        resolve(window.google);
      } catch (error) {
        reject(error);
      }
    });
  }

  function Auth() {
    if (!(this instanceof Auth)) { return new Auth(); }
    this.GoogleAuth = null;
    this.isAuthorized = false;
    this.isInit = false;
    this.credential = null;

    this.isLoaded = () => this.isInit;

    this.load = (config) => installClient()
      .then(() => initClient(config))
      .then((google) => {
        this.GoogleAuth = google;
        this.isInit = true;
        return google;
      })
      .then((gapi) => {
        this.GoogleAuth = gapi.auth2.getAuthInstance();
        this.isInit = true;
        this.prompt = prompt;
        this.isAuthorized = this.GoogleAuth.isSignedIn.get();
      })
      .catch((error) => {
        console.error(error);
      });
  }

  this.signIn = (successCallback, errorCallback) => new Promise((resolve, reject) => {
    if (!this.GoogleAuth) {
      if (typeof errorCallback === 'function') errorCallback(false);
      reject(new Error('GoogleAuth not initialized'));
      return;
    }
    this.GoogleAuth.signIn()
      .then((googleUser) => {
        if (typeof successCallback === 'function') successCallback(googleUser);
        this.isAuthorized = this.GoogleAuth.isSignedIn.get();
        resolve(googleUser);
      })
      .catch((error) => {
        if (typeof errorCallback === 'function') errorCallback(error);
        reject(error);
      });
  });

  this.getAuthCode = (successCallback, errorCallback) => new Promise((resolve, reject) => {
    if (!this.GoogleAuth) {
      if (typeof errorCallback === 'function') errorCallback(false);
      reject(new Error('GoogleAuth not initialized'));
      return;
    }
    this.GoogleAuth.grantOfflineAccess({ prompt: this.prompt })
      .then((resp) => {
        if (typeof successCallback === 'function') successCallback(resp.code);
        resolve(resp.code);
      })
      .catch((error) => {
        if (typeof errorCallback === 'function') errorCallback(error);
        reject(error);
      });
  });

  this.signOut = (successCallback, errorCallback) => new Promise((resolve, reject) => {
    if (!this.GoogleAuth) {
      if (typeof errorCallback === 'function') errorCallback(false);
      reject(new Error('GoogleAuth not initialized'));
      return;
    }
    this.GoogleAuth.signOut()
      .then(() => {
        if (typeof successCallback === 'function') successCallback();
        this.isAuthorized = false;
        resolve(true);
      })
      .catch((error) => {
        if (typeof errorCallback === 'function') errorCallback(error);
        reject(error);
      });
  });

  return new Auth();
}());

function installGoogleAuthPlugin(Vue, options) {
  /* eslint-disable */
  //set config
  let GoogleAuthConfig = null
  let GoogleAuthDefaultConfig = { scope: 'profile email' }
  let prompt = 'select_account'
  if (typeof options === 'object') {
    GoogleAuthConfig = Object.assign(GoogleAuthDefaultConfig, options)
    if (options.scope) GoogleAuthConfig.scope = options.scope
    if (options.prompt) prompt = options.prompt
    if (!options.clientId) {
      console.warn('clientId is required')
    }
  } else {
    console.warn('invalid option type. Object type accepted only')
  }

  //Install Vue plugin
  Vue.gAuth = googleAuth
  Object.defineProperties(Vue.prototype, {
    $gAuth: {
      get: function () {
        return Vue.gAuth
      }
    }
  })
  Vue.gAuth.load(GoogleAuthConfig, prompt)
}

export default installGoogleAuthPlugin
