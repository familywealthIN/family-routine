import Vue from 'vue';
import Router from 'vue-router';
import Login from './views/Login.vue';
import YearGoals from './views/YearGoals.vue';

Vue.use(Router);

export default new Router({
  mode: 'history',
  routes: [
    {
      // The Routine Focus home screen (design_handoff_routine_focus). It renders
      // its own shell, so `focusHome` tells App.vue to skip the mobile/desktop
      // layout chrome entirely.
      path: '/home',
      name: 'home',
      component: () => import(/* webpackChunkName: "focusHome" */'./views/RoutineFocusHome.vue'),
      meta: { focusHome: true },
    },
    {
      // The previous dashboard, kept reachable: it is still the only screen with
      // the skip-day switch, the agenda view for other dates and the
      // upcoming/past task lists.
      path: '/home/classic',
      name: 'homeClassic',
      component: () => import(/* webpackChunkName: "home" */'./views/Home.vue'),
    },
    {
      // Push-notification deep link.
      path: '/home/:routineId/:action(complete|start|build)',
      name: 'homeRoutineAction',
      component: () => import(/* webpackChunkName: "focusHome" */'./views/RoutineFocusHome.vue'),
      props: true,
      meta: { focusHome: true },
    },
    {
      path: '/agents',
      name: 'agents',
      component: () => import(/* webpackChunkName: "agents" */'./views/Agents.vue'),
      meta: { appShell: true },
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
      meta: { appShell: true },
    },
    {
      path: '/progress',
      name: 'progress',
      component: () => import(/* webpackChunkName: "progress" */'./views/Progress.vue'),
      meta: { appShell: true },
    },
    {
      path: '/progress/:period',
      name: 'progressPeriod',
      component: () => import(/* webpackChunkName: "progress" */'./views/Progress.vue'),
      meta: { appShell: true },
    },
    {
      path: '/settings',
      name: 'routines',
      component: () => import(/* webpackChunkName: "settings" */'./views/Settings.vue'),
      meta: { appShell: true },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import(/* webpackChunkName: "about" */'./views/About.vue'),
      meta: { appShell: true },
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
      meta: { appShell: true },
    },
    {
      path: '/goals',
      name: 'goals',
      component: () => import(/* webpackChunkName: "goals" */'./views/Goals.vue'),
      meta: { appShell: true },
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
      meta: { appShell: true },
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import(/* webpackChunkName: "stats" */'./views/Stats.vue'),
    },
    {
      path: '/year-goals/:id',
      name: 'yearGoal',
      component: YearGoals,
      props: true,
      meta: { appShell: true },
    },
    {
      path: '/year-goals',
      name: 'yearGoals',
      component: YearGoals,
      props: true,
      meta: { appShell: true },
    },
    {
      path: '/priority',
      name: 'priority',
      component: () => import(/* webpackChunkName: "priority" */ './views/Priority.vue'),
      meta: { appShell: true },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import(/* webpackChunkName: "search" */ './views/Search.vue'),
    },
    {
      path: '/',
      name: 'login',
      component: Login,
    },
    {
      // Keep this last. Retired routes (/areas, /projects) and any mistyped
      // URL otherwise match nothing and render a blank page. `*` only matches
      // what every route above missed, so it cannot shadow the login at `/`.
      path: '*',
      redirect: '/home',
    },
  ],
});
