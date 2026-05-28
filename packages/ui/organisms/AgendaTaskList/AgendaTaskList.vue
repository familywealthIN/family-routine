<template>
  <div class="agenda-task-list">
    <atom-card v-if="loading" class="agenda-loading-card">
      <atom-card-text class="text-xs-center pa-5">
        <atom-progress-circular
          indeterminate
          color="primary"
          size="40"
          class="mb-3"
        />
        <p class="mb-0">Loading day tasks...</p>
      </atom-card-text>
    </atom-card>

    <template v-else-if="hasGroups">
      <div
        v-for="group in groups"
        :key="group.taskId"
        class="mb-3 agenda-task-group"
        :data-testid="`agenda-task-group-${group.taskId}`"
      >
        <v-card class="pb-2">
          <v-card-title class="pb-1 pt-2">
            <span class="subheading">{{ group.taskName }}</span>
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-0">
            <v-list dense class="transparent pa-0">
              <template v-for="taskGoals in group.goals">
                <v-list-tile
                  v-for="goalItem in taskGoals.goalItems"
                  :key="goalItem.id"
                  class="agenda-day-item"
                  :data-testid="`agenda-day-item-${goalItem.id}`"
                >
                  <v-list-tile-action
                    v-if="!hideCheckbox"
                    class="agenda-day-action-checkbox"
                    @click.stop
                  >
                    <v-checkbox
                      :input-value="goalItem.isComplete"
                      color="primary"
                      hide-details
                      class="agenda-day-checkbox ma-0 pa-0"
                      :data-testid="`agenda-checkbox-${goalItem.id}`"
                      @change="handleComplete(goalItem, taskGoals, $event)"
                    />
                  </v-list-tile-action>
                  <v-list-tile-content
                    class="agenda-day-content"
                    :data-testid="`agenda-text-${goalItem.id}`"
                    @click="handleEdit(goalItem, taskGoals)"
                  >
                    <v-list-tile-title :class="{ 'agenda-item-completed': goalItem.isComplete }">
                      {{ goalItem.body }}
                    </v-list-tile-title>
                  </v-list-tile-content>
                  <v-list-tile-action class="agenda-day-action-delete">
                    <v-btn
                      icon
                      small
                      :data-testid="`agenda-delete-${goalItem.id}`"
                      @click.stop="handleDelete(goalItem, taskGoals)"
                    >
                      <v-icon size="18">delete</v-icon>
                    </v-btn>
                  </v-list-tile-action>
                </v-list-tile>
              </template>
            </v-list>
          </v-card-text>
        </v-card>
      </div>
    </template>

    <atom-card v-else class="agenda-empty-card">
      <atom-card-text class="text-xs-center">
        <p>No Day Tasks</p>
      </atom-card-text>
    </atom-card>
  </div>
</template>

<script>
import AtomCard from '../../atoms/Card/Card.vue';
import AtomCardText from '../../atoms/CardText/CardText.vue';
import AtomProgressCircular from '../../atoms/ProgressCircular/ProgressCircular.vue';

export default {
  name: 'OrganismAgendaTaskList',
  components: {
    AtomCard,
    AtomCardText,
    AtomProgressCircular,
  },
  props: {
    groups: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    hideCheckbox: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    hasGroups() {
      return Array.isArray(this.groups) && this.groups.length > 0;
    },
  },
  methods: {
    handleComplete(goalItem, taskGoals, isComplete) {
      this.$emit('complete-goal-item', {
        id: goalItem.id,
        period: taskGoals.period,
        date: taskGoals.date,
        taskRef: goalItem.taskRef,
        isComplete: Boolean(isComplete),
        isMilestone: goalItem.isMilestone,
      });
    },
    handleEdit(goalItem, taskGoals) {
      this.$emit('edit-goal-item', {
        ...goalItem,
        period: taskGoals.period,
        date: taskGoals.date,
      });
    },
    handleDelete(goalItem, taskGoals) {
      this.$emit('delete-goal-item', {
        id: goalItem.id,
        period: taskGoals.period,
        date: taskGoals.date,
      });
    },
  },
};
</script>

<style scoped>
.agenda-day-item {
  min-height: 40px;
}
.agenda-day-action-checkbox {
  min-width: 32px;
  margin-right: 0;
  padding-right: 0;
}
.agenda-day-checkbox {
  margin: 0 !important;
  padding: 0 !important;
}
.agenda-day-content {
  cursor: pointer;
  padding-left: 4px;
}
.agenda-day-action-delete {
  min-width: 32px;
}
.agenda-item-completed {
  text-decoration: line-through;
  color: rgba(0, 0, 0, 0.54);
}
</style>
