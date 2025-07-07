<template>
  <div id="desktopLayout">
    <v-navigation-drawer
      fixed
      clipped
      v-model="drawer"
      width="240"
      mobile-break-point="1024"
      v-if="$route.name !== 'login' && $route.name !== 'stats'"
    >
      <v-list class="pa-1">
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
        <year-goal-sidebar />
        <v-list-tile v-for="item in otherItems" :key="item.title" :to="item.route">
          <v-list-tile-action>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-tile-action>

          <v-list-tile-content>
            <v-list-tile-title>{{ item.title }}</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
        <project-sidebar />
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
    <v-toolbar v-if="$route.name !== 'login'" color="white" app style="border-bottom: 1px solid rgba(0,0,0,0.12) !important;">
      <v-toolbar-side-icon @click.stop="drawer = !drawer"></v-toolbar-side-icon>
      <v-toolbar-title>{{ pageTitle }}</v-toolbar-title>      <div class="ai-search-box" @click="aiSearchModal = true">
          <span>Build your routine goals with AI</span>
          <v-icon class="search-icon">search</v-icon>
        </div>
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
        </v-toolbar>        <pending-list />
      </v-card>
    </v-dialog>

    <!-- AI Search Modal -->
    <ai-search-modal
      v-model="aiSearchModal"
      @goals-saved="onGoalsSaved"
      @task-created="onTaskCreated"
    />
  </div>
</template>

<script>
import ProjectSidebar from '@/components/ProjectSidebar.vue';
import YearGoalSidebar from '@/components/YearGoalSidebar.vue';
import PendingList from '../components/PendingList.vue';
import AiSearchModal from '../components/AiSearchModal.vue';
import {
  GC_USER_NAME, GC_PICTURE, GC_USER_EMAIL, USER_TAGS,
} from '../constants/settings';
import { clearData, getSessionItem } from '../token';

export default {
  components: {
    PendingList,
    ProjectSidebar,
    YearGoalSidebar,
    AiSearchModal,
  },
  data() {
    return {
      drawer: null,
      pendingDialog: false,
      aiSearchModal: false,
      items: [
        { title: 'Home', icon: 'home', route: '/home' },
      ],
      otherItems: [
        { title: 'Progress', icon: 'pie_chart', route: '/progress' },
        { title: 'Groups', icon: 'supervisor_account', route: '/groups' },
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
      || 'Routine Notes';
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
    onGoalsSaved(eventData) {
      this.$emit('goals-saved', eventData);
    },
    onTaskCreated(taskData) {
      // Handle successful task creation
      console.log('Task created:', taskData);

      this.$emit('show-success', 'Task successfully created!');

      // Refetch daily goals since tasks are day goals
      if (this.$route.name === 'home') {
        console.log('Refetching daily goals after task creation...');
        this.$nextTick(() => {
          const dashboardComponent = this.$children.find((child) => child.$options.name === 'DashBoard');
          if (dashboardComponent && dashboardComponent.$apollo && dashboardComponent.$apollo.queries.goals) {
            dashboardComponent.$apollo.queries.goals.refetch()
              .then(() => {
                console.log('Daily goals refetched successfully after task creation');
              })
              .catch((error) => {
                console.error('Error refetching daily goals after task creation:', error);
                // Fallback to page reload if refetch fails
                window.location.reload();
              });
          } else {
            // Fallback to page reload if we can't find the dashboard component
            console.log('Dashboard component not found, falling back to page reload');
            window.location.reload();
          }
        });
      }
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

  /* Desktop rounded borders to match mobile */
  #desktopLayout .v-card {
    border-radius: 16px;
  }

  .ai-search-box * {
    vertical-align: middle;
  }  .ai-search-box {
    background-color: #ddd;
    color: #777;
    border-radius: 16px;
    display: inline-block;
    margin: 8px 8px 8px calc(40% - 250px);
    padding: 8px 16px;
    min-width: 500px;
    line-height: 1;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .ai-search-box:hover {
    background-color: #ccc;
    color: #555;
  }
  .search-icon {
    position: relative;
    left: 256px;
    margin: 0;
    padding: 0;
  }
</style>
