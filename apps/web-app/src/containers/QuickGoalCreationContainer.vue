<template>
  <QuickGoalCreation
    :goals="goals"
    :selectedBody="selectedBody"
    :date="date"
    :period="period"
    :tasklist="tasklist"
    :goalDetailsDialog="goalDetailsDialog"
    :selectedTaskRef="selectedTaskRef"
    :goalItemsRef="goalItemsRef"
    :relatedTasks="relatedTasks"
    :loading="loading"
    :buttonLoading="buttonLoading"
    @add-goal-item="addGoalItem"
    @goal-ref-changed="updateCurrentGoalRef"
    @start-quick-goal-task="(task) => $emit('start-quick-goal-task', task)"
  />
</template>

<script>
import QuickGoalCreation from '@routine-notes/ui/organisms/QuickGoalCreation/QuickGoalCreation.vue';
import { GOALS_BY_GOAL_REF_QUERY } from '../composables/useGoalQueries';
import { stepupMilestonePeriodDate, periodGoalDates } from '../utils/getDates';
import eventBus, { EVENTS } from '../utils/eventBus';

const ADD_GOAL_ITEM_TIMEOUT_MS = 12000;

export default {
  name: 'QuickGoalCreationContainer',
  components: {
    QuickGoalCreation,
  },
  props: {
    goals: {
      type: Array,
      default: () => [],
    },
    selectedBody: {
      type: String,
      default: '',
    },
    date: {
      type: String,
      default: '',
    },
    period: {
      type: String,
      default: '',
    },
    tasklist: {
      type: Array,
      default: () => [],
    },
    goalDetailsDialog: {
      type: Boolean,
      default: false,
    },
    selectedTaskRef: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      goalItemsRef: [],
      goalItems: [],
      relatedGoalsData: [],
      loading: true,
      buttonLoading: false,
      currentGoalRef: '',
    };
  },
  apollo: {
    relatedGoalsData: {
      query: GOALS_BY_GOAL_REF_QUERY,
      variables() {
        return { goalRef: this.currentGoalRef };
      },
      skip() {
        return !this.currentGoalRef;
      },
      update(data) {
        return data && data.goalsByGoalRef ? data.goalsByGoalRef : [];
      },
    },
  },
  watch: {
    period: {
      immediate: true,
      handler() {
        this.fetchGoalItemsRef();
      },
    },
    date: {
      immediate: true,
      handler() {
        this.fetchGoalItemsRef();
      },
    },
  },
  computed: {
    relatedTasks() {
      if (!this.currentGoalRef || !this.relatedGoalsData || !Array.isArray(this.relatedGoalsData)) {
        return [];
      }

      const tasks = [];
      this.relatedGoalsData.forEach((goal) => {
        if (goal.goalItems && Array.isArray(goal.goalItems)) {
          goal.goalItems.forEach((goalItem) => {
            if (goalItem.goalRef === this.currentGoalRef) {
              tasks.push({
                id: goalItem.id,
                body: goalItem.body,
                date: goal.date,
                period: goal.period,
                isComplete: goalItem.isComplete,
                goalRef: goalItem.goalRef,
                taskRef: goalItem.taskRef,
                tags: goalItem.tags || [],
              });
            }
          });
        }
      });

      return tasks
        .sort((a, b) => {
          if (!a.time) return 1;
          if (!b.time) return -1;
          return a.time.localeCompare(b.time);
        })
        .slice(0, 10);
    },
  },
  methods: {
    async addGoalItemWithTimeout(payload) {
      let timeoutId;
      const timeoutPromise = new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => {
          const timeoutError = new Error('addGoalItem request timed out');
          timeoutError.code = 'ADD_GOAL_ITEM_TIMEOUT';
          reject(timeoutError);
        }, ADD_GOAL_ITEM_TIMEOUT_MS);
      });

      try {
        return await Promise.race([
          this.$goals.addGoalItem(payload),
          timeoutPromise,
        ]);
      } finally {
        clearTimeout(timeoutId);
      }
    },
    /**
     * Fetch goal items for the parent period using shared composable
     */
    async fetchGoalItemsRef() {
      if (!this.period || !this.date) return;

      this.loading = true;
      try {
        const stepUp = stepupMilestonePeriodDate(this.period, this.date);
        const data = await this.$goals.fetchGoalDatePeriod(stepUp.period, stepUp.date, {
          useCache: true,
        });

        if (data && data.goalItems) {
          this.goalItems = data.goalItems;
          // Pass raw goalItems - GoalRefSelector molecule handles grouping
          this.goalItemsRef = data.goalItems;
        } else {
          this.goalItems = [];
          this.goalItemsRef = [];
        }
      } catch (error) {
        console.error('Error fetching goal items ref:', error);
        this.goalItems = [];
        this.goalItemsRef = [];
      } finally {
        this.loading = false;
      }
    },

    getGoal(period, date) {
      const goal = this.goals.find((aGoal) => aGoal.period === period && aGoal.date === date);
      if (!goal) {
        const newGoal = {
          id: `${Math.random()}`,
          period,
          date,
          goalItems: [],
        };
        this.goals.push(newGoal);
        return newGoal;
      }
      return goal;
    },
    /**
     * Add goal item using shared composable
     */
    async addGoalItem(newGoalItem) {
      this.buttonLoading = true;
      const value = newGoalItem.body && newGoalItem.body.trim();
      const date = periodGoalDates(this.period, this.date);
      const goal = this.getGoal(this.period, date);

      if (!value) {
        this.buttonLoading = false;
        return;
      }

      // Update currentGoalRef for related tasks query
      this.currentGoalRef = newGoalItem.goalRef;

      try {
        const addedItem = await this.addGoalItemWithTimeout({
          body: newGoalItem.body,
          period: this.period,
          date,
          isComplete: false,
          isMilestone: !!newGoalItem.goalRef || newGoalItem.isMilestone,
          goalRef: newGoalItem.goalRef,
          taskRef: newGoalItem.taskRef,
          tags: newGoalItem.tags,
          originalDate: newGoalItem.originalDate || null,
        });

        if (addedItem) {
          goal.goalItems.push({
            id: addedItem.id,
            body: newGoalItem.body,
            isMilestone: !!newGoalItem.goalRef || newGoalItem.isMilestone,
            isComplete: false,
            goalRef: newGoalItem.goalRef,
            taskRef: newGoalItem.taskRef,
            tags: [...newGoalItem.tags],
          });

          const task = this.tasklist ? this.tasklist.find((taskItem) => taskItem.id === newGoalItem.taskRef || taskItem.taskId === newGoalItem.taskRef) : null;
          this.$emit('start-quick-goal-task', task);

          // Emit event to notify Dashboard about the new goal item
          eventBus.$emit(EVENTS.GOAL_ITEM_CREATED, {
            goalId: addedItem.id,
            goalRef: addedItem.goalRef,
            taskRef: addedItem.taskRef,
            body: addedItem.body,
          });
        }
      } catch (error) {
        console.error('Error adding goal item:', error);
        this.$notify({
          title: 'Error',
          text: error.code === 'ADD_GOAL_ITEM_TIMEOUT'
            ? 'Add item timed out. Please try again.'
            : 'An unexpected error occurred',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      } finally {
        this.buttonLoading = false;
      }
    },
    updateCurrentGoalRef(goalRef) {
      this.currentGoalRef = goalRef;
    },
  },
};
</script>
