<template>
  <NextSteps
    :nextSteps="nextSteps"
    :loading="loading"
    :error="error"
    @refresh="refreshNextSteps"
  />
</template>

<script>
import gql from 'graphql-tag';
import NextSteps from '@family-routine/ui/organisms/NextSteps/NextSteps.vue';
import { getCachedDashboard, setCachedDashboard } from '../utils/dashboardCache';

export default {
  name: 'NextStepsContainer',
  components: {
    NextSteps,
  },
  props: {
    goalItems: {
      type: Array,
      required: true,
    },
    tag: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      nextSteps: '',
      loading: false,
      error: '',
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
      // Check dashboard cache first if tag is provided
      if (this.tag) {
        const cached = getCachedDashboard(this.tag);
        if (cached && cached.nextSteps) {
          this.nextSteps = cached.nextSteps;
          return;
        }
      }

      this.loading = true;
      this.error = '';
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
          fetchPolicy: 'network-only',
        });
        this.nextSteps = data.getGoalsNextSteps.nextSteps;

        // Write to dashboard cache if tag provided
        if (this.tag && this.nextSteps) {
          const existingCache = getCachedDashboard(this.tag);
          setCachedDashboard(
            this.tag,
            existingCache ? existingCache.description : '',
            this.nextSteps,
          );
        }
      } catch (err) {
        this.error = 'Failed to generate next steps. Please try again.';
        console.error(err);
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
          this.refreshNextSteps();
        }
      },
    },
  },
};
</script>
