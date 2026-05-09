<template>
  <v-app>
    <v-toolbar app color="primary" dark>
      <v-toolbar-title>
        <router-link to="/" class="white--text" style="text-decoration:none">
          Family Routine
        </router-link>
      </v-toolbar-title>
      <v-spacer />
      <v-toolbar-items>
        <v-btn flat to="/features">Features</v-btn>
        <v-btn flat to="/about">About</v-btn>
        <v-btn flat href="https://app.familyroutine.com" target="_blank" outline>
          Launch App
        </v-btn>
      </v-toolbar-items>
    </v-toolbar>

    <v-content>
      <router-view />
    </v-content>

    <v-footer app color="primary" dark>
      <v-layout justify-center>
        <span>&copy; {{ new Date().getFullYear() }} Family Routine</span>
      </v-layout>
    </v-footer>
  </v-app>
</template>

<script>
export default {
  name: 'App',
};
</script>
