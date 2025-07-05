<template>  <v-card class="pl-3 mb-3 sub-task-list">
    <v-card-title class="headline pb-0 pt-3 pl-0">SUB TASKS</v-card-title>
    <div class="formGoal mb-1">
      <v-text-field
        clearable
        v-model="newSubTaskItemBody"
        id="newSubTaskItemBody"
        name="newSubTaskItemBody"
        label="Type your sub task"
        class="inputGoal"
        @keyup.enter="addSubTaskItem"
        :disabled="isAddingSubTask"
        :loading="isAddingSubTask"
      >
      </v-text-field>
      <v-btn
        icon
        color="success"
        fab
        small
        dark
        class="ml-3 mr-3"
        @click="addSubTaskItem(newSubTaskItemBody)"
        :disabled="isAddingSubTask"
        :loading="isAddingSubTask"
      >
        <v-icon dark>send</v-icon>
      </v-btn>
    </div>
    <v-list dense subheader>
      <v-subheader class="subheading" v-if="subTasks && subTasks.length == 0">
        You have 0 sub tasks
      </v-subheader>
      <v-subheader class="subheading" v-else>
        {{ subTasks && subTasks.length }} sub tasks
      </v-subheader>
      <template v-for="(subTaskItem, i) in subTasks">
        <v-list-tile v-bind:key="subTaskItem.id">
          <v-list-tile-action>
            <v-checkbox v-model="subTaskItem.isComplete" @change="completeSubTaskItem(
              subTaskItem.id,
              subTaskItem.isComplete,
            )"></v-checkbox>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title :class="{ completed: subTaskItem.isComplete }">
              {{ subTaskItem.body }}
            </v-list-tile-title>
          </v-list-tile-content>
          <v-list-tile-action>
            <v-btn flat icon @click="deleteSubTaskItem(subTaskItem, i)">
              <v-icon>delete</v-icon>
            </v-btn>
          </v-list-tile-action>
        </v-list-tile>
      </template>
    </v-list>
  </v-card>
</template>
<script>
import gql from 'graphql-tag';

export default {
  props: ['subTasks', 'editMode', 'newGoalItem', 'taskId', 'date', 'period'],

  data() {
    return {
      show: true,
      newGoalItemBody: '',
      subTaskItem: [],
      animateEntry: false,
      lastCompleteItemId: '',
      newSubTaskItemBody: '',
      isAddingSubTask: false,
    };
  },
  methods: {
    addSubTaskItem() {
      const value = this.newSubTaskItemBody && this.newSubTaskItemBody.trim();

      if (!value) {
        return;
      }

      const { date, taskId } = this;
      this.isAddingSubTask = true;
      this.$emit('sub-task-loading', true);

      this.$apollo.mutate({
        mutation: gql`
          mutation addSubTaskItem(
            $taskId: ID!
            $body: String!
            $period: String!
            $date: String!
            $isComplete: Boolean!
          ) {
            addSubTaskItem(
              taskId: $taskId
              body: $body
              period: $period
              date: $date
              isComplete: $isComplete
            ) {
              id
              body
              isComplete
            }
          }
        `,
        variables: {
          taskId,
          body: this.newSubTaskItemBody,
          period: 'day',
          date,
          isComplete: false,
        },
        update: (scope, { data: { addSubTaskItem } }) => {
          if (!this.subTasks) {
            this.subTasks = [];
          }

          this.subTasks.push(
            {
              id: addSubTaskItem.id,
              body: this.newSubTaskItemBody,
              isComplete: false,
            },
          );
          this.$emit('update-sub-task-items', this.subTasks);
          this.newSubTaskItemBody = '';
          this.isAddingSubTask = false;
          this.$emit('sub-task-loading', false);
        },
      }).catch(() => {
        this.isAddingSubTask = false;
        this.$emit('sub-task-loading', false);
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occured',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      });
    },
    deleteSubTaskItem(subTaskItem, index) {
      const { id } = subTaskItem;
      const { taskId, period, date } = this;
      this.subTasks.splice(index, 1);

      this.$emit('update-sub-task-items', this.subTasks);

      this.$apollo.mutate({
        mutation: gql`
          mutation deleteSubTaskItem(
            $id: ID!
            $taskId: ID!
            $period: String!
            $date: String!
          ) {
            deleteSubTaskItem(
              id: $id
              taskId: $taskId,
              period: $period
              date: $date
            ) {
              id
            }
          }
        `,
        variables: {
          id,
          taskId,
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
    completeSubTaskItem(id, isComplete) {
      this.lastCompleteItemId = id;
      const {
        period,
        date,
        taskId,
      } = this;

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
            }
          }
        `,
        variables: {
          id,
          taskId,
          period,
          date,
          isComplete: Boolean(isComplete),
        },
      })
        // .then(() => (this.$emit('refresh-task-goal', goalRef)))
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
  },
  watch: {
    progress(val, oldVal) {
      if (val !== oldVal) {
        this.animateEntry = true;
        setTimeout(() => { this.animateEntry = false; }, 2000);
      }
    },
  },
};
</script>

<style>
@media screen and (min-width: 600px) {
  .sub-task-list {
    box-shadow: none;
    margin-left: 16px;
    border-left: 1px solid #ccc !important;
    height: 100%;
  }
}

.sub-task-list .completed {
  text-decoration: line-through;
}

.sub-task-list .v-list__group__items--no-action .v-list__tile {
  padding-left: 16px;
}

.sub-task-list .v-list__tile__action {
  min-width: 36px;
}

.sub-task-list .v-list__tile,
.sub-task-list .v-subheader {
  padding: 0 4px;
}

.sub-task-list .headline {
  color: rgba(0, 0, 0, 0.54);
  font-size: 14px !important;
  line-height: 16px !important;
  font-weight: bold;
}
</style>
