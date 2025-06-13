/* eslint-disable no-multi-assign */
/* eslint-disable func-names */
const googleAuth = (function () {
  function installClient() {
    const apiUrl = 'https://accounts.google.com/gsi/client';
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = apiUrl;
      // eslint-disable-next-line func-names
      script.onreadystatechange = script.onload = function () {
        if (!script.readyState || /loaded|complete/.test(script.readyState)) {
          setTimeout(() => {
            resolve();
          }, 500);
        }
      };
      document.getElementsByTagName('head')[0].appendChild(script);
    });
  }

  function initClient(config) {
    return new Promise((resolve, reject) => {
      try {
        // Wait for the Google Identity Services to be fully loaded
        setTimeout(() => {
          try {
            // Initialize Google Identity Services
            window.google.accounts.id.initialize({
              client_id: config.clientId,
              callback: (response) => {
                // This callback will be triggered when user successfully signs in
                console.log('Google Identity Services initialized');
              }
            });
            
            // Resolve with the google object
            resolve(window.google);
          } catch (error) {
            console.error('Failed to initialize Google Identity Services:', error);
            reject(error);
          }
        }, 1000);
      } catch (error) {
        console.error('Error in initClient:', error);
        reject(error);
      }
    });
  }

  function Auth() {
    if (!(this instanceof Auth)) { return new Auth(); }
    this.GoogleAuth = null; /* window.gapi.auth2.getAuthInstance() */
    this.isAuthorized = false;
    this.isInit = false;
    this.prompt = null;
    this.isLoaded = function () {
      /* eslint-disable */
        console.warn('isLoaded() will be deprecated. You can use "this.$gAuth.isInit"')
        return !!this.GoogleAuth
      };
  
      this.load = (config, prompt) => {
        // Store config for later use
        window.GoogleAuthConfig = config;
        
        installClient()
          .then(() => {
            return initClient(config)
          })
          .then((google) => {
            this.GoogleAuth = google
            this.isInit = true
            this.prompt = prompt
            this.isAuthorized = false // Will be set on successful sign-in
          }).catch((error) => {
            console.error(error)
          })
      };
  
      this.signIn = (successCallback, errorCallback) => {
        return new Promise((resolve, reject) => {
          if (!window.google || !window.google.accounts) {
            const error = new Error('Google Identity Services not initialized');
            if (typeof errorCallback === 'function') errorCallback(error);
            reject(error);
            return;
          }
          
          try {
            const tokenClient = window.google.accounts.oauth2.initTokenClient({
              client_id: window.GoogleAuthConfig.clientId,
              scope: window.GoogleAuthConfig.scope || 'profile email',
              callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                  const googleUser = {
                    getAuthResponse: () => ({
                      access_token: tokenResponse.access_token,
                      id_token: tokenResponse.id_token,
                      expires_at: tokenResponse.expires_at,
                      scope: tokenResponse.scope
                    })
                  };
                  
                  if (typeof successCallback === 'function') successCallback(googleUser);
                  this.isAuthorized = true;
                  resolve(googleUser);
                } else {
                  const error = new Error('Failed to get access token');
                  if (typeof errorCallback === 'function') errorCallback(error);
                  reject(error);
                }
              },
              error_callback: (error) => {
                if (typeof errorCallback === 'function') errorCallback(error);
                reject(error);
              }
            });
            
            tokenClient.requestAccessToken({prompt: 'consent'});
          } catch (error) {
            console.error('Google Sign In error:', error);
            if (typeof errorCallback === 'function') errorCallback(error);
            reject(error);
          }
        });
      };
  
      this.getAuthCode = (successCallback, errorCallback) => {
        return new Promise((resolve, reject) => {
          if (!this.GoogleAuth) {
            if (typeof errorCallback === 'function') errorCallback(false)
            reject(false)
            return
          }
          this.GoogleAuth.grantOfflineAccess({ prompt: this.prompt })
            .then(function (resp) {
              if (typeof successCallback === 'function') successCallback(resp.code)
              resolve(resp.code)
            })
            .catch(function (error) {
              if (typeof errorCallback === 'function') errorCallback(error)
              reject(error)
            })
        })
      };
  
      this.signOut = (successCallback, errorCallback) => {
        return new Promise((resolve, reject) => {
          try {
            // For Google Identity Services, we just need to revoke the token
            // and update our internal state
            window.google.accounts.oauth2.revoke('', () => {
              if (typeof successCallback === 'function') successCallback();
              this.isAuthorized = false;
              resolve(true);
            });
          } catch (error) {
            if (typeof errorCallback === 'function') errorCallback(error);
            reject(error);
          }
        });
      };
    }
  
    return new Auth()
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
  