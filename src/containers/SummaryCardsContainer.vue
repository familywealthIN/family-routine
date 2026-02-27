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
import SummaryCards from '../components/organisms/SummaryCards/SummaryCards.vue';

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
