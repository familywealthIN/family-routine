<template>
  <div id="mobileLayout">
    <v-navigation-drawer
      fixed
      clipped
      right
      v-model="drawer"
      v-if="$route.name !== 'login' && $route.name !== 'stats'" class="header"
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
            <img :src="picture" />
          </v-list-tile-avatar>

          <v-list-tile-content>
            <v-list-tile-title>{{ name }}</v-list-tile-title>
            <v-list-tile-sub-title>{{ email }}</v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
        <v-divider></v-divider>
      </v-list>

      <template v-for="drawerItem in drawerItems">
        <v-subheader :key="drawerItem.header">{{ drawerItem.header }}</v-subheader>
        <!-- <v-divider :key="drawerItem.header"></v-divider> -->
        <v-list class="pt-0" dense :key="drawerItem.header">
          <v-list-tile v-for="item in drawerItem.items" :key="item.title" :to="item.route">
            <v-list-tile-action>
              <v-icon>{{ item.icon }}</v-icon>
            </v-list-tile-action>

            <v-list-tile-content>
              <v-list-tile-title>{{ item.title }}</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
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
      <v-btn icon @click="pendingDialog = true">
        <v-icon size="28">search</v-icon>
      </v-btn>
      <v-btn icon @click="pendingDialog = true">
        <v-icon size="28">checklist</v-icon>
      </v-btn>
      <v-btn icon @click.stop="drawer = !drawer">
        <v-avatar size="32">
          <img :src="picture" />
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
        flat
        v-for="item in bottomNav"
        :key="item.title"
        :to="item.route"
        :value="item.route"
      >
        <span>{{item.title}}</span>
        <v-icon>{{item.icon}}</v-icon>
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
import PendingList from '../components/PendingList.vue';
import {
  GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, USER_TAGS,
} from '../constants/settings';
import { clearData, getSessionItem } from '../token';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

export default {
  components: {
    PendingList,
  },
  data() {
    return {
      drawer: null,
      pendingDialog: false,
      drawerItems: [
        {
          header: 'App',
          items: [
            // { title: 'Agenda', icon: 'assignment_turned_in', route: '/agenda' },
            { title: 'Groups', icon: 'supervisor_account', route: '/groups' },
            { title: 'History', icon: 'update', route: '/history' },
            { title: 'Milestones', icon: 'filter_hdr', route: '/goals/milestones' },
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
        { title: 'Progress', icon: 'pie_chart', route: '/progress' },
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
    pageTitle() {
      return (this.$route.name && this.$route.name[0].toUpperCase() + this.$route.name.substr(1))
      || 'Routine Notes';
    },
  },
  methods: {
    handleClickSignOut() {
      if (Capacitor.isNativePlatform()) {
        GoogleAuth.signOut().then(async () => {
          this.drawer = false;
          await clearData();
          localStorage.removeItem(USER_TAGS);
          this.$root.$data.userName = '';
          this.$root.$data.userEmail = '';
          this.$root.$data.picture = '';
          this.$router.push('/').catch(() => {});
        }).catch((error) => {
          console.log(error);
          window.location.reload();
        });
      } else {
        this.$gAuth
          .signOut()
          .then(async () => {
            this.drawer = false;
            this.isSignIn = this.$gAuth.isAuthorized;
            await clearData();
            localStorage.removeItem(USER_TAGS);
            this.$root.$data.userName = getSessionItem(GC_USER_NAME);
            this.$root.$data.userEmail = getSessionItem(GC_USER_EMAIL);
            this.$root.$data.userEmail = getSessionItem(GC_PICTURE);
            this.$router.push('/').catch(() => {});
          })
          .catch((error) => {
            window.location.reload();
            console.log(error);
          });
      }
    },
  },
  mounted() {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || navigator.vendor || window.opera;
      // Android 15 user agent detection (API 35, Android 15 is codename 'Vanilla Ice Cream')
      // This is a best-effort guess, update as needed for your app's UA string
      if (/Android\s15|Android\sVanilla|Android\sVIC/i.test(ua)) {
        document.body.classList.add('android15');
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

body.android15 .safe-area-top {
  padding-top: max(env(safe-area-inset-top, 0px), 8px);
}

.fixed-bottom-nav {
  position: fixed !important;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  padding-bottom: 0 !important; /* Remove padding-bottom from footer, let scrollable-content handle it */
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
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
  padding-top: 60px; /* height of toolbar */
  padding-bottom: 100px;
  min-height: 0;
}

body.android15 .scrollable-content {
  padding-bottom: calc(104px + env(safe-area-inset-bottom, 0px)) !important;
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
  height: 64px !important;
}

.login-content-wrapper {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

body.android15 #mobileLayout .header {
  padding-top: max(env(safe-area-inset-top, 0px), 8px);
}
</style>
