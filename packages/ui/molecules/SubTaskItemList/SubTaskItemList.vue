<template>
  <AtomCard class="pl-3 mb-3 sub-task-list">
    <AtomCardTitle class="headline pb-0 pt-3 pl-0">SUB TASKS</AtomCardTitle>
    <div class="formGoal mb-1">
      <AtomTextField
        clearable
        v-model="newSubTaskItemBody"
        id="newSubTaskItemBody"
        name="newSubTaskItemBody"
        label="Type your sub task"
        class="inputGoal"
        @keyup.enter="addSubTaskItem"
        :disabled="isAddingSubTask"
        :loading="isAddingSubTask"
      />
      <AtomButton
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
        <AtomIcon dark>send</AtomIcon>
      </AtomButton>
    </div>
    <AtomList dense subheader>
      <AtomSubheader class="subheading" v-if="subTasks && subTasks.length == 0">
        You have 0 sub tasks
      </AtomSubheader>
      <AtomSubheader class="subheading" v-else>
        {{ subTasks && subTasks.length }} sub tasks
      </AtomSubheader>
      <template v-for="(subTaskItem, i) in subTasks">
        <AtomListTile v-bind:key="subTaskItem.id">
          <AtomListTileAction>
            <AtomCheckbox v-model="subTaskItem.isComplete" @change="completeSubTaskItem(
              subTaskItem.id,
              subTaskItem.isComplete,
            )" />
          </AtomListTileAction>
          <AtomListTileContent>
            <AtomListTileTitle :class="{ completed: subTaskItem.isComplete }">
              {{ subTaskItem.body }}
            </AtomListTileTitle>
          </AtomListTileContent>
          <AtomListTileAction>
            <AtomButton flat icon @click="deleteSubTaskItem(subTaskItem, i)">
              <AtomIcon>delete</AtomIcon>
            </AtomButton>
          </AtomListTileAction>
        </AtomListTile>
      </template>
    </AtomList>
  </AtomCard>
</template>
<script>
import {
  AtomButton,
  AtomCard,
  AtomCardTitle,
  AtomCheckbox,
  AtomIcon,
  AtomList,
  AtomListTile,
  AtomListTileAction,
  AtomListTileContent,
  AtomListTileTitle,
  AtomSubheader,
  AtomTextField,
} from '../../atoms';

export default {
  name: 'MoleculeSubTaskItemList',
  components: {
    AtomButton,
    AtomCard,
    AtomCardTitle,
    AtomCheckbox,
    AtomIcon,
    AtomList,
    AtomListTile,
    AtomListTileAction,
    AtomListTileContent,
    AtomListTileTitle,
    AtomSubheader,
    AtomTextField,
  },
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

      const { date, taskId, period } = this;
      this.isAddingSubTask = true;
      this.$emit('sub-task-loading', true);

      // Emit event with all data needed for mutation - parent handles GraphQL
      this.$emit('add-sub-task-item', {
        taskId,
        body: this.newSubTaskItemBody,
        period: period || 'day',
        date,
        isComplete: false,
        onSuccess: (addedSubTask) => {
          if (!this.subTasks) {
            this.subTasks = [];
          }
          this.subTasks.push({
            id: addedSubTask.id,
            body: this.newSubTaskItemBody,
            isComplete: false,
          });
          this.$emit('update-sub-task-items', this.subTasks);
          this.newSubTaskItemBody = '';
          this.isAddingSubTask = false;
          this.$emit('sub-task-loading', false);
        },
        onError: () => {
          this.isAddingSubTask = false;
          this.$emit('sub-task-loading', false);
        },
      });
    },
    deleteSubTaskItem(subTaskItem, index) {
      const { id } = subTaskItem;
      const { taskId, period, date } = this;

      this.$emit('update-sub-task-items', this.subTasks.filter((_, i) => i !== index));

      // Emit event with all data needed for mutation - parent handles GraphQL
      // Apollo cache optimistic update handles instant UI removal
      this.$emit('delete-sub-task-item', {
        id,
        taskId,
        period,
        date,
      });
    },
    completeSubTaskItem(id, isComplete) {
      this.lastCompleteItemId = id;
      const {
        period,
        date,
        taskId,
      } = this;

      // Emit event with all data needed for mutation - parent handles GraphQL
      this.$emit('complete-sub-task-item', {
        id,
        taskId,
        period,
        date,
        isComplete: Boolean(isComplete),
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

<style scoped>
@media screen and (min-width: 600px) {
  .sub-task-list {
    box-shadow: none;
    margin-left: 16px;
    border-left: 1px solid #ccc !important;
    height: 100%;
    border-radius: 0;
  }
}

.sub-task-list >>> .completed {
  text-decoration: line-through;
}

.sub-task-list >>> .v-list__group__items--no-action .v-list__tile {
  padding-left: 16px;
}

.sub-task-list >>> .v-list__tile__action {
  min-width: 36px;
}

.sub-task-list >>> .v-list__tile,
.sub-task-list >>> .v-subheader {
  padding: 0 4px;
}

.sub-task-list >>> .headline {
  color: rgba(0, 0, 0, 0.54);
  font-size: 14px !important;
  line-height: 16px !important;
  font-weight: bold;
}
</style>
