<template>
  <div id="tabletLayout">
    <v-navigation-drawer
      fixed
      clipped
      v-model="drawer"
      v-if="$route.name !== 'login' && $route.name !== 'stats'"
    >
      <v-list class="pa-1">
        <v-list-tile avatar>
          <v-list-tile-avatar>
            <img :src="profileImage" :alt="`Profile picture of ${name || 'User'}`" @error="$event.target.src='/img/default-user.png'" />
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
  </div>
</template>

<script>
import {
  GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, USER_TAGS,
} from '../constants/settings';
import { clearData, getSessionItem } from '../token';

export default {
  data() {
    return {
      drawer: null,
      pendingDialog: false,
      items: [
        { title: 'Home', icon: 'home', route: '/home' },
        { title: 'Progress', icon: 'pie_chart', route: '/progress' },
        { title: 'Routine', icon: 'history', route: '/settings' },
        { title: 'Goals', icon: 'assignment', route: '/goals' },
        { title: 'Groups', icon: 'supervisor_account', route: '/groups' },
        { title: 'History', icon: 'update', route: '/history' },
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
    handleClickSignOut() {
      this.$gAuth
        .signOut()
        .then(async () => {
          this.drawer = false;
          await clearData();
          localStorage.removeItem(USER_TAGS);
          this.$root.$data.userName = getSessionItem(GC_USER_NAME);
          this.$root.$data.userEmail = getSessionItem(GC_USER_EMAIL);
          this.$root.$data.picture = getSessionItem(GC_PICTURE);
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
