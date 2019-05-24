<template>
  <v-app>
  <v-navigation-drawer app>
    <router-link to="/">Home</router-link> |
    <router-link to="/about">About</router-link>
  </v-navigation-drawer>
  <v-toolbar app></v-toolbar>
  <v-content>
      <router-view></router-view>
  </v-content>
  <v-footer app></v-footer>
</v-app>
</template>

