<template>
  <div :key="`goal-list-${goal.id}-${goal.period}`">
    <div v-for="(goalItem, i) in goal.goalItems" :key="`goalitem-${goalItem.id}-${goal.id}-${goal.period}`">
      <AtomListTile>
        <AtomListTileAction>
          <AtomCheckbox
            :key="`checkbox-${goalItem.id}`"
            v-model="goalItem.isComplete"
            :disabled="passive"
            @input="completeGoalItem(
              goalItem.id,
              goalItem.isComplete,
              goal.period,
              goal.date,
              goalItem.taskRef,
              goalItem.isMilestone,
              goalItem.goalRef,
            )"
          />
        </AtomListTileAction>
        <AtomListTileContent
          @click="completeGoalItemText(goalItem, goal.period, goal.date, goalItem.taskRef)"
        >
        <AtomListTileTitle :class="{ completed: goalItem.isComplete}">
          {{goalItem.body}}
        </AtomListTileTitle>
        <!-- <v-list-tile-sub-title
          v-if="goalItem.isMilestone"
        >
          The goal is a milestone
        </v-list-tile-sub-title> -->
        </AtomListTileContent>
        <AtomListTileAction v-if="goalItem.subTasks && goalItem.subTasks.length > 0">
          <div class="subtask-counter">
            {{ getSubTasksProgress(goalItem.subTasks) }}
          </div>
        </AtomListTileAction>

        <!-- Edit button for week and month goals -->
        <AtomListTileAction v-if="editMode && (goal.period === 'week' || goal.period === 'month')">
          <AtomButton
            flat
            icon
            :disabled="passive"
            @click="editGoalItem(goalItem, goal.period, goal.date)"
            :title="`Edit ${goal.period} goal`"
          >
            <AtomIcon>edit</AtomIcon>
          </AtomButton>
        </AtomListTileAction>

        <!-- Edit button for other periods (original behavior) -->
        <AtomListTileAction v-else-if="editMode">
          <AtomButton
            flat
            icon
            :disabled="passive"
            @click="editGoalItem(goalItem, goal.period, goal.date)"
          >
            <AtomIcon>edit</AtomIcon>
          </AtomButton>
        </AtomListTileAction>

        <AtomListTileAction v-if="lastCompleteItemId === goalItem.id && animateEntry">
          <div style="width: 150px">
            <streak-checks :progress="progress || 0" :animate="true"></streak-checks>
          </div>
        </AtomListTileAction>

        <!-- Delete button - always show for week and month when not animating -->
        <AtomListTileAction v-else-if="goal.period === 'week' || goal.period === 'month'">
          <AtomButton
            flat
            icon
            :disabled="passive"
            @click="deleteGoalItem(i, goal.period, goal.date)"
          >
            <AtomIcon>delete</AtomIcon>
          </AtomButton>
        </AtomListTileAction>

        <!-- Delete button for other periods (original behavior) -->
        <AtomListTileAction v-else>
          <AtomButton
            flat
            icon
            :disabled="passive"
            @click="deleteGoalItem(i, goal.period, goal.date)"
          >
            <AtomIcon>delete</AtomIcon>
          </AtomButton>
        </AtomListTileAction>
      </AtomListTile>

      <!-- Subtasks as direct sublist -->
      <div v-if="goalItem.subTasks && goalItem.subTasks.length > 0"
           :key="`subtasks-${goalItem.id}`"
           class="subtasks-container">
        <AtomList dense class="py-0">
          <div v-for="subTask in goalItem.subTasks" :key="`subtask-${subTask.id}-${goalItem.id}`">
            <AtomListTile class="subtask-item">
              <AtomListTileAction class="ml-4">
                <AtomCheckbox
                  :key="`checkbox-${subTask.id}-${subTask.isComplete}`"
                  :value="subTask.isComplete"
                  :disabled="passive"
                  @click.stop="handleSubTaskClick(subTask.id, goalItem)"
                  dense
                />
              </AtomListTileAction>
              <AtomListTileContent>
                <AtomListTileTitle :class="{ completed: subTask.isComplete, 'subtask-title': true }">
                  {{ subTask.body }}
                </AtomListTileTitle>
              </AtomListTileContent>
            </AtomListTile>
          </div>
        </AtomList>
      </div>
    </div>
  </div>
</template>
<script>
import taskStatusMixin from '@/composables/useTaskStatus';
import StreakChecks from '../../molecules/StreakChecks/StreakChecks.vue';
import {
  AtomButton,
  AtomCheckbox,
  AtomIcon,
  AtomList,
  AtomListTile,
  AtomListTileAction,
  AtomListTileContent,
  AtomListTileTitle,
} from '../../atoms';

export default {
  name: 'OrganismGoalItemList',
  props: ['goal', 'editMode', 'newGoalItem', 'progress', 'passive'],
  components: {
    AtomButton,
    AtomCheckbox,
    AtomIcon,
    AtomList,
    AtomListTile,
    AtomListTileAction,
    AtomListTileContent,
    AtomListTileTitle,
    StreakChecks,
  },
  mixins: [taskStatusMixin],
  data() {
    return {
      show: true,
      newGoalItemBody: '',
      animateEntry: false,
      lastCompleteItemId: '',
      pendingSubTaskUpdates: new Set(), // Track pending subtask updates
    };
  },
  computed: {
    goalItems() {
      return this.goal && this.goal.goalItems ? this.goal.goalItems : [];
    },
    componentKey() {
      // Create a stable key for this component instance
      return `goal-list-${this.goal.id || 'new'}-${this.goal.period || 'unknown'}`;
    },
  },
  methods: {
    getSubTasksProgress(subTasks) {
      if (!subTasks || subTasks.length === 0) {
        return '';
      }

      const completed = subTasks.filter((subTask) => subTask.isComplete).length;
      const total = subTasks.length;
      return `${completed}/${total} subtasks completed`;
    },
    handleSubTaskClick(subTaskId, goalItem) {
      // Don't proceed if component is in passive state
      if (this.passive) {
        console.log('Component is passive, ignoring subtask click');
        return;
      }

      console.log('handleSubTaskClick called:', { subTaskId });

      const subTask = goalItem.subTasks.find((st) => st.id === subTaskId);
      if (!subTask) {
        console.error('SubTask not found:', subTaskId);
        return;
      }

      // Check if update is already pending
      if (this.pendingSubTaskUpdates.has(subTaskId)) {
        console.log('Update already pending for subtask:', subTaskId);
        return;
      }

      // Toggle the current value
      const newValue = !subTask.isComplete;
      console.log('SubTask toggling from:', subTask.isComplete, 'to:', newValue);

      // Immediately update the UI for better responsiveness
      this.$set(subTask, 'isComplete', newValue);

      // Sync with the server
      this.completeSubTask(subTaskId, newValue, goalItem);
    },
    completeSubTask(subTaskId, isComplete, goalItem) {
      console.log('completeSubTask called:', {
        subTaskId,
        isComplete,
        goalItemId: goalItem.id,
        taskRef: goalItem.taskRef,
        goalPeriod: this.goal.period,
        goalDate: this.goal.date,
        goalItem,
      });

      // Prevent double calls
      if (this.pendingSubTaskUpdates.has(subTaskId)) {
        console.log('Update already pending for subtask:', subTaskId);
        return;
      }

      // Find the subtask to update
      const subTask = goalItem.subTasks.find((st) => st.id === subTaskId);
      if (!subTask) {
        console.error('SubTask not found in completeSubTask:', subTaskId);
        return;
      }

      // Store the original value for rollback
      const originalValue = subTask.isComplete;
      console.log('Original value:', originalValue, 'New value:', isComplete);

      // Validate required parameters
      if (!subTaskId) {
        console.error('Missing subTaskId');
        return;
      }
      if (!goalItem.id) {
        console.error('Missing goalItem.id');
        return;
      }
      if (!this.goal.period) {
        console.error('Missing goal.period');
        return;
      }
      if (!this.goal.date) {
        console.error('Missing goal.date');
        return;
      }

      // Add to pending updates
      this.pendingSubTaskUpdates.add(subTaskId);

      // Emit event with all data needed for mutation - parent handles GraphQL
      this.$emit('complete-sub-task', {
        id: subTaskId,
        taskId: goalItem.id,
        period: this.goal.period,
        date: this.goal.date,
        isComplete: Boolean(isComplete),
        subTask,
        originalValue,
        onSuccess: (result) => {
          console.log('Mutation successful:', result);
          // Remove from pending updates
          this.pendingSubTaskUpdates.delete(subTaskId);
          // Ensure UI matches server response if different
          if (result && subTask.isComplete !== result.isComplete) {
            this.$set(subTask, 'isComplete', result.isComplete);
          }
          // Force update to refresh the subtask progress counter
          this.$forceUpdate();
          // Emit event to parent to potentially refresh data
          this.$emit('subtask-updated', { subTaskId, isComplete, goalItem });
        },
        onError: () => {
          console.error('Mutation error in parent');
          // Remove from pending updates
          this.pendingSubTaskUpdates.delete(subTaskId);
          // Revert the change on error using $set to ensure reactivity
          this.$set(subTask, 'isComplete', originalValue);
        },
      });
    },
    deleteGoalItem(index, period, date) {
      // Validate that goalItems exists and index is valid
      if (!this.goal || !this.goal.goalItems || !this.goal.goalItems[index]) {
        console.error('Cannot delete goal item: invalid goal data or index', {
          hasGoal: !!this.goal,
          hasGoalItems: !!(this.goal && this.goal.goalItems),
          index,
          goalItemsLength: this.goal?.goalItems?.length,
        });
        return;
      }

      const { id } = this.goal.goalItems[index];
      if (!id) {
        console.error('Cannot delete goal item: missing id');
        return;
      }

      // Validate period and date are present
      if (!period || !date) {
        console.error('Cannot delete goal item: missing period or date', {
          period,
          date,
          goalPeriod: this.goal?.period,
          goalDate: this.goal?.date,
        });
        return;
      }

      // Emit event with all data needed for mutation - parent handles GraphQL
      // Apollo cache optimistic update handles instant UI removal
      this.$emit('delete-task-goal', { id, period, date });
    },
    completeGoalItemText(goalItem, period, date) {
      // eslint-disable-next-line no-param-reassign
      goalItem.period = period;
      // eslint-disable-next-line no-param-reassign
      goalItem.date = date;
      this.$emit('toggle-goal-display-dialog', goalItem, true);
    },
    completeGoalItem(id, isComplete, period, date, taskRef, isMilestone, goalRef) {
      // Don't proceed if component is in passive state
      if (this.passive) {
        console.log('Component is passive, ignoring goal item completion');
        return;
      }

      console.log('[GoalItemList] completeGoalItem called:', {
        id, isComplete, period, date, taskRef, isMilestone, goalRef,
      });

      this.lastCompleteItemId = id;

      // Emit event with all data needed for mutation - parent handles GraphQL
      this.$emit('complete-goal-item', {
        id,
        period,
        date,
        taskRef,
        isComplete: Boolean(isComplete),
        isMilestone: Boolean(isMilestone),
        goalRef,
        onSuccess: () => {
          this.$emit('refresh-task-goal', goalRef);
        },
      });
    },
    editGoalItem(goalItem, period, date) {
      this.$emit('update-new-goal-item', goalItem, period, date);
    },
    // Method to reset component state (can be called from parent)
    resetState() {
      this.lastCompleteItemId = '';
      this.animateEntry = false;
      this.pendingSubTaskUpdates.clear();
      console.log('GoalItemList state reset');
    },
  },
  watch: {
    // Watch for goal changes and reset local state if needed
    'goal.id': function watchGoalId(newId, oldId) {
      if (newId !== oldId && newId && oldId) {
        console.log('GoalItemList: Goal ID changed, resetting state', { newId, oldId });
        this.resetState();
      }
    },
    // Watch for goal period changes
    'goal.period': function watchGoalPeriod(newPeriod, oldPeriod) {
      if (newPeriod !== oldPeriod && newPeriod && oldPeriod) {
        console.log('GoalItemList: Goal period changed, resetting state', { newPeriod, oldPeriod });
        this.resetState();
      }
    },
    // Watch for goal date changes
    'goal.date': function watchGoalDate(newDate, oldDate) {
      if (newDate !== oldDate && newDate && oldDate) {
        console.log('GoalItemList: Goal date changed, resetting state', { newDate, oldDate });
        this.resetState();
      }
    },
    // Watch for passive state changes
    passive(newVal, oldVal) {
      if (newVal !== oldVal) {
        console.log('GoalItemList: Passive state changed', { newVal, oldVal });
        // Clear any pending operations when passive state changes
        if (newVal) {
          this.pendingSubTaskUpdates.clear();
        }
      }
    },
    progress(val, oldVal) {
      if (val !== oldVal) {
        this.animateEntry = true;
        setTimeout(() => { this.animateEntry = false; }, 2000);
      }
    },
  },
  created() {
    console.log('GoalItemList created:', {
      goalId: this.goal.id,
      goalPeriod: this.goal.period,
      goalDate: this.goal.date,
      passive: this.passive,
    });
  },
  beforeDestroy() {
    console.log('GoalItemList being destroyed:', {
      goalId: this.goal.id,
      pendingUpdates: this.pendingSubTaskUpdates.size,
    });
    // Clear any pending updates when component is destroyed
    this.pendingSubTaskUpdates.clear();
  },
};
</script>

<style>
  .completed {
    text-decoration: line-through;
  }
  .v-list__group__items--no-action .v-list__tile {
    padding-left: 16px;
  }

  /* Subtask counter styling */
  .subtask-counter {
    font-size: 0.75rem;
    color: #757575;
    background-color: #f5f5f5;
    border-radius: 12px;
    padding: 4px 8px;
    min-width: 60px;
    text-align: center;
    white-space: nowrap;
  }

  /* Subtask styling */
  .subtasks-container {
    margin-bottom: 8px;
    border-radius: 4px;
  }

  .subtask-item {
    min-height: 36px !important;
    padding: 2px 0 !important;
  }

  .subtask-title {
    font-size: 0.875rem !important;
    color: #546e7a !important;
    font-weight: 400 !important;
  }

  .subtask-title.completed {
    color: #90a4ae !important;
  }

  /* Week and month goal action buttons styling */
  .v-list__tile .v-btn--icon.primary--text {
    background-color: rgba(33, 150, 243, 0.1);
  }

  .v-list__tile .v-btn--icon.primary--text:hover {
    background-color: rgba(33, 150, 243, 0.2);
  }
</style>
