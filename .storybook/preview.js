import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import 'vuetify/src/stylus/app.styl';
import '../src/styles/shadows.css';

// Vuetify 1.x setup - match the main app configuration
Vue.use(Vuetify, {
  iconfont: 'md',
  theme: {
    primary: '#288bd5',
  },
});

export const decorators = [
  (story) => ({
    components: { story },
    template: '<v-app><v-content><story /></v-content></v-app>',
  }),
];

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  backgrounds: {
    default: 'light',
    values: [
      {
        name: 'light',
        value: '#ffffff',
      },
      {
        name: 'dark',
        value: '#333333',
      },
    ],
  },
};
