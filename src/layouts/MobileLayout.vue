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
      <v-btn icon @click="aiSearchModal = true">
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

    <!-- AI Search Modal -->
    <ai-search-modal
      v-model="aiSearchModal"
      @goals-saved="onGoalsSaved"
    />
  </div>
</template>

<script>
import PendingList from '../components/PendingList.vue';
import AiSearchModal from '../components/AiSearchModal.vue';
import {
  GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, USER_TAGS,
} from '../constants/settings';
import { clearData, getSessionItem } from '../token';

export default {
  components: {
    PendingList,
    AiSearchModal,
  },
  data() {
    return {
      drawer: null,
      pendingDialog: false,
      aiSearchModal: false,
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
    onGoalsSaved(eventData) {
      // Handle successful goals save
      console.log('Goals saved:', eventData);

      const message = eventData && eventData.count
        ? `Successfully created ${eventData.count} goals for ${eventData.period}`
        : 'Successfully saved goals';

      this.$emit('show-success', message);

      // Refetch daily goals if day goals were created and we're on the dashboard
      if (this.$route.name === 'home' && eventData && eventData.hasDayGoals) {
        console.log('Refetching daily goals on dashboard...');
        // Use Vue's $root to access the dashboard component and refetch daily goals
        this.$nextTick(() => {
          const dashboardComponent = this.$children.find((child) => child.$options.name === 'DashBoard');
          if (dashboardComponent && dashboardComponent.$apollo && dashboardComponent.$apollo.queries.goals) {
            dashboardComponent.$apollo.queries.goals.refetch()
              .then(() => {
                console.log('Daily goals refetched successfully');
              })
              .catch((error) => {
                console.error('Error refetching daily goals:', error);
                // Fallback to page reload if refetch fails
                window.location.reload();
              });
          } else {
            // Fallback to page reload if we can't find the dashboard component
            console.log('Dashboard component not found, falling back to page reload');
            window.location.reload();
          }
        });
      } else if (this.$route.name === 'home') {
        // For non-day goals or when we can't determine, still reload the page
        window.location.reload();
      }
    },
  },
};
</script>

<style>
#mobileLayout {
    padding-bottom: 64px;
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
</style>
