<template>
  <AiSearchModal
    :value="value"
    :open-mode="openMode"
    :goalItemsRef="goalItemsRef"
    :relatedGoalsData="relatedGoalsData"
    :routines="routines"
    :tasklist="tasklist"
    @input="$emit('input', $event)"
    @refetch-related-goals="handleRefetchRelatedGoals"
    @refetch-goal-items-ref="handleRefetchGoalItemsRef"
    @period-above-changed="handlePeriodAboveChanged"
    @direct-task-create="handleDirectTaskCreate"
  />
</template>

<script>
import moment from 'moment';
import AiSearchModal from '../components/organisms/AiSearchModal/AiSearchModal.vue';
import { stepupMilestonePeriodDate } from '../utils/getDates';
import { GOAL_DATE_PERIOD_QUERY, GOALS_BY_GOAL_REF_QUERY } from '../composables/graphql/queries';
import eventBus, { EVENTS } from '../utils/eventBus';

export default {
  name: 'AiSearchModalContainer',
  components: {
    AiSearchModal,
  },
  props: {
    value: {
      type: Boolean,
      required: true,
    },
    openMode: {
      type: String,
      default: 'add',
    },
  },
  data() {
    return {
      activeGoalRef: '',
      currentParentPeriodData: null,
    };
  },
  computed: {
    // Get routine tasks from $currentTaskList - transformed for GoalTaskSelector
    routines() {
      if (!this.$currentTaskList || !Array.isArray(this.$currentTaskList)) {
        return [];
      }

      return this.$currentTaskList.map((task) => ({
        id: task.id,
        name: task.name || task.body || task.title || 'Unnamed Task',
        time: task.time || null,
        tags: task.tags || [],
      }));
    },

    // Raw tasklist for GoalRefSelector grouping (uses 'id' property)
    tasklist() {
      return this.$currentTaskList || [];
    },

    /**
     * Compute period data for goalItemsRef query (parent period goals)
     *
     * MILESTONE PERIOD HIERARCHY:
     * This computed property calculates which parent period goals to fetch
     * for milestone linking options using stepupMilestonePeriodDate().
     *
     * Priority order:
     * 1. currentParentPeriodData: Set when period changes in toolbar
     *    (from AiSearchModal's fetchGoalsForPeriod → period-above-changed event)
     *
     * 2. $currentTaskData: When user is working on a task
     *    - Uses stepupMilestonePeriodDate to step up from task's period
     *    - Example: day task → fetch week goals
     *
     * 3. Default fallback: week goals (Friday of current week)
     *    - Used when no task context exists
     *
     * Period step-up examples:
     * - day    → week:     Fetch week goals ending Friday
     * - week   → month:    Fetch month goals ending last day of month
     * - month  → year:     Fetch year goals ending Dec 31
     * - year   → lifetime: Fetch lifetime goals (01-01-1970)
     *
     * This ensures the goalRef dropdown always shows appropriate parent goals
     * for the current context.
     */
    goalRefPeriodData() {
      // If we have specific parent period data from the form, use it
      if (this.currentParentPeriodData) {
        return {
          period: this.currentParentPeriodData.period,
          date: this.currentParentPeriodData.date,
        };
      }

      // For task mode, calculate based on current task date and period
      if (this.$currentTaskData) {
        // If current task has period and date, step up to parent period
        const taskPeriod = this.$currentTaskData.period || 'day';
        const taskDate = this.$currentTaskData.date || moment().format('DD-MM-YYYY');
        return stepupMilestonePeriodDate(taskPeriod, taskDate);
      }

      // Default fallback to week goals
      const friday = moment().day(5); // Friday
      return {
        period: 'week',
        date: friday.format('DD-MM-YYYY'),
      };
    },
  },
  apollo: {
    // Query for goals in the period above (used for milestone linking)
    goalItemsRef: {
      query: GOAL_DATE_PERIOD_QUERY,
      variables() {
        return this.goalRefPeriodData;
      },
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        return data.goalDatePeriod && data.goalDatePeriod.date ? data.goalDatePeriod.goalItems : [];
      },
    },

    // Query for related goals data (used when a goal is selected as milestone)
    relatedGoalsData: {
      query: GOALS_BY_GOAL_REF_QUERY,
      variables() {
        return { goalRef: this.activeGoalRef || '' };
      },
      skip() {
        if (!this.$root.$data.email) return true;
        return !this.activeGoalRef;
      },
      update(data) {
        return data && data.goalsByGoalRef ? data.goalsByGoalRef : [];
      },
    },
  },
  watch: {
    '$root.$data.email': function watchUserEmail(newEmail, oldEmail) {
      if ((!oldEmail && newEmail) || (oldEmail && newEmail && oldEmail !== newEmail)) {
        this.refreshApolloQueries();
      }
    },
  },
  methods: {
    handleRefetchRelatedGoals(goalRef = '') {
      if (goalRef) {
        this.activeGoalRef = goalRef;
      }
      if (this.$apollo && this.$apollo.queries && this.$apollo.queries.relatedGoalsData) {
        this.$apollo.queries.relatedGoalsData.refetch();
      }
    },

    handleRefetchGoalItemsRef() {
      if (this.$apollo.queries.goalItemsRef) {
        this.$apollo.queries.goalItemsRef.refetch();
      }
    },

    /**
     * Handle period change from child modal (auto-switch feature)
     *
     * EVENT FLOW:
     * 1. User types query like "learn Python this week"
     * 2. AiSearchModal detects "week" keyword
     * 3. Auto-switches period to 'week'
     * 4. Calls fetchGoalsForPeriod('week')
     * 5. Emits 'period-above-changed' with { period: 'month', date: '28-02-2026' }
     * 6. THIS METHOD receives the event
     * 7. Updates currentParentPeriodData (used by goalRefPeriodData computed)
     * 8. Refetches goalItemsRef GraphQL query with NEW parent period
     * 9. Modal receives MONTH goals for milestone selection
     *
     * This enables intelligent milestone options based on detected period.
     *
     * @param {Object} data - Parent period data { period: string, date: string }
     */
    handlePeriodAboveChanged(data) {
      this.currentParentPeriodData = data;
      this.handleRefetchGoalItemsRef();
    },

    refreshApolloQueries() {
      this.$apollo.queries.goalItemsRef.refetch();
      if (!this.$apollo.queries.relatedGoalsData.skip) {
        this.$apollo.queries.relatedGoalsData.refetch();
      }
    },

    /**
     * Handle direct task creation (AI Enhanced Task OFF).
     * Creates a goal item immediately without AI processing.
     * @param {Object} goalItemData - The task data to save
     */
    handleDirectTaskCreate(goalItemData) {
      // Close modal immediately
      this.$emit('input', false);

      // Fire mutation in background
      this.$goals.addGoalItem(goalItemData)
        .then((addedItem) => {
          if (addedItem) {
            eventBus.$emit(EVENTS.TASK_CREATED, addedItem);
          }
        })
        .catch((error) => {
          console.error('Error saving direct task:', error);
        });
    },
  },
};
</script>
