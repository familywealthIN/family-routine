<template>
  <div id="mobileLayout">
    <v-navigation-drawer
      fixed
      clipped
      right
      v-model="drawer"
      v-if="$route.name!== 'login' && $route.name !== 'stats'"
      class="nav-header"
    >
      <v-list-tile @click.stop="drawer = !drawer">
        <v-list-tile-action style="min-width: 40px;">
          <v-icon>arrow_back</v-icon>
        </v-list-tile-action>

        <v-list-tile-content>
          <v-list-tile-title>Back</v-list-tile-title>
        </v-list-tile-content>
      </v-list-tile>
      <v-list class="pa-1">
        <v-divider></v-divider>
        <v-list-tile avatar>
          <v-list-tile-avatar>
            <img :src="profileImage" :alt="`Profile picture of ${name || 'User'}`" @error="$event.target.src = '/img/default-user.png'" />
          </v-list-tile-avatar>

          <v-list-tile-content>
            <v-list-tile-title>{{ name }}</v-list-tile-title>
            <v-list-tile-sub-title>{{ email }}</v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
        <!-- D/K/G Stimulus Circles -->
        <div class="stimulus-row">
          <div class="stimulus-item">
            <v-progress-circular
              :value="totalD"
              :size="36"
              :rotate="-90"
              width="4"
              color="#4caf50"
            >D</v-progress-circular>
            <span class="stimulus-label">Discipline</span>
          </div>
          <div class="stimulus-item">
            <v-progress-circular
              :value="totalK"
              :size="36"
              :rotate="-90"
              width="4"
              color="#E53935"
            >K</v-progress-circular>
            <span class="stimulus-label">Kinetics</span>
          </div>
          <div class="stimulus-item">
            <v-progress-circular
              :value="totalG"
              :size="36"
              :rotate="-90"
              width="4"
              color="#2196F3"
            >G</v-progress-circular>
            <span class="stimulus-label">Geniuses</span>
          </div>
        </div>
        <task-timing-bar
          :inTimeCount="tasksInTimeCount"
          :outOfTimeCount="tasksOutOfTimeCount"
        />
        <v-divider></v-divider>
      </v-list>

      <template v-for="(drawerItem, index) in drawerItems">
        <v-subheader :key="`header-${index}`">{{ drawerItem.header }}</v-subheader>
        <!-- <v-divider :key="`divider-${index}`"></v-divider> -->
        <v-list class="pt-0" dense :key="`list-${index}`">
          <v-list-tile v-for="item in drawerItem.items" :key="item.title" :to="item.route">
            <v-list-tile-action>
              <v-icon>{{ item.icon }}</v-icon>
            </v-list-tile-action>

            <v-list-tile-content>
              <v-list-tile-title>{{ item.title }}</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
          <template v-if="drawerItem.header === 'App'">
            <area-sidebar :areaTags="areaTags" />
            <project-sidebar :projectTags="projectTags" />
          </template>
        </v-list>
      </template>

      <v-layout row wrap>
        <v-flex d-flex xs12>
          <v-btn
            color="error"
            block
            class="ma-3"
            @click="handleClickSignOut"
          >
            Log out
          </v-btn>
        </v-flex>
      </v-layout>
    </v-navigation-drawer>
    <v-toolbar v-if="$route.name !== 'login'" class="elevation-0 fixed-toolbar safe-area-top" color="white" app>
      <v-toolbar-title style="font-size: 24px">{{ pageTitle }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="openAiSearch">
        <v-icon size="28">search</v-icon>
      </v-btn>
      <v-btn icon @click="pendingDialog = true">
        <v-icon size="28">checklist</v-icon>
      </v-btn>
      <v-btn icon @click.stop="drawer = !drawer">
        <v-avatar size="32">
          <img :src="profileImage" :alt="`Profile picture of ${name || 'User'}`" @error="$event.target.src = '/img/default-user.png'" />
        </v-avatar>
      </v-btn>
    </v-toolbar>
    <div v-if="$route.name !== 'login'" class="scrollable-content safe-area-content">
      <v-content>
        <router-view></router-view>
      </v-content>
    </div>
    <div v-else class="login-content-wrapper">
      <router-view></router-view>
    </div>
    <v-bottom-nav
      :value="true"
      fixed
      color="white"
      class="pb-2 fixed-bottom-nav safe-area-bottom"
      v-if="$route.name !== 'login' && $route.name !== 'stats'"
    >
      <v-btn
        color="primary"
        flat v-for="item in bottomNav"
        :key="item.title"
        :to="item.route"
        :value="item.route"
      >
        <span>{{ item.title }}</span>
        <v-icon>{{ item.icon }}</v-icon>
      </v-btn>
    </v-bottom-nav>
    <v-dialog
      v-model="pendingDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="pendingDialog = false">
            <v-icon>close</v-icon>
          </v-btn>
          <v-toolbar-title>Pending Items</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <pending-list />
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import localforage from 'localforage';
import moment from 'moment';
import gql from 'graphql-tag';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import TaskTimingBar from '@routine-notes/ui/atoms/TaskTimingBar/TaskTimingBar.vue';
import AreaSidebar from '@routine-notes/ui/molecules/AreaSidebar/AreaSidebar.vue';
import ProjectSidebar from '@routine-notes/ui/molecules/ProjectSidebar/ProjectSidebar.vue';
import PendingList from '../containers/PendingListContainer.vue';
import { taskTimingMixin } from '../mixins/taskTimingMixin';
import eventBus, { EVENTS } from '../utils/eventBus';
import { threshold } from '../utils/getDates';
import { AGENDA_GOALS_QUERY, ROUTINE_DATE_QUERY } from '../composables/graphql/queries';
import {
  GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, USER_TAGS,
} from '../constants/settings';
import { clearData, getSessionItem } from '../token';
import { gauthOption } from '../blob/config';

export default {
  components: {
    PendingList,
    TaskTimingBar,
    AreaSidebar,
    ProjectSidebar,
  },
  mixins: [taskTimingMixin],
  watch: {
    $route() {
      this.drawer = false;
    },
    'toolbarRoutineData.tasklist': {
      handler(newTasklist) {
        this.$currentTask.setTasklist(newTasklist || []);
      },
      immediate: true,
    },
  },
  apollo: {
    areaTags: {
      query: gql`query areaTags { areaTags }`,
      skip() {
        return !this.$root.$data.email;
      },
    },
    projectTags: {
      query: gql`query projectTags { projectTags }`,
      skip() {
        return !this.$root.$data.email;
      },
    },
    timingGoals: {
      query: AGENDA_GOALS_QUERY,
      variables() {
        return { date: moment().format('DD-MM-YYYY') };
      },
      update(data) {
        return data.agendaGoals || [];
      },
      skip() {
        return !this.$root.$data.email;
      },
    },
    toolbarRoutineData: {
      query: ROUTINE_DATE_QUERY,
      variables() {
        return { date: moment().format('DD-MM-YYYY') };
      },
      update(data) {
        return data.routineDate || {};
      },
      skip() {
        return !this.$root.$data.email;
      },
    },
  },
  data() {
    return {
      drawer: null,
      pendingDialog: false,
      areaTags: [],
      projectTags: [],
      drawerItems: [
        {
          header: 'App',
          items: [
            // { title: 'Agenda', icon: 'assignment_turned_in', route: '/agenda' },
            { title: 'Progress', icon: 'pie_chart', route: '/progress' },
            { title: 'Groups', icon: 'supervisor_account', route: '/groups' },
          ],
        },
        {
          header: 'Support',
          items: [
            { title: 'Guide', icon: 'auto_stories', route: '/guide' },
            { title: 'About', icon: 'info', route: '/about' },
          ],
        },
        {
          header: 'Settings',
          items: [
            { title: 'Profile', icon: 'account_circle', route: '/settings/profile' },
            { title: 'Notifications', icon: 'notifications', route: '/settings/notifications' },
          ],
        },
      ],
      bottomNav: [
        { title: 'Home', icon: 'home', route: '/home' },
        { title: 'Priority', icon: 'dashboard', route: '/priority' },
        { title: 'Routine', icon: 'history', route: '/settings' },
        { title: 'Goals', icon: 'assignment', route: '/goals' },
      ],
    };
  },
  computed: {
    name() {
      return this.$root.$data.name;
    },
    email() {
      return this.$root.$data.email;
    },
    picture() {
      return this.$root.$data.picture;
    },
    profileImage() {
      return this.$root.$data.picture || '/img/default-user.png';
    },
    pageTitle() {
      if (this.$route && this.$route.path && this.$route.path.startsWith('/progress')) {
        return 'Progress';
      }

      if (this.$route.name) {
        const spaced = this.$route.name.replace(/([a-z])([A-Z])/g, '$1 $2');
        return spaced[0].toUpperCase() + spaced.substr(1);
      }
      return 'Routine Notes';
    },
    totalD() {
      return this.countStimulusTotal('D');
    },
    totalK() {
      return this.countStimulusTotal('K');
    },
    totalG() {
      return this.countStimulusTotal('G');
    },
    dayGoalItemsForTiming() {
      const goals = this.timingGoals || [];
      return goals
        .filter((g) => g.period === 'day')
        .flatMap((g) => g.goalItems || []);
    },
  },
  methods: {
    countStimulusTotal(stimulus = 'D') {
      const tasklist = this.$currentTaskList || [];
      const aggregatePoints = tasklist.reduce((total, num) => {
        const currentStimulus = num.stimuli && num.stimuli.find((st) => st.name === stimulus);
        if (currentStimulus && currentStimulus.earned) {
          return total + currentStimulus.earned;
        }
        return total;
      }, 0);

      if (stimulus === 'G') {
        const today = moment().format('DD-MM-YYYY');
        const addFirstWeek = moment(today, 'DD-MM-YYYY').startOf('month').weekday() < 2 ? 1 : 0;
        const wom = moment(today, 'DD-MM-YYYY').week() - moment(today, 'DD-MM-YYYY').startOf('month').week() + addFirstWeek;
        if (moment(today, 'DD-MM-YYYY').weekday() >= threshold.weekDays - 1) {
          if (wom >= threshold.monthWeeks - 1) {
            if (moment(today, 'DD-MM-YYYY').month() >= threshold.yearMonths - 1) {
              return aggregatePoints;
            }
            return Number((aggregatePoints * 1.334).toFixed(1));
          }
          return aggregatePoints * 2;
        }
        return aggregatePoints * 4;
      }
      return aggregatePoints;
    },
    openAiSearch() {
      eventBus.$emit(EVENTS.OPEN_AI_SEARCH, { mode: 'search' });
    },
    async handleClickSignOut() {
      try {
        if (Capacitor.isNativePlatform()) {
          // Initialize before signOut to prevent nil error
          const platform = Capacitor.getPlatform();
          const clientId = platform === 'ios'
            ? gauthOption.iosClientId
            : gauthOption.androidClientId;

          await GoogleAuth.initialize({
            clientId,
            scopes: ['profile', 'email'],
          });

          await GoogleAuth.signOut();
        } else {
          await this.$gAuth.signOut();
        }

        this.drawer = false;
        await clearData();
        await localforage.clear();
        localStorage.removeItem(USER_TAGS);
        this.$root.$data.userName = getSessionItem(GC_USER_NAME);
        this.$root.$data.userEmail = getSessionItem(GC_USER_EMAIL);
        this.$root.$data.picture = getSessionItem(GC_PICTURE);
        this.$router.push('/').catch(() => { });
      } catch (error) {
        console.log(error);
        // Just clear local data and redirect on error
        await clearData();
        await localforage.clear();
        localStorage.removeItem(USER_TAGS);
        this.$router.push('/').catch(() => { });
      }
    },
  },
  mounted() {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || navigator.vendor || window.opera;

      // Extract Android version from user agent
      const androidMatch = ua.match(/Android\s([0-9.]+)/);
      if (androidMatch) {
        const androidVersion = parseFloat(androidMatch[1]);

        // Android 14+ detection (API 34+)
        if (androidVersion >= 14) {
          document.body.classList.add('android14-plus');
          document.documentElement.classList.add('android14-plus');

          // Set CSS custom properties for safe area handling
          document.documentElement.style.setProperty('--android-version', androidVersion.toString());
        }

        // Legacy Android 15 detection for backward compatibility
        if (androidVersion >= 15 || /Android\s15|Android\sVanilla|Android\sVIC/i.test(ua)) {
          document.body.classList.add('android15');
        }
      }
    }
  },
};
</script>

<style>
#mobileLayout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.fixed-toolbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.safe-area-top {
  padding-top: env(safe-area-inset-top);
}

/* Android 14+ specific safe area handling */
body.android14-plus .safe-area-top {
  padding-top: max(env(safe-area-inset-top), 24px) !important;
}

body.android15 .safe-area-top {
  padding-top: max(env(safe-area-inset-top, 0px), 8px);
}

.fixed-bottom-nav {
  position: fixed !important;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  padding-bottom: 0 !important;
  /* Remove padding-bottom from footer, let scrollable-content handle it */
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Android 14+ specific safe area handling */
body.android14-plus .safe-area-bottom {
  padding-bottom: max(env(safe-area-inset-bottom), 16px) !important;
}

body.android15 .safe-area-bottom {
  padding-bottom: max(env(safe-area-inset-bottom, 0px), 40px);
}

.scrollable-content {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
  /* padding-top: 20px; */
  /* height of toolbar */
  padding-bottom: 100px;
  min-height: 0;
}

/* Android 14+ content padding */
body.android14-plus .scrollable-content {
  /* padding-top: calc(64px + max(env(safe-area-inset-top), 24px)) !important;
  padding-bottom: calc(75px + max(env(safe-area-inset-bottom), 16px)) !important; */
}

body.android15 .scrollable-content {
  /* padding-bottom: calc(104px + env(safe-area-inset-bottom, 0px)) !important; */
}

.safe-area-content {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  background: #fff;
  min-height: 100%;
  box-sizing: border-box;
  width: 100%;
  overflow-x: hidden;
}

body.android15 .safe-area-content {
  padding-left: max(env(safe-area-inset-left, 0px), 0px);
  padding-right: max(env(safe-area-inset-right, 0px), 0px);
}

#mobileLayout .v-card {
  border-radius: 16px;
}

.login footer {
  bottom: calc(30px + env(safe-area-inset-bottom)) !important;
}

#mobileLayout .progress .v-card .headline {
  color: rgba(0, 0, 0, 0.54);
  font-size: 14px !important;
  line-height: 16px !important;
  font-weight: bold;
}

#mobileLayout .image-card {
  border-radius: 0;
}

#mobileLayout .v-btn--bottom:not(.v-btn--absolute) {
  bottom: 70px;
}

#mobileLayout .v-btn--bottom:not(.v-btn--absolute).second-right-btn {
  right: 16px;
}

#mobileLayout .image-card .v-btn--bottom.v-btn--absolute {
  bottom: -12px;
}

#mobileLayout .image-card-page {
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  position: relative;
  top: -16px;
  background-color: #fff;
  padding-top: 16px !important;
}

#mobileLayout .v-chip .v-chip__content {
  height: 38px;
  padding: 0 16px;
}

#mobileLayout .v-chip .v-chip__content .v-icon {
  font-size: 16px;
}

#mobileLayout .v-navigation-drawer--temporary:not(.v-navigation-drawer--close),
#mobileLayout .v-navigation-drawer--is-mobile:not(.v-navigation-drawer--close) {
  width: 100% !important;
}

.v-bottom-nav {
  height: 80px !important;
}

.login-content-wrapper {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

body.android15 #mobileLayout .nav-header {
  padding-top: max(env(safe-area-inset-top, 0px), 8px);
}

.stimulus-row {
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  padding: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.stimulus-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}

.stimulus-item:last-child {
  border-right: none;
}

.stimulus-label {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.54);
  font-weight: 500;
  margin-top: 2px;
}
</style>
