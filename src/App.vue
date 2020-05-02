<template>
  <v-app>
    <!-- <v-navigation-drawer temporary>
    <router-link to="/">Home</router-link> |
    <router-link to="/about">About</router-link>
    </v-navigation-drawer>-->
    <v-navigation-drawer v-model="drawer" absolute temporary>
      <v-list class="pa-1" v-if="$gAuth.isAuthorized">
        <v-list-tile avatar>
          <v-list-tile-avatar>
            <img :src="picture" />
          </v-list-tile-avatar>

          <v-list-tile-content>
            <v-list-tile-title>{{name}}</v-list-tile-title>
            <v-list-tile-sub-title>{{email}}</v-list-tile-sub-title>
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
      <v-toolbar-title
        class="white--text"
      >{{ ($route.name && $route.name[0].toUpperCase() + $route.name.substr(1)) || 'Family Routine' }}</v-toolbar-title>
    </v-toolbar>
    <v-content>
      <router-view></router-view>
    </v-content>
    <!-- <v-footer app></v-footer> -->
  </v-app>
</template>

<script>
import { GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, GC_AUTH_TOKEN } from './constants/settings';

export default {
  data() {
    return {
      drawer: null,
      items: [
        { title: "Home", icon: "home", route: "/home" },
        { title: "History", icon: "history", route: "/history" },
        { title: "Settings", icon: "settings", route: "/settings" },
        { title: "About", icon: "info", route: "/about" }
      ]
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
    }
  },
  methods: {
    handleClickSignOut() {
      this.$gAuth
        .signOut()
        .then(() => {
          // On success do something
          this.isSignIn = this.$gAuth.isAuthorized;
          localStorage.removeItem(GC_USER_EMAIL);
          localStorage.removeItem(GC_USER_NAME);
          localStorage.removeItem(GC_PICTURE);
          localStorage.removeItem(GC_AUTH_TOKEN);
          this.$root.$data.userName = localStorage.getItem(GC_USER_NAME);
          this.$root.$data.userEmail = localStorage.getItem(GC_USER_EMAIL);
          this.$root.$data.userEmail = localStorage.getItem(GC_PICTURE);
          this.$router.push('/');
        })
        .catch(error => {
          console.log(error);
          // On fail do something
        });
    },
  }
};
</script>