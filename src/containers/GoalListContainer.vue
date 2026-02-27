<template>
  <GoalList
    :goals="goals"
    :selectedBody="selectedBody"
    :date="date"
    :period="period"
    :tasklist="tasklist"
    :goalDetailsDialog="goalDetailsDialog"
    :selectedTaskRef="selectedTaskRef"
    :isDefaultMilestone="isDefaultMilestone"
    :goalItemsRef="goalItemsRef"
    :loading="loading"
    :buttonLoading="buttonLoading"
    @add-goal-item="addGoalItem"
    @toggle-goal-details-dialog="(val) => $emit('toggle-goal-details-dialog', val)"
  />
</template>

<script>
import GoalList from '../components/organisms/GoalList/GoalList.vue';
import { stepupMilestonePeriodDate, periodGoalDates } from '../utils/getDates';

export default {
  name: 'GoalListContainer',
  components: {
    GoalList,
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
    isDefaultMilestone: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      goalItemsRef: [],
      goalItems: [],
      loading: true,
      buttonLoading: false,
    };
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
  methods: {
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
      const goal = this.goals.find((aGoal) => aGoal && aGoal.period === period && aGoal.date === date);
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

      try {
        const addedItem = await this.$goals.addGoalItem({
          body: newGoalItem.body,
          period: this.period,
          date,
          isComplete: false,
          isMilestone: newGoalItem.isMilestone,
          goalRef: newGoalItem.isMilestone ? newGoalItem.goalRef : null,
          taskRef: newGoalItem.taskRef,
          tags: newGoalItem.tags,
        });

        if (addedItem) {
          goal.goalItems.push({
            id: addedItem.id,
            body: newGoalItem.body,
            isMilestone: newGoalItem.isMilestone,
            isComplete: false,
            goalRef: newGoalItem.goalRef,
            taskRef: newGoalItem.taskRef,
            tags: [...newGoalItem.tags],
          });
          // Refetch goal items to update the list
          await this.fetchGoalItemsRef();
          this.$emit('toggle-goal-details-dialog', false);
        }
      } catch (error) {
        console.error('Error adding goal item:', error);
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occurred',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      } finally {
        this.buttonLoading = false;
      }
    },
  },
};
</script>
