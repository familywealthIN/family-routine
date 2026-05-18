<template>
  <div class="landing">
    <v-container fluid class="hero pa-5 text-xs-center">
      <v-layout column align-center justify-center>
        <h1 class="display-2 font-weight-bold mb-3">
          Organize Your Family's Day
        </h1>
        <p class="headline mb-4">
          A routine and goal management app with AI-powered features
          to keep your family on track.
        </p>
        <v-btn large color="accent" href="https://app.familyroutine.com" target="_blank">
          Get Started
        </v-btn>
      </v-layout>
    </v-container>

    <v-container class="mt-5">
      <v-layout row wrap justify-center>
        <v-flex xs12 sm4 class="pa-3 text-xs-center">
          <v-icon x-large color="primary">mdi-calendar-check</v-icon>
          <h3 class="title mt-2">Daily Routines</h3>
          <p>Schedule and track your family's daily tasks with streak tracking.</p>
        </v-flex>
        <v-flex xs12 sm4 class="pa-3 text-xs-center">
          <v-icon x-large color="primary">mdi-bullseye-arrow</v-icon>
          <h3 class="title mt-2">Goal Management</h3>
          <p>Set day, week, month and year goals with milestone breakdowns.</p>
        </v-flex>
        <v-flex xs12 sm4 class="pa-3 text-xs-center">
          <v-icon x-large color="primary">mdi-robot</v-icon>
          <h3 class="title mt-2">AI-Powered</h3>
          <p>Get AI suggestions for next steps, summaries and task extraction.</p>
        </v-flex>
      </v-layout>
    </v-container>
  </div>
</template>

<script>
export default {
  name: 'Landing',
};
</script>

<style scoped>
.hero {
  background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
  color: white;
  min-height: 60vh;
  display: flex;
  align-items: center;
}
</style>
