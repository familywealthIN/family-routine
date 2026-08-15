import { SplashScreen } from '@capacitor/splash-screen';
import 'babel-polyfill';
import 'isomorphic-unfetch';
import Vue from 'vue';
import VueCompositionAPI from '@vue/composition-api';
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { onError } from 'apollo-link-error';
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { CachePersistor } from 'apollo-cache-persist';
import localforage from 'localforage';
import 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { graphQLUrl } from './blob/config';
import './plugins/vuetify';
import './theme-override.css';
import './plugins/notifications';
import './plugins/curl-executor';
import './styles/ios-input-zoom-fix.css';
import VueApollo from './plugins/apollo';
import './styles/android-safe-area.css';
import './utils/androidSafeArea'; // Initialize Android safe area manager (native only)
import currentTaskPlugin from './plugins/currentTask';
import routinePlugin from './plugins/routine';
import goalPlugin from './plugins/goal';
import agentPlugin from './plugins/agent';
// routineStore import removed - using Apollo cache persistence instead
import App from './App.vue';
// Import Google OAuth plugin
import './plugins/vue-google-oauth2';
import router from './router';
import {
  GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, GC_AUTH_TOKEN,
} from './constants/settings';
import redirectOnError from './utils/redirectOnError';
import { sanitizePersistedCache } from './utils/cacheHygiene';
import { configureNewDay } from './utils/newDay';
import { createGuardLink } from './apollo/guardLink';
import './registerServiceWorker';
import { getSessionItem, loadData } from './token';
import analytics, { AnalyticsPlugin } from './utils/analytics';
// Load Google Identity Services script
const script = document.createElement('script');
script.src = 'https://accounts.google.com/gsi/client';
script.async = true;
script.defer = true;
document.head.appendChild(script);

// Register Vue Composition API (must be before other plugins that use it)
Vue.use(VueCompositionAPI);

Vue.config.productionTip = false;

// Platform marker for CSS: safe-area/system-inset rules in
// android-safe-area.css only apply inside the native WebView, never on
// mobile web where the browser chrome owns the status bar.
if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('capacitor-native');
  document.body.classList.add('capacitor-native');
}

// Install Analytics plugin
Vue.use(AnalyticsPlugin);

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
  const httpLink = createHttpLink({
    // You should use an absolute URL here
    uri: graphQLUrl,
  });

  // Cache implementation with persistence
  const cache = new InMemoryCache();

  // Configure localforage for Apollo cache persistence
  localforage.config({
    name: 'routine-notes',
    storeName: 'apollo-cache',
  });

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

  // The pending-entity guard. Outermost in the chain, so it is the last link to
  // see a response before it is normalized into the cache — that is what stops
  // an in-flight `cache-and-network` read from overwriting a tap the user just
  // made (and what lets every control stay enabled during a refetch).
  // See utils/cacheGuard.js.
  const guardLink = createGuardLink({
    onHold: process.env.NODE_ENV === 'development'
      ? ({ operationName, held }) => console.log(`[guard] held ${held} field(s) on ${operationName}`)
      : undefined,
  });

  // Kept so the persistor is not garbage-collected: its write-back trigger is
  // the only thing keeping IndexedDB in sync with the cache.
  let cachePersistor = null;

  // Persist Apollo cache to localforage before creating client
  const setupCachePersistence = async () => {
    try {
      // Clean the persisted blob BEFORE it is restored. persistCache has no
      // schema version and no purge, so without this one bad write lives in
      // IndexedDB forever: leaked `Goal:temp-*` placeholders and phantom
      // entities from mistyped __typenames were found still shadowing real
      // goals days later. Everything dropped here is re-fetchable — the
      // display queries are all cache-and-network.
      const hygiene = await sanitizePersistedCache(localforage);
      if (hygiene.purged) {
        console.log('[Main] Persisted Apollo cache purged (schema version bump)');
      } else if (hygiene.removed.length) {
        console.log(`[Main] Dropped ${hygiene.removed.length} unrepairable cache entries:`, hygiene.removed);
      }

      // Restore from the store the sanitize pass already read and parsed.
      // `CachePersistor.restore()` is exactly `getItem -> JSON.parse ->
      // cache.restore`, so calling it here would read and parse the entire
      // store a second time — on the critical path, before first paint.
      if (hygiene.store) cache.restore(hygiene.store);

      // Construct the persistor AFTER restoring. Its write-back trigger is
      // installed in the constructor (`trigger: 'write'` by default), so
      // building it first would schedule a pointless re-serialization of the
      // very blob we just read.
      cachePersistor = new CachePersistor({
        cache,
        storage: localforage,
        maxSize: false, // Disable max size limit
        debug: process.env.NODE_ENV === 'development',
      });
      console.log('[Main] Apollo cache restored from localforage');
    } catch (error) {
      console.warn('[Main] Failed to restore Apollo cache:', error);
    }
  };

  // Create the apollo client
  const apolloClient = new ApolloClient({
    link: guardLink.concat(errorLink).concat(normalLink),
    cache,
    fetchOptions: {
      fetch,
      mode: 'no-cors',
    },
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'ignore',
      },
      query: {
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
      },
    },
  });

  const apolloProvider = new VueApollo({
    defaultClient: apolloClient,
  });

  // Hand the day-rollover reset everything it needs to purge. The persistor is
  // passed as a thunk because it is constructed asynchronously by
  // setupCachePersistence() — reading it eagerly here would capture `null`.
  configureNewDay({
    apolloClient,
    storage: localforage,
    persistor: () => cachePersistor,
  });

  // Expose for Playwright e2e tests. Strictly dev/test only.
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    window.__APOLLO_CLIENT__ = apolloClient;
    // Lets the cache-integrity suite force a synchronous flush to IndexedDB
    // instead of racing the trigger's debounce.
    window.__APOLLO_PERSISTOR__ = () => cachePersistor;
    // eslint-disable-next-line global-require
    window.__CACHE_GUARD__ = require('./utils/cacheGuard');
  }

  const name = getSessionItem(GC_USER_NAME);
  const email = getSessionItem(GC_USER_EMAIL);
  const picture = getSessionItem(GC_PICTURE);

  // Install the currentTask plugin
  Vue.use(currentTaskPlugin);

  // Install routine and goal plugins for shared state
  Vue.use(routinePlugin);
  Vue.use(goalPlugin);
  Vue.use(agentPlugin);

  // Initialize Apollo cache persistence before mounting app
  setupCachePersistence().then(async () => {
    const app = new Vue({
      router,
      apolloProvider,
      data: {
        name,
        email,
        picture,
      },
      render: (h) => h(App),
    }).$mount('#app');

    console.log('[Main] App mounted with Apollo cache persistence');

    // Make app globally available
    window.app = app;

    // Hide the native Capacitor splashscreen now that Vue is mounted and
    // the persisted Apollo cache is hydrated. launchAutoHide is set to
    // false in capacitor.config.json so the splash waits for this call
    // instead of vanishing on a fixed timer.
    if (Capacitor.isNativePlatform()) {
      try {
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch (e) {
        console.warn('[Main] SplashScreen.hide failed:', e);
      }
    }

    // Initialize push service with action categories
    if (Capacitor.isNativePlatform()) {
      const PushService1 = (await import('./services/pushService.js')).default;
      await PushService1.init();
    }
  });
});
