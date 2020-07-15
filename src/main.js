import Vue from 'vue';
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import firebase from 'firebase/app';
import 'firebase/messaging';

import {
  config, publicKey, graphQLUrl, isDevelopment,
} from './blob/config';
import './plugins/vuetify';
import './plugins/notifications';
import VueApollo from './plugins/apollo';
import App from './App.vue';
import './plugins/vue-google-oauth2';
import router from './router';
import {
  GC_NOTIFICATION_TOKEN, GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, GC_AUTH_TOKEN,
} from './constants/settings';

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

// Create the apollo client
const apolloClient = new ApolloClient({
  link: authMiddleware.concat(httpLink),
  cache,
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

if (!isDevelopment) {
  firebase.initializeApp(config);

  const messaging = firebase.messaging();

  messaging.usePublicVapidKey(publicKey);

  // Request Permission of Notifications
  messaging.requestPermission().then(() => {
    console.log('Notification permission granted.');

    // Get Token
    messaging.getToken().then((token) => {
      localStorage.setItem(GC_NOTIFICATION_TOKEN, token);
    });
  }).catch((err) => {
    console.log('Unable to get permission to notify.', err);
  });
}
