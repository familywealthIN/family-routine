import 'babel-polyfill';
import 'isomorphic-unfetch';
import Vue from 'vue';
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { onError } from 'apollo-link-error';
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import 'firebase/messaging';

import { graphQLUrl } from './blob/config';
import './plugins/vuetify';
import './plugins/notifications';
import './plugins/curl-executor';
import './styles/shadows.css';
import VueApollo from './plugins/apollo';
import currentTaskPlugin from './plugins/currentTask';
import App from './App.vue';
import './plugins/vue-google-oauth2';
import router from './router';
import {
  GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, GC_AUTH_TOKEN,
} from './constants/settings';
import redirectOnError from './utils/redirectOnError';
import './registerServiceWorker';
import { getSessionItem, loadData } from './token';

Vue.config.productionTip = false;

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
  const httpLink = createHttpLink({
    // You should use an absolute URL here
    uri: graphQLUrl,
  });

  // Cache implementation
  const cache = new InMemoryCache();

  const errorLink = onError(({ graphQLErrors, networkError }) => {
    // Check for GraphQL errors with 401: prefix
    if (graphQLErrors) {
      graphQLErrors.forEach((error) => {
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
    fetchOptions: {
      fetch,
      mode: 'no-cors',
    },
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
});
