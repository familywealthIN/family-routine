<template>
  <SummaryCards
    :summary="summary"
    :loading="loading"
    :error="error"
    @refresh="refreshSummary"
  />
</template>

<script>
import gql from 'graphql-tag';
import SummaryCards from '@family-routine/ui/organisms/SummaryCards/SummaryCards.vue';
import { getCachedDashboard, setCachedDashboard } from '../utils/dashboardCache';

export default {
  name: 'SummaryCardsContainer',
  components: {
    SummaryCards,
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
      summary: '',
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
    async refreshSummary() {
      // Check dashboard cache first if tag is provided
      if (this.tag) {
        const cached = getCachedDashboard(this.tag);
        if (cached && cached.description) {
          this.summary = cached.description;
          return;
        }
      }

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
          fetchPolicy: 'network-only',
        });
        this.summary = data.getGoalsSummary.description;

        // Write to dashboard cache if tag provided
        if (this.tag && this.summary) {
          const existingCache = getCachedDashboard(this.tag);
          setCachedDashboard(
            this.tag,
            this.summary,
            existingCache ? existingCache.nextSteps : '',
          );
        }
      } catch (err) {
        this.error = 'Failed to generate summary. Please try again.';
        console.error(this.error, err);
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
