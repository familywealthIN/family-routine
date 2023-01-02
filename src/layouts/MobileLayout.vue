<template>
  <div id="mobileLayout">
    <v-navigation-drawer
      fixed
      clipped
      right
      v-model="drawer"
      v-if="$route.name !== 'login'"
    >
      <v-list-tile @click.stop="drawer = !drawer">
        <v-list-tile-action style="min-width: 40px;">
          <v-icon>arrow_back</v-icon>
        </v-list-tile-action>

        <v-list-tile-content>
          <v-list-tile-title>Back</v-list-tile-title>
        </v-list-tile-content>
      </v-list-tile>
      <v-list class="pa-1" v-if="$gAuth.isAuthorized">
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
    <v-toolbar v-if="$route.name !== 'login'" class="elevation-0" color="white" app>
      <v-toolbar-title style="font-size: 24px">{{ pageTitle }}</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="mottoDialog = true">
        <v-icon size="28">favorite</v-icon>
      </v-btn>
      <v-btn icon @click.stop="drawer = !drawer">
        <v-avatar size="32">
          <img :src="picture" />
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
      v-if="$route.name !== 'login'"
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
  GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, GC_AUTH_TOKEN, USER_TAGS,
} from '../constants/settings';

export default {
  components: {
    MottoList,
  },
  data() {
    return {
      drawer: null,
      mottoDialog: false,
      drawerItems: [
        {
          header: 'App',
          items: [
            { title: 'Agenda', icon: 'assignment_turned_in', route: '/agenda' },
            { title: 'Family', icon: 'supervisor_account', route: '/family' },
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
          localStorage.removeItem(USER_TAGS);
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
#mobileLayout {
    padding-bottom: 56px;
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
</style>
