<template>
  <v-list dense class="transparent priority-goal-list">
    <template v-if="items.length">
      <div v-for="item in items" :key="item.id" class="priority-goal-entry">
        <v-list-tile
          @click="$emit('item-click', item)"
          class="priority-goal-item"
        >
          <v-list-tile-action @click.stop>
            <v-checkbox
              :input-value="item.isComplete"
              @change="$emit('toggle-complete', item)"
              :color="color"
            />
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title :class="{ completed: item.isComplete }">
              {{ item.body }}
            </v-list-tile-title>
            <v-list-tile-sub-title
              v-if="subtitleText(item)"
              class="caption grey--text"
            >
              {{ subtitleText(item) }}
            </v-list-tile-sub-title>
          </v-list-tile-content>
          <v-list-tile-action class="goal-item-actions">
            <span
              v-if="showSubtasks && hasSubtasks(item)"
              class="caption grey--text subtask-counter mr-1"
            >{{ subtaskProgress(item) }}</span>
            <!-- Transcript: re-open the agent end-event HTML saved on the item's reward -->
            <v-btn
              v-if="item.reward"
              icon small class="ma-0"
              title="View agent transcript"
              @click.stop="$emit('open-transcript', item)"
            >
              <v-icon size="18">receipt_long</v-icon>
            </v-btn>
            <v-btn
              v-if="showEdit"
              icon small class="ma-0"
              @click.stop="$emit('edit-item', item)"
            >
              <v-icon size="18">edit</v-icon>
            </v-btn>
            <v-btn
              v-if="showDelete"
              icon small class="ma-0"
              @click.stop="$emit('delete-item', item)"
            >
              <v-icon size="18">delete</v-icon>
            </v-btn>
          </v-list-tile-action>
        </v-list-tile>

        <!-- Sub-tasks -->
        <v-list
          v-if="showSubtasks && hasSubtasks(item)"
          dense
          class="transparent subtasks-list py-0"
        >
          <v-list-tile
            v-for="subTask in item.subTasks"
            :key="`sub-${subTask.id}`"
            class="subtask-item"
          >
            <v-list-tile-action @click.stop class="subtask-action">
              <v-checkbox
                :input-value="subTask.isComplete"
                @change="$emit('toggle-subtask', { item, subTask })"
                :color="color"
                hide-details
              />
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title
                class="subtask-title"
                :class="{ completed: subTask.isComplete }"
              >
                {{ subTask.body }}
              </v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
        </v-list>
      </div>
    </template>
    <v-list-tile v-else>
      <v-list-tile-content>
        <v-list-tile-title class="grey--text text-xs-center pa-3">
          {{ emptyText }}
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
  </v-list>
</template>

<script>
/**
 * A compact goal-item checklist: checkbox + title (strike-through when done) +
 * an optional subtitle (linked parent-goal name • routine task name), plus
 * optional sub-tasks, an agent-transcript button, and edit/delete actions.
 * Extracted from PriorityQuadrant so the same list can be reused (e.g. the
 * Goals-page day drawer).
 *
 * Item shape: { id, body, isComplete, taskRef, parentGoalBody, reward,
 *               subTasks: [{ id, body, isComplete }] }.
 */
export default {
  name: 'MoleculePriorityGoalList',
  props: {
    items: { type: Array, default: () => [] },
    // Used to resolve `item.taskRef` into a routine task name for the subtitle.
    tasklist: { type: Array, default: () => [] },
    color: { type: String, default: 'primary' },
    emptyText: { type: String, default: 'No items' },
    showEdit: { type: Boolean, default: true },
    showDelete: { type: Boolean, default: false },
    showSubtasks: { type: Boolean, default: false },
  },
  methods: {
    // Subtitle = linked (parent) goal name + routine task name, joined by " • ".
    // The period is intentionally omitted (e.g. every day item is "day").
    subtitleText(item) {
      const parts = [];
      if (item && item.parentGoalBody) parts.push(item.parentGoalBody);
      const task = this.getTaskName(item && item.taskRef);
      if (task) parts.push(task);
      return parts.join(' • ');
    },
    getTaskName(taskRef) {
      if (!taskRef || !this.tasklist) return '';
      const task = this.tasklist.find((t) => t.id === taskRef || t.taskId === taskRef);
      return task ? task.name : '';
    },
    hasSubtasks(item) {
      return !!(item && item.subTasks && item.subTasks.length);
    },
    subtaskProgress(item) {
      const subs = (item && item.subTasks) || [];
      const done = subs.filter((s) => s.isComplete).length;
      return `${done}/${subs.length}`;
    },
  },
};
</script>

<style scoped>
.priority-goal-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.priority-goal-entry:last-child .priority-goal-item {
  border-bottom: none;
}

.priority-goal-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

/* Keep the row actions tight together instead of each reserving a wide column. */
.goal-item-actions {
  flex-direction: row !important;
  align-items: center;
  min-width: auto !important;
}

.subtasks-list {
  padding-left: 40px;
}

.subtask-title {
  font-size: 0.85rem;
}

.completed {
  text-decoration: line-through;
  opacity: 0.6;
}
</style>
