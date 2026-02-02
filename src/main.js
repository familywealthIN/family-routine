import { StatusBar } from '@capacitor/status-bar';
import 'babel-polyfill';
import 'isomorphic-unfetch';
import Vue from 'vue';
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { onError } from 'apollo-link-error';
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { graphQLUrl } from './blob/config';
import './plugins/vuetify';
import './plugins/notifications';
import './plugins/curl-executor';
import './styles/shadows.css';
import VueApollo from './plugins/apollo';
import './styles/android-safe-area.css';
import './utils/androidSafeArea'; // Initialize Android safe area manager
import currentTaskPlugin from './plugins/currentTask';
import { SplashScreen } from '@capacitor/splash-screen';
import App from './App.vue';
// Load Google Identity Services script
const script = document.createElement('script');
script.src = 'https://accounts.google.com/gsi/client';
script.async = true;
script.defer = true;
document.head.appendChild(script);
// Import Google OAuth plugin
import './plugins/vue-google-oauth2';
import router from './router';
import {
  GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, GC_AUTH_TOKEN,
} from './constants/settings';
import redirectOnError from './utils/redirectOnError';
import './registerServiceWorker';
import { getSessionItem, loadData } from './token';
import analytics, { AnalyticsPlugin } from './utils/analytics';

Vue.config.productionTip = false;
if (Capacitor.isNativePlatform()) {
  // Show splash screen
  SplashScreen.show({
    showDuration: 2000,
    autoHide: true
  });
}

if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: false });
  StatusBar.setStyle({ style: 'LIGHT' });
  StatusBar.setBackgroundColor({ color: '#ffffff' });
}
// if (window && window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
//   console.log('http')
//   GoogleAuth.init();
// }else{
//   console.log('https')
// }

// if (Capacitor.isNativePlatform()) {
//   try {
//     GoogleAuth.init();
//     GoogleAuth.initialize({
//       clientId: '350952942983-eu6bevc5ve0pjkfqarolulruhbokat05.apps.googleusercontent.com',
//       scopes: ['profile', 'email'],
//       grantOfflineAccess: true,
//       androidClientId: '350952942983-eu6bevc5ve0pjkfqarolulruhbokat05.apps.googleusercontent.com',
//       iosClientId: '350952942983-48lis9mbeudskd9rovrnov5gm35h0vre.apps.googleusercontent.com',
//       webClientId: '350952942983-eu6bevc5ve0pjkfqarolulruhbokat05.apps.googleusercontent.com',
//     });
//     console.log('GoogleAuth initialized in main.js');
//   } catch (error) {
//     console.error('Failed to initialize GoogleAuth in main.js:', error);
//   }
// }


// Install Analytics plugin
Vue.use(AnalyticsPlugin);

// localStorage.__proto__ = Object.create(Storage.prototype);
// localStorage.__proto__.setItem = function () {
//   console.log('localstorage.setItem is disabled');
// };
// localStorage.__proto__.removeItem = function () {
//   console.log('localstorage.removeItem is disabled');
// };
// localStorage.__proto__.getItem = function () {
//   console.log('localstorage.getItem is disabled');
// };

loadData().then(() => {
  const authMiddleware = new ApolloLink((operation, forward) => {
    // add the authorization to the headers
    const token = getSessionItem(GC_AUTH_TOKEN);
    operation.setContext({
      headers: {
        authorization: token ? `Bearer ${token}` : null,
      },
    });

    return forward(operation);
  });

  // HTTP connection to the API
  console.log('Graph url:',graphQLUrl)
  console.log('is native platform', Capacitor.isNativePlatform())
  const httpLink = createHttpLink({
    // You should use an absolute URL here
    uri: graphQLUrl || 'https://aicivz8c3l.execute-api.ap-south-1.amazonaws.com/dev/graphql',
    fetch:Capacitor.isNativePlatform() ?  undefined : fetch
  });

  // Cache implementation
  const cache = new InMemoryCache();

  const errorLink = onError(({
    graphQLErrors, networkError, operation,
  }) => {
    // Track GraphQL errors with analytics
    if (graphQLErrors) {
      graphQLErrors.forEach((error) => {
        analytics.trackError(error, {
          error_type: 'graphql_error',
          operation_name: operation.operationName,
          operation_type: operation.query.definitions[0].operation,
        });

        if (error.message && error.message.startsWith('401:')) {
          console.log('Authentication error detected, redirecting to login...');
          // Clear any stored tokens
          localStorage.removeItem(GC_AUTH_TOKEN);
          localStorage.removeItem(GC_USER_NAME);
          localStorage.removeItem(GC_USER_EMAIL);
          localStorage.removeItem(GC_PICTURE);
          // Redirect to login page
          router.push('/');
        }
      });
    }

    if (networkError) {
      analytics.trackError(networkError, {
        error_type: 'network_error',
        operation_name: operation.operationName,
        status_code: networkError.statusCode,
      });

      redirectOnError(router, networkError.statusCode);
      // Add something like this to set the error message to the one from the server response
      if (Array.isArray(graphQLErrors) && graphQLErrors[0]) {
        // eslint-disable-next-line no-param-reassign
        networkError.message = graphQLErrors[0].message;
      }
    }
  });

  const normalLink = authMiddleware.concat(httpLink);
  // Create the apollo client
  const apolloClient = new ApolloClient({
    link: errorLink.concat(normalLink),
    cache,
    ...(Capacitor.isNativePlatform()?{} :{
    fetchOptions: {
      fetch,
      mode: 'no-cors',
    }
  }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'ignore',
      },
      query: {
        fetchPolicy: 'no-cache',
        errorPolicy: 'all',
      },
    },
  });

  const apolloProvider = new VueApollo({
    defaultClient: apolloClient,
  });

  const name = getSessionItem(GC_USER_NAME);
  const email = getSessionItem(GC_USER_EMAIL);
  const picture = getSessionItem(GC_PICTURE);

  // Install the currentTask plugin
  Vue.use(currentTaskPlugin);

  new Vue({
    router,
    apolloProvider,
    data: {
      name,
      email,
      picture,
    },
    render: (h) => h(App),
  }).$mount('#app');
  if (Capacitor.isNativePlatform()) {
    setTimeout(() => {
      SplashScreen.hide();
    }, 1000);
  }
});
