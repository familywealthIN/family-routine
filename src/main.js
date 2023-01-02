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
import VueApollo from './plugins/apollo';
import App from './App.vue';
import './plugins/vue-google-oauth2';
import router from './router';
import {
  GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, GC_AUTH_TOKEN,
} from './constants/settings';
import redirectOnError from './utils/redirectOnError';
import './registerServiceWorker';

Vue.config.productionTip = false;

const authMiddleware = new ApolloLink((operation, forward) => {
  // add the authorization to the headers
  const token = localStorage.getItem(GC_AUTH_TOKEN);
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
  if (networkError) {
    redirectOnError(router, networkError.statusCode);
    // Add something like this to set the error message to the one from the server response
    if (graphQLErrors[0]) {
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

const name = localStorage.getItem(GC_USER_NAME);
const email = localStorage.getItem(GC_USER_EMAIL);
const picture = localStorage.getItem(GC_PICTURE);

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
