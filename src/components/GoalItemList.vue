<template>
  <div :key="`goal-list-${goal.id}-${goal.period}`">
    <div v-for="(goalItem, i) in goal.goalItems" :key="`goalitem-${goalItem.id}-${goal.id}-${goal.period}`">
      <v-list-tile>
        <v-list-tile-action>
          <v-checkbox
            :key="`checkbox-${goalItem.id}`"
            v-model="goalItem.isComplete"
            :disabled="passive"
            @change="completeGoalItem(
              goalItem.id,
              goalItem.isComplete,
              goal.period,
              goal.date,
              goalItem.taskRef,
              goalItem.isMilestone,
              goalItem.goalRef,
            )"
          ></v-checkbox>
        </v-list-tile-action>
        <v-list-tile-content
          @click="completeGoalItemText(goalItem, goal.period, goal.date, goalItem.taskRef)"
        >
        <v-list-tile-title :class="{ completed: goalItem.isComplete}">
          {{goalItem.body}}
        </v-list-tile-title>
        <!-- <v-list-tile-sub-title
          v-if="goalItem.isMilestone"
        >
          The goal is a milestone
        </v-list-tile-sub-title> -->
        </v-list-tile-content>
        <v-list-tile-action v-if="goalItem.subTasks && goalItem.subTasks.length > 0">
          <div class="subtask-counter">
            {{ getSubTasksProgress(goalItem.subTasks) }}
          </div>
        </v-list-tile-action>

        <!-- Edit button for week and month goals -->
        <v-list-tile-action v-if="editMode && (goal.period === 'week' || goal.period === 'month')">
          <v-btn
            flat
            icon
            :disabled="passive"
            @click="editGoalItem(goalItem, goal.period, goal.date)"
            :title="`Edit ${goal.period} goal`"
          >
            <v-icon>edit</v-icon>
          </v-btn>
        </v-list-tile-action>

        <!-- Edit button for other periods (original behavior) -->
        <v-list-tile-action v-else-if="editMode">
          <v-btn
            flat
            icon
            :disabled="passive"
            @click="editGoalItem(goalItem, goal.period, goal.date)"
          >
            <v-icon>edit</v-icon>
          </v-btn>
        </v-list-tile-action>

        <v-list-tile-action v-if="lastCompleteItemId === goalItem.id && animateEntry">
          <div style="width: 150px">
            <streak-checks :progress="progress || 0" :animate="true"></streak-checks>
          </div>
        </v-list-tile-action>

        <!-- Delete button - always show for week and month when not animating -->
        <v-list-tile-action v-else-if="goal.period === 'week' || goal.period === 'month'">
          <v-btn
            flat
            icon
            :disabled="passive"
            @click="deleteGoalItem(i, goal.period, goal.date)"
          >
            <v-icon>delete</v-icon>
          </v-btn>
        </v-list-tile-action>

        <!-- Delete button for other periods (original behavior) -->
        <v-list-tile-action v-else>
          <v-btn
            flat
            icon
            :disabled="passive"
            @click="deleteGoalItem(i, goal.period, goal.date)"
          >
            <v-icon>delete</v-icon>
          </v-btn>
        </v-list-tile-action>
      </v-list-tile>

      <!-- Subtasks as direct sublist -->
      <div v-if="goalItem.subTasks && goalItem.subTasks.length > 0"
           :key="`subtasks-${goalItem.id}`"
           class="subtasks-container">
        <v-list dense class="py-0">
          <div v-for="subTask in goalItem.subTasks" :key="`subtask-${subTask.id}-${goalItem.id}`">
            <v-list-tile class="subtask-item">
              <v-list-tile-action class="ml-4">
                <v-checkbox
                  :key="`checkbox-${subTask.id}`"
                  :input-value="subTask.isComplete"
                  :disabled="passive"
                  @click.stop="handleSubTaskClick(subTask.id, goalItem)"
                  @change="() => console.log('Change event fired for subtask:', subTask.id)"
                  dense
                ></v-checkbox>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-title :class="{ completed: subTask.isComplete, 'subtask-title': true }">
                  {{ subTask.body }}
                </v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>
          </div>
        </v-list>
      </div>
    </div>
  </div>
</template>
<script>
import gql from 'graphql-tag';

import taskStatusMixin from '@/composables/useTaskStatus';
import StreakChecks from './StreakChecks.vue';

export default {
  props: ['goal', 'editMode', 'newGoalItem', 'progress', 'passive'],
  components: {
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

      // Update the subtask completion status
      this.$apollo.mutate({
        mutation: gql`
          mutation completeSubTaskItem(
            $id: ID!
            $taskId: ID!
            $period: String!
            $date: String!
            $isComplete: Boolean!
          ) {
            completeSubTaskItem(
              id: $id
              taskId: $taskId
              period: $period
              date: $date
              isComplete: $isComplete
            ) {
              id
              isComplete
            }
          }
        `,
        variables: {
          id: subTaskId,
          taskId: goalItem.id,
          period: this.goal.period,
          date: this.goal.date,
          isComplete: Boolean(isComplete),
        },
        optimisticResponse: {
          __typename: 'Mutation',
          completeSubTaskItem: {
            __typename: 'SubTask',
            id: subTaskId,
            isComplete: Boolean(isComplete),
          },
        },
        update: (store, { data: { completeSubTaskItem } }) => {
          // Server confirmed the change, ensure it matches the UI state
          console.log('Apollo update callback:', completeSubTaskItem);
          // Only update if the server response differs from current state
          if (subTask.isComplete !== completeSubTaskItem.isComplete) {
            this.$set(subTask, 'isComplete', completeSubTaskItem.isComplete);
          }
          // Also update the counter immediately
          this.$forceUpdate();
        },
      })
        .then((result) => {
          console.log('Mutation successful:', result);
          // Remove from pending updates
          this.pendingSubTaskUpdates.delete(subTaskId);
          // Force update to refresh the subtask progress counter
          this.$forceUpdate();
          // Emit event to parent to potentially refresh data
          this.$emit('subtask-updated', { subTaskId, isComplete, goalItem });
        })
        .catch((error) => {
          console.error('Mutation error:', error);
          // Remove from pending updates
          this.pendingSubTaskUpdates.delete(subTaskId);
          // Revert the change on error using $set to ensure reactivity
          this.$set(subTask, 'isComplete', originalValue);
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occurred while updating subtask',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },
    deleteGoalItem(index, period, date) {
      const { id } = this.goal.goalItems[index];
      this.goal.goalItems.splice(index, 1);
      this.$emit('delete-task-goal', id);

      this.$apollo.mutate({
        mutation: gql`
          mutation deleteGoalItem(
            $id: ID!
            $period: String!
            $date: String!
          ) {
            deleteGoalItem(
              id: $id
              period: $period
              date: $date
            ) {
              id
            }
          }
        `,
        variables: {
          id,
          period,
          date,
        },
      }).catch(() => {
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occured',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      });
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

      this.lastCompleteItemId = id;
      this.$apollo.mutate({
        mutation: gql`
          mutation completeGoalItem(
            $id: ID!
            $period: String!
            $date: String!
            $taskRef: String!
            $isComplete: Boolean!
            $isMilestone: Boolean!
          ) {
            completeGoalItem(
              id: $id
              period: $period
              date: $date
              taskRef: $taskRef
              isComplete: $isComplete
              isMilestone: $isMilestone
            ) {
              id
            }
          }
        `,
        variables: {
          id,
          period,
          date,
          taskRef,
          isComplete: Boolean(isComplete),
          isMilestone: Boolean(isMilestone),
        },
      })
        .then(() => (this.$emit('refresh-task-goal', goalRef)))
        .catch(() => {
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
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
