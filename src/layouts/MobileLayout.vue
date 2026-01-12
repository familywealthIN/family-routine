<template>
  <div id="mobileLayout">
    <v-navigation-drawer
      fixed
      clipped
      right
      v-model="drawer"
      v-if="$route.name !== 'login' && $route.name !== 'stats'"
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
            <img :src="profileImage" :alt="`Profile picture of ${name || 'User'}`" @error="$event.target.src='/img/default-user.png'" />
          </v-list-tile-avatar>

          <v-list-tile-content>
            <v-list-tile-title>{{ name }}</v-list-tile-title>
            <v-list-tile-sub-title>{{ email }}</v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
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
    <v-toolbar v-if="$route.name !== 'login'" class="elevation-0" color="white" app>
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
          <img :src="profileImage" :alt="`Profile picture of ${name || 'User'}`" @error="$event.target.src='/img/default-user.png'" />
        </v-avatar>
      </v-btn>
    </v-toolbar>
    <v-content>
      <router-view></router-view>
    </v-content>
    <v-bottom-nav
      :value="true"
      fixed
      color="white"
      class="pb-2"
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
import PendingList from '../components/organisms/PendingList/PendingList.vue';
import eventBus, { EVENTS } from '../utils/eventBus';
import {
  GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, USER_TAGS,
} from '../constants/settings';
import { clearData, getSessionItem } from '../token';

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
            { title: 'Priority', icon: 'view_module', route: '/priority' },
            { title: 'Progress', icon: 'pie_chart', route: '/progress' },
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
        { title: 'Priority', icon: 'dashboard', route: '/priority' },
        { title: 'Progress', icon: 'pie_chart', route: '/progress' },
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
      return (this.$route.name && this.$route.name[0].toUpperCase() + this.$route.name.substr(1))
      || 'Routine Notes';
    },
  },
  methods: {
    openAiSearch() {
      eventBus.$emit(EVENTS.OPEN_AI_SEARCH);
    },
    handleClickSignOut() {
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
    },
  },
};
</script>

<style>
#mobileLayout {
    padding-bottom: 64px;
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
</style>
