<template>
  <div :key="`goal-list-${goal.id}-${goal.period}`">
    <div
      v-for="(goalItem, i) in goal.goalItems"
      :key="`goalitem-${goalItem.id}-${goal.id}-${goal.period}`"
      data-testid="goal-item"
      :data-goal-id="goalItem.id"
      :data-goal-period="goal.period"
      :data-goal-complete="goalItem.isComplete ? 'true' : 'false'"
    >
      <AtomListTile>
        <AtomListTileAction class="goal-checkbox-wrapper" data-testid="goal-checkbox">
          <AtomCheckbox
            :key="`checkbox-${goalItem.id}`"
            :value="goalItem.isComplete"
            :disabled="passive || busy"
            @input="completeGoalItem(
              goalItem.id,
              !goalItem.isComplete,
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
          class="goal-item-content"
        >
        <AtomListTileTitle :class="{ completed: goalItem.isComplete, 'goal-item-title': true }">
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

        <!-- Transcript: re-open the agent end-event HTML result saved on the
             goal item's reward. Presence of a reward also signals the agent
             end event completed. -->
        <AtomListTileAction v-if="goalItem.reward">
          <AtomButton
            flat
            icon
            title="View agent transcript"
            @click="$emit('open-transcript', goalItem)"
          >
            <AtomIcon>receipt_long</AtomIcon>
          </AtomButton>
        </AtomListTileAction>

        <AtomListTileAction>
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
                  :key="`checkbox-${subTask.id}`"
                  :value="subTask.isComplete"
                  :disabled="passive || busy"
                  @click.stop="completeSubTask(subTask, goalItem)"
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
import taskStatusMixin from '../../composables/useTaskStatus';
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
  props: ['goal', 'editMode', 'newGoalItem', 'passive', 'busy'],
  components: {
    AtomButton,
    AtomCheckbox,
    AtomIcon,
    AtomList,
    AtomListTile,
    AtomListTileAction,
    AtomListTileContent,
    AtomListTileTitle,
  },
  mixins: [taskStatusMixin],
  // No `data()`. This organism is a pure function of its props: same props in,
  // same render out. It previously kept a `pendingSubTaskUpdates` Set and wrote
  // straight onto the goal items it was handed — which are Apollo's normalized
  // cache objects, so those writes edited the cache behind Apollo's back and
  // left the store disagreeing with what components read. In-flight tracking
  // belongs to the container (see utils/pendingMutations).
  computed: {
    goalItems() {
      return this.goal && this.goal.goalItems ? this.goal.goalItems : [];
    },
  },
  methods: {
    getSubTasksProgress(subTasks) {
      if (!subTasks || subTasks.length === 0) {
        return '';
      }

      const completed = subTasks.filter((subTask) => subTask.isComplete).length;
      const total = subTasks.length;
      return `${completed}/${total} subtasks`;
    },
    /**
     * Ask the parent to toggle a sub-task. Emits intent only.
     *
     * `subTasks` is passed so the container can build an optimistic response
     * for the whole list — the checkbox still flips instantly, but the write
     * goes through Apollo instead of `$set`-ing the cached SubTaskItem, which
     * is what used to desynchronise the store from the rendered result.
     */
    completeSubTask(subTask, goalItem) {
      if (this.passive || this.busy) return;
      if (!subTask || !goalItem || !goalItem.id) return;
      if (!this.goal.period || !this.goal.date) return;

      this.$emit('complete-sub-task', {
        id: subTask.id,
        taskId: goalItem.id,
        period: this.goal.period,
        date: this.goal.date,
        isComplete: !subTask.isComplete,
        // Read-only snapshot for the optimistic response — never mutated here.
        subTasks: (goalItem.subTasks || []).map((st) => ({
          id: st.id, body: st.body, isComplete: !!st.isComplete,
        })),
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
      // Emit a COPY carrying the period/date context the editor needs.
      // This used to assign `goalItem.period` / `goalItem.date` onto the item
      // itself — but that object is Apollo's normalized `GoalItem:<id>` record,
      // and `period`/`date` are not fields of the GoalItem type. Writing them
      // polluted the cached entity (and its memoized read result) with fields
      // no query can ever refresh.
      this.$emit('toggle-goal-display-dialog', { ...goalItem, period, date }, true);
    },
    completeGoalItem(id, isComplete, period, date, taskRef, isMilestone, goalRef) {
      // Don't proceed if component is in passive state
      if (this.passive) return;

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
  },
  // No watchers, no lifecycle hooks, no $forceUpdate. All three existed only to
  // paper over the local state and prop mutations removed above: a component
  // with no state of its own has nothing to reset when its props change, and
  // rendering straight off props keeps reactivity intact on its own.
};
</script>

<style scoped>
  .completed {
    text-decoration: line-through;
  }

  .goal-item-content {
    overflow: hidden;
  }

  .goal-item-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  >>> .v-list__group__items--no-action .v-list__tile {
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

  /* Keep icon action buttons a square touch target so the hover/ripple overlay
     (a border-radius:50% ::before) renders as a circle instead of an oval. */
  >>> .v-list__tile .v-btn--icon {
    width: 36px;
    height: 36px;
    min-width: 36px;
    margin: 0 2px;
    padding: 0;
  }

  >>> .v-list__tile .v-btn--icon::before {
    border-radius: 50%;
  }

  /* Week and month goal action buttons styling */
  >>> .v-list__tile .v-btn--icon.primary--text {
    background-color: rgba(33, 150, 243, 0.1);
  }

  >>> .v-list__tile .v-btn--icon.primary--text:hover {
    background-color: rgba(33, 150, 243, 0.2);
  }
</style>
