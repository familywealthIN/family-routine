<template>
  <v-card>
    <v-card-title class="headline">
      Description
      <v-spacer></v-spacer>
      <v-btn icon @click="refreshSummary">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text>
      <div v-if="loading" class="text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </div>
      <div v-else-if="error" class="error--text">
        {{ error }}
      </div>
      <div v-else class="text-body-1">
        {{ summary }}
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import gql from 'graphql-tag';

export default {
  name: 'SummaryCards',
  props: {
    goalItems: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      summary: '',
      loading: false,
      error: '',
    };
  },
  inject: ['notifications'],
  methods: {
    transformToAiItems(goals) {
      return goals.map((goal) => ({
        body: goal.body,
        period: goal.period,
        date: goal.date,
      }));
    },
    async refreshSummary() {
      this.loading = true;
      this.error = '';
      try {
        const { data } = await this.$apollo.query({
          query: gql`
            query GetGoalsSummary($items: [AiItemInput!]!) {
              getGoalsSummary(items: $items) {
                description
              }
            }
          `,
          variables: {
            items: this.transformToAiItems(this.goalItems),
          },
        });
        this.summary = data.getGoalsSummary.description;
      } catch (err) {
        this.error = 'Failed to generate summary. Please try again.';
        console.log(this.error, err);
      } finally {
        this.loading = false;
      }
    },
  },
  watch: {
    goalItems: {
      immediate: true,
      handler(newGoals) {
        if (newGoals && newGoals.length > 0) {
          this.refreshSummary();
        }
      },
    },
  },
};
</script>

<style scoped>
.next-steps-content {
  padding: 0 16px;
}
</style>
