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
      <v-btn icon @click="mottoDialog = true">
        <v-icon>favorite</v-icon>
      </v-btn>
    </v-toolbar>
    <v-content>
      <router-view></router-view>
    </v-content>
    <v-dialog
      v-model="mottoDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="mottoDialog = false">
            <v-icon>close</v-icon>
          </v-btn>
          <v-toolbar-title>Motto</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <motto-list />
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import MottoList from '../components/MottoList.vue';
import {
  GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, GC_AUTH_TOKEN,
} from '../constants/settings';

export default {
  components: {
    MottoList,
  },
  data() {
    return {
      drawer: null,
      mottoDialog: false,
      items: [
        { title: 'Home', icon: 'home', route: '/home' },
        { title: 'Agenda', icon: 'assignment_turned_in', route: '/agenda' },
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

  @media (min-width: 1024px) {
    .v-toolbar__side-icon {
      display: none;
    }

    nav + main.v-content {
      padding-left: 240px !important;
    }

    .v-navigation-drawer--fixed {
      padding-top: 64px;
    }
  }
</style>
