<template>
  <div id="desktopLayout">
    <v-navigation-drawer
      fixed
      clipped
      v-model="drawer"
      width="240"
      mobile-break-point="1024"
      v-if="$route.name !== 'login'"
    >
      <v-list class="pa-1" v-if="$gAuth.isAuthorized">
        <v-list-tile avatar>
          <v-list-tile-avatar>
            <img :src="picture" />
          </v-list-tile-avatar>

          <v-list-tile-content>
            <v-list-tile-title>{{ name }}</v-list-tile-title>
            <v-list-tile-sub-title>{{ email }}</v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>

      <v-list class="pt-0" dense>
        <v-divider></v-divider>

        <v-list-tile v-for="item in items" :key="item.title" :to="item.route">
          <v-list-tile-action>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-tile-action>

          <v-list-tile-content>
            <v-list-tile-title>{{ item.title }}</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
        <v-list-tile @click="handleClickSignOut">
          <v-list-tile-action>
            <v-icon>logout</v-icon>
          </v-list-tile-action>

          <v-list-tile-content>
            <v-list-tile-title>Log Out</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>
    <v-toolbar v-if="$route.name !== 'login'" dark color="primary" app>
      <v-toolbar-side-icon @click.stop="drawer = !drawer"></v-toolbar-side-icon>
      <v-toolbar-title class="white--text">{{ pageTitle }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="pendingDialog = true">
        <v-icon>checklist</v-icon>
      </v-btn>
    </v-toolbar>
    <v-content>
      <router-view></router-view>
    </v-content>
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

export default {
  components: {
    PendingList,
  },
  data() {
    return {
      drawer: null,
      pendingDialog: false,
      items: [
        { title: 'Home', icon: 'home', route: '/home' },
        // { title: 'Agenda', icon: 'assignment_turned_in', route: '/agenda' },
        { title: 'Goals', icon: 'assignment', route: '/goals' },
        { title: 'Progress', icon: 'pie_chart', route: '/progress' },
        { title: 'Family', icon: 'supervisor_account', route: '/family' },
        { title: 'Routine Settings', icon: 'settings', route: '/settings' },
        { title: 'About', icon: 'info', route: '/about' },
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
      || 'Family Routine';
    },
  },
  methods: {
    handleClickSignOut() {
      this.$gAuth
        .signOut()
        .then(async () => {
          // On success do something
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
  .v-toolbar__title:not(:first-child) {
    margin-left: 8px;
  }

  @media (min-width: 1200px) {
    .v-toolbar__side-icon {
      display: none;
    }
  }
  @media (min-width: 1024px) {

    .v-navigation-drawer--open ~ main.v-content {
      padding-left: 240px !important;
    }

    .v-navigation-drawer--fixed {
      padding-top: 64px;
    }
  }
</style>
