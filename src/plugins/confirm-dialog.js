import Vue from 'vue';
import VuetifyConfirm from 'vuetify-confirm';
import Vuetify from 'vuetify';

// Ensure Vuetify is installed
if (!Vue.options.components.VApp) {
  Vue.use(Vuetify);
}

// Install the confirm dialog
Vue.use(VuetifyConfirm, {
  vuetify: new Vuetify(),
  buttonTrueText: 'OK',
  buttonFalseText: 'Cancel',
  color: 'warning',
  icon: 'warning',
  title: 'Warning',
  width: 350,
  property: '$confirm',
});
