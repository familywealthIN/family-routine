<template>
  <GoalCreation
    :newGoalItem="newGoalItem"
    :tasklist="tasklist"
    :goalItemsRef="safeGoalItemsRef"
    :loading="$apollo.loading"
    :buttonLoading="buttonLoading"
    :autoSaveLoading="autoSaveLoading"
    @add-goal-item="handleAddGoalItem"
    @update-goal-item="handleUpdateGoalItem"
    @auto-save-contribution="handleAutoSaveContribution"
    @add-sub-task-item="handleAddSubTaskItem"
    @delete-sub-task-item="handleDeleteSubTaskItem"
    @complete-sub-task-item="handleCompleteSubTaskItem"
    @add-update-goal-entry="$emit('add-update-goal-entry', $event)"
    @trigger-goal-items-ref="triggerGoalItemsRef"
  />
</template>

<script>
import moment from 'moment';
import GoalCreation from '../components/organisms/GoalCreation/GoalCreation.vue';
import { stepupMilestonePeriodDate } from '../utils/getDates';
import eventBus, { EVENTS } from '../utils/eventBus';
import { ROUTINE_DATE_QUERY, GOAL_DATE_PERIOD_QUERY } from '../composables/graphql/queries';

export default {
  name: 'GoalCreationContainer',
  components: {
    GoalCreation,
  },
  props: {
    newGoalItem: {
      type: Object,
      required: true,
    },
  },
  apollo: {
    tasklist: {
      query: ROUTINE_DATE_QUERY,
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        return data.routineDate && data.routineDate.date ? data.routineDate.tasklist : [];
      },
      variables() {
        return {
          date: moment().format('DD-MM-YYYY'),
        };
      },
    },
    goalItemsRef: {
      query: GOAL_DATE_PERIOD_QUERY,
      skip() {
        return !this.$root.$data.email || this.skipQuery;
      },
      update(data) {
        console.log('goalItemsRef Apollo update:', {
          hasGoalDatePeriod: !!data.goalDatePeriod,
          hasDate: data.goalDatePeriod ? !!data.goalDatePeriod.date : false,
          date: data.goalDatePeriod ? data.goalDatePeriod.date : null,
          goalItemsCount: data.goalDatePeriod && data.goalDatePeriod.goalItems
            ? data.goalDatePeriod.goalItems.length
            : 0,
          fullData: data,
        });
        // Return goalItems if they exist, regardless of date field
        // The date field might not always be returned by the query
        return data.goalDatePeriod && data.goalDatePeriod.goalItems
          ? data.goalDatePeriod.goalItems
          : [];
      },
      variables() {
        // CRITICAL: Guard against empty date values
        // Apollo calls variables() even when skipQuery is true
        // If date is empty/invalid, return safe defaults to prevent "Invalid date" errors
        const { period, date } = this.newGoalItem || {};

        if (!period || !date || date === '' || date === '01-01-1970') {
          return {
            period: 'year', // Safe default
            date: '31-12-2026', // Safe default
          };
        }

        // CRITICAL: this.newGoalItem.date is ALWAYS DD-MM-YYYY format
        // DateSelector emits DD-MM-YYYY for all period types (day/week/month/year)
        // No conversion needed - stepupMilestonePeriodDate expects DD-MM-YYYY
        console.log('goalItemsRef variables:', {
          period: this.newGoalItem.period,
          date: this.newGoalItem.date,
          stepUpResult: stepupMilestonePeriodDate(this.newGoalItem.period, this.newGoalItem.date),
        });
        return {
          ...stepupMilestonePeriodDate(this.newGoalItem.period, this.newGoalItem.date),
        };
      },
    },
  },
  data() {
    return {
      skipQuery: true,
      buttonLoading: false,
      autoSaveLoading: false,
      // Track previous values to avoid redundant fetches
      lastFetchedPeriod: null,
      lastFetchedDate: null,
    };
  },
  computed: {
    // Ensure goalItemsRef is always an array (Apollo may return undefined when query is skipped)
    safeGoalItemsRef() {
      return Array.isArray(this.goalItemsRef) ? this.goalItemsRef : [];
    },
  },
  watch: {
    '$root.$data.email': function watchUserEmail(newEmail, oldEmail) {
      if ((!oldEmail && newEmail) || (oldEmail && newEmail && oldEmail !== newEmail)) {
        this.refreshApolloQueries();
      }
    },
    // Watch newGoalItem period and date to auto-fetch goalItemsRef
    'newGoalItem.period': function watchPeriod(newVal) {
      // If period is cleared, reset container state
      if (!newVal || newVal === '') {
        this.skipQuery = true;
        this.lastFetchedPeriod = null;
        this.lastFetchedDate = null;
      } else {
        this.checkAndFetchGoalItemsRef();
      }
    },
    'newGoalItem.date': function watchDate() {
      this.checkAndFetchGoalItemsRef();
    },
  },
  mounted() {
    // Check on mount in case newGoalItem already has period and date (e.g., editing existing item)
    this.checkAndFetchGoalItemsRef();
  },
  methods: {
    /**
     * REMOVED: convertPeriodDateToDDMMYYYY method
     *
     * No longer needed because DateSelector ALWAYS emits DD-MM-YYYY format.
     * All date values in the application are stored as DD-MM-YYYY regardless of period type.
     * Display formatting is handled by moment.js in UI components (DateSelector's displayValue).
     *
     * This eliminates "Invalid date" errors and simplifies date handling throughout the app.
     */

    checkAndFetchGoalItemsRef() {
      const { period, date } = this.newGoalItem || {};
      // Only fetch if we have valid period and date, and it's not lifetime (which uses fake date)
      if (period && date && date !== '01-01-1970' && date !== '') {
        // Avoid redundant fetches if period and date haven't changed
        if (this.lastFetchedPeriod !== period || this.lastFetchedDate !== date) {
          this.lastFetchedPeriod = period;
          this.lastFetchedDate = date;
          this.triggerGoalItemsRef();
        }
      }
    },
    triggerGoalItemsRef() {
      this.skipQuery = false;
      this.$apollo.queries.goalItemsRef.refetch();
    },

    refreshApolloQueries() {
      try {
        if (this.$apollo.queries.tasklist) {
          this.$apollo.queries.tasklist.refetch();
        }
        if (this.$apollo.queries.goalItemsRef) {
          this.$apollo.queries.goalItemsRef.refetch();
        }
        console.log('GoalCreationContainer: Apollo queries refreshed successfully');
      } catch (error) {
        console.warn('GoalCreationContainer: Error refreshing Apollo queries:', error);
      }
    },

    async handleAddGoalItem(goalData, callbacks = {}) {
      const {
        body = '',
        period,
        date,
        deadline = '',
        contribution = '',
        reward = '',
        isComplete = false,
        isMilestone = false,
        taskRef = '',
        goalRef = '',
        tags = [],
        originalDate = null,
      } = goalData;

      if (!body) {
        return;
      }

      this.buttonLoading = true;

      try {
        const addGoalItem = await this.$goals.addGoalItem({
          body,
          period,
          date,
          deadline: deadline || '',
          contribution: contribution || '',
          reward: reward || '',
          isComplete: isComplete || false,
          isMilestone: isMilestone || false,
          taskRef: taskRef || '',
          goalRef: goalRef || '',
          tags,
          originalDate: originalDate || null,
        });
        const goalItem = {
          ...goalData,
          id: addGoalItem.id,
        };

        this.$emit('add-update-goal-entry', goalItem, false);

        // Emit event to notify Dashboard about the new goal item
        eventBus.$emit(EVENTS.GOAL_ITEM_CREATED, {
          goalId: addGoalItem.id,
          goalRef: goalData.goalRef,
          taskRef: goalData.taskRef,
          body: goalData.body,
        });

        if (callbacks.onSuccess) callbacks.onSuccess(goalItem);
      } catch (error) {
        console.error('Error adding goal item:', error);
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occurred',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
        if (callbacks.onError) callbacks.onError(error);
      } finally {
        this.buttonLoading = false;
      }
    },

    async handleUpdateGoalItem(goalData, callbacks = {}) {
      const {
        id,
        body = '',
        period,
        date,
        deadline = '',
        contribution = '',
        reward = '',
        isMilestone = false,
        taskRef = '',
        goalRef = '',
        tags = [],
      } = goalData;

      if (!body) {
        return;
      }

      this.buttonLoading = true;

      try {
        const updateGoalItem = await this.$goals.updateGoalItem({
          id,
          body,
          period,
          date,
          deadline: deadline || '',
          contribution: contribution || '',
          reward: reward || '',
          isMilestone: isMilestone || false,
          taskRef: taskRef || '',
          goalRef: goalRef || '',
          tags,
        });
        const goalItem = {
          ...goalData,
          id: updateGoalItem.id,
        };

        this.$emit('add-update-goal-entry', goalItem, false);
        if (callbacks.onSuccess) callbacks.onSuccess(goalItem);
      } catch (error) {
        console.error('Error updating goal item:', error);
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occurred',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
        if (callbacks.onError) callbacks.onError(error);
      } finally {
        this.buttonLoading = false;
      }
    },

    async handleAutoSaveContribution(id, contribution) {
      if (!id || this.autoSaveLoading) {
        return;
      }

      this.autoSaveLoading = true;

      try {
        await this.$goals.updateContribution(id, contribution || '');

        this.$emit('contribution-saved', contribution);

        this.$store.dispatch('showSnackbar', {
          message: 'Contribution auto-saved',
          color: 'success',
          timeout: 2000,
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
        this.$store.dispatch('showSnackbar', {
          message: 'Auto-save failed. Please save manually.',
          color: 'warning',
          timeout: 3000,
        });
      } finally {
        this.autoSaveLoading = false;
      }
    },

    async handleAddSubTaskItem(payload) {
      const {
        taskId, body, period, date, isComplete, onSuccess, onError,
      } = payload;

      try {
        const result = await this.$goals.addSubTaskItem({
          taskId,
          body,
          period,
          date,
          isComplete,
        });

        if (onSuccess) onSuccess(result);
      } catch (error) {
        if (onError) onError(error);
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occurred',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      }
    },

    async handleDeleteSubTaskItem(payload) {
      const {
        id, taskId, period, date,
      } = payload;

      try {
        await this.$goals.deleteSubTaskItem({
          id,
          taskId,
          period,
          date,
        });
      } catch (error) {
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occurred',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      }
    },

    async handleCompleteSubTaskItem(payload) {
      const {
        id, taskId, period, date, isComplete,
      } = payload;

      try {
        await this.$goals.completeSubTaskItem({
          id,
          taskId,
          period,
          date,
          isComplete,
        });
      } catch (error) {
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occurred',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      }
    },
  },
};
</script>
