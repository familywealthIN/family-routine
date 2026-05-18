<template>
  <v-container class="about mt-4">
    <h1 class="display-1 text-xs-center mb-4">About</h1>

    <v-layout row wrap justify-center>
      <v-flex xs12 md8>
        <v-card class="pa-4">
          <v-card-text class="subheading">
            <p>
              Family Routine is a goal and routine management application
              designed to help families stay organized and productive.
            </p>
            <p>
              Built with Vue.js, GraphQL, and MongoDB, the app features
              AI-powered goal planning, streak tracking, push notifications,
              and end-to-end data encryption.
            </p>
            <p>
              Whether you're managing daily chores, planning weekly goals,
              or setting long-term milestones, Family Routine keeps everyone
              on the same page.
            </p>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
export default {
  name: 'About',
};
</script>
