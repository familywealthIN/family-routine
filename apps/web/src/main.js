import Vue from 'vue';
import Vuetify from 'vuetify';
import '@mdi/font/css/materialdesignicons.css';
import '@routine-notes/ui/styles/theme.css';

import App from './App.vue';
import router from './router';

Vue.use(Vuetify, {
    iconfont: 'mdi',
});
Vue.config.productionTip = false;

new Vue({
    router,
    render: (h) => h(App),
}).$mount('#app');
