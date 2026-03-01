import Vue from 'vue';
import Router from 'vue-router';
import Login from './views/Login.vue';
import Projects from './views/Projects.vue';
import Areas from './views/Areas.vue';
import YearGoals from './views/YearGoals.vue';

Vue.use(Router);

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/home',
      name: 'home',
      component: () => import(/* webpackChunkName: "home" */'./views/Home.vue'),
    },
    {
      path: '/history',
      name: 'history',
      component: () => import(/* webpackChunkName: "history" */'./views/History.vue'),
    },
    {
      path: '/settings/notifications',
      name: 'notifications',
      component: () => import(/* webpackChunkName: "notifications" */'./views/Notifications.vue'),
    },
    {
      path: '/progress',
      name: 'progress',
      component: () => import(/* webpackChunkName: "progress" */'./views/Progress.vue'),
    },
    {
      path: '/progress/:period',
      name: 'progressPeriod',
      component: () => import(/* webpackChunkName: "progress" */'./views/Progress.vue'),
    },
    {
      path: '/settings',
      name: 'routines',
      component: () => import(/* webpackChunkName: "settings" */'./views/Settings.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import(/* webpackChunkName: "about" */'./views/About.vue'),
    },
    {
      path: '/wizard',
      name: 'welcome',
      component: () => import(/* webpackChunkName: "wizard" */'./views/Wizard.vue'),
    },
    {
      path: '/groups',
      name: 'groups',
      component: () => import(/* webpackChunkName: "groups" */'./views/Family.vue'),
    },
    {
      path: '/goals',
      name: 'goals',
      component: () => import(/* webpackChunkName: "goals" */'./views/Goals.vue'),
    },
    {
      path: '/goals/milestones',
      name: 'milestones',
      component: () => import(/* webpackChunkName: "milestones" */'./views/Milestones.vue'),
    },
    {
      path: '/agenda/tree',
      name: 'agendaTree',
      component: () => import(/* webpackChunkName: "agendaTree" */ './views/AgendaTree.vue'),
    },
    {
      path: '/agenda/tree/:selectedTaskRef',
      name: 'agendaTreeWithTask',
      component: () => import(/* webpackChunkName: "agendaTree" */ './views/AgendaTree.vue'),
    },
    // {
    //   path: '/agenda',
    //   name: 'agenda',
    //   component: () => import(/* webpackChunkName: "agenda" */ './views/Agenda.vue'),
    // },
    {
      path: '/guide',
      name: 'guide',
      component: () => import(/* webpackChunkName: "guide" */ './views/Guide.vue'),
    },
    {
      path: '/settings/profile',
      name: 'profile',
      component: () => import(/* webpackChunkName: "profile" */ './views/Profile.vue'),
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import(/* webpackChunkName: "stats" */'./views/Stats.vue'),
    },
    {
      path: '/projects/:tag',
      name: 'projects',
      component: Projects,
      props: true,
    },
    {
      path: '/areas/:tag',
      name: 'areas',
      component: Areas,
      props: true,
    },
    {
      path: '/year-goals/:id',
      name: 'yearGoal',
      component: YearGoals,
      props: true,
    },
    {
      path: '/year-goals',
      name: 'yearGoals',
      component: YearGoals,
      props: true,
    },
    {
      path: '/priority',
      name: 'priority',
      component: () => import(/* webpackChunkName: "priority" */ './views/Priority.vue'),
    },
    {
      path: '/',
      name: 'login',
      component: Login,
    },
  ],
});
