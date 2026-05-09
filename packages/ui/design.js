import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import 'vuetify/src/stylus/app.styl';
import '@mdi/font/css/materialdesignicons.css';
import { parse, genStyles } from 'vuetify/lib/util/theme';

import './styles/index.css';

export const theme = {
  primary: '#288bd5',
  secondary: '#424242',
  accent: '#82B1FF',
  error: '#FF5252',
  info: '#2196F3',
  success: '#4CAF50',
  warning: '#FF9800',
};

export const iconfont = 'md';

// Vuetify 1.x normally injects theme CSS inside <v-app>'s created() hook, which
// means the first render before v-app mounts shows unthemed colors and unit
// tests / storybook stories without v-app wrappers never get the theme at all.
// We inject the stylesheet at module-eval time so `color="primary"` always
// resolves, with the same id Vuetify uses (so v-app reuses it instead of
// appending a duplicate).
function injectThemeStylesheet() {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('vuetify-theme-stylesheet');
  if (existing) return;
  const style = document.createElement('style');
  style.type = 'text/css';
  style.id = 'vuetify-theme-stylesheet';
  style.innerHTML = genStyles(parse(theme));
  document.head.appendChild(style);
}

let installed = false;

export function installDesign() {
  if (installed) return;
  installed = true;
  Vue.use(Vuetify, {
    iconfont,
    theme,
  });
  injectThemeStylesheet();
}

export default installDesign;
