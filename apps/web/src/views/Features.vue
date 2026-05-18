<template>
  <v-container class="features mt-4">
    <h1 class="display-1 text-xs-center mb-4">Features</h1>

    <v-layout row wrap>
      <v-flex xs12 md6 class="pa-3" v-for="feature in features" :key="feature.title">
        <v-card>
          <v-card-title>
            <v-icon left color="primary">{{ feature.icon }}</v-icon>
            <span class="title">{{ feature.title }}</span>
          </v-card-title>
          <v-card-text>{{ feature.description }}</v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
export default {
  name: 'Features',
  data() {
    return {
      features: [
        {
          icon: 'mdi-calendar-clock',
          title: 'Daily Routines',
          description: 'Schedule time-based tasks for every family member with points and streak tracking.',
        },
        {
          icon: 'mdi-flag-checkered',
          title: 'Goal Tracking',
          description: 'Set goals across day, week, month, year and lifetime periods. Track progress with milestones.',
        },
        {
          icon: 'mdi-brain',
          title: 'AI Assistance',
          description: 'Summarize goals, generate next steps, and extract tasks from natural language with AI.',
        },
        {
          icon: 'mdi-bell-ring',
          title: 'Push Notifications',
          description: 'Receive reminders and weekly agenda summaries via Firebase push notifications.',
        },
        {
          icon: 'mdi-shield-lock',
          title: 'Data Encryption',
          description: 'Your data is encrypted at rest with AES-256-GCM for complete privacy.',
        },
        {
          icon: 'mdi-account-group',
          title: 'Family Groups',
          description: 'Create groups to share routines and goals with family members.',
        },
      ],
    };
  },
};
</script>
