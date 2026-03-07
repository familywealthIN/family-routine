<template>
  <div class="summary-cards">
    <v-card class="mb-4 h-100 d-flex flex-column">
      <v-card-title class="headline">
        Description
        <v-spacer></v-spacer>
        <v-btn icon @click="refreshSummary">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text class="flex-grow-1 align-center">
        <div v-if="loading" class="text-center w-100">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
        <div v-else-if="error" class="error--text w-100">
          {{ error }}
        </div>
        <div v-else class="text-body-1 w-100">
          {{ summary }}
        </div>
      </v-card-text>
    </v-card>
  </div>
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
.summary-cards {
  max-width: 800px;
  margin: 0 auto;
  height: 100%;
}

/* Ensure the card takes full height of its container */
.summary-cards .v-card {
  height: 100%;
  min-height: 300px; /* Minimum height to match typical period goals section */
}

/* Make content area flexible and center content vertically */
.summary-cards .v-card .v-card__text {
  flex-grow: 1;
  display: flex;
  align-items: center;
}

/* Ensure width utility classes work */
.w-100 {
  width: 100%;
}
</style>
