import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

export default new Router({
    mode: 'history',
    routes: [
        {
            path: '/',
            name: 'landing',
            component: () => import('./views/Landing.vue'),
        },
        {
            path: '/features',
            name: 'features',
            component: () => import('./views/Features.vue'),
        },
        {
            path: '/about',
            name: 'about',
            component: () => import('./views/About.vue'),
        },
    ],
});
