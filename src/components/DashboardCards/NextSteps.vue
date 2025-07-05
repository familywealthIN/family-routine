<template>
  <v-card>
    <v-card-title class="headline">
      Next Steps
      <v-spacer></v-spacer>
      <v-btn icon @click="refreshNextSteps">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text>
      <div v-if="loadingSteps" class="text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </div>
      <div v-else-if="errorSteps" class="error--text">
        {{ errorSteps }}
      </div>
      <div v-else class="next-steps-content">
        <vue-markdown :source="nextSteps"></vue-markdown>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
import gql from 'graphql-tag';
import VueMarkdown from 'vue-markdown';

export default {
  name: 'NextSteps',
  components: {
    VueMarkdown,
  },
  props: {
    goalItems: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      nextSteps: '',
      loadingSteps: false,
      errorSteps: '',
    };
  },
  methods: {
    transformToAiItems(goals) {
      return goals.map((goal) => ({
        body: goal.body,
        period: goal.period,
        date: goal.date,
      }));
    },
    async refreshNextSteps() {
      this.loadingSteps = true;
      this.errorSteps = '';
      try {
        const { data } = await this.$apollo.query({
          query: gql`
            query GetGoalsNextSteps($items: [AiItemInput!]!) {
              getGoalsNextSteps(items: $items) {
                nextSteps
              }
            }
          `,
          variables: {
            items: this.transformToAiItems(this.goalItems),
          },
        });
        this.nextSteps = data.getGoalsNextSteps.nextSteps;
      } catch (err) {
        this.errorSteps = 'Failed to generate next steps. Please try again.';
      } finally {
        this.loadingSteps = false;
      }
    },
  },
  watch: {
    goalItems: {
      immediate: true,
      handler(newGoals) {
        if (newGoals && newGoals.length > 0) {
          this.refreshNextSteps();
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
