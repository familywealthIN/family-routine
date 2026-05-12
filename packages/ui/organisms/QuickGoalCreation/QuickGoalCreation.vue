<template>
  <v-layout pl-3 pr-3 row wrap>
    <v-flex xs12 d-flex>
      <div class="form-goal mt-2 mb-2">
        <v-text-field
          clearable
          v-model="newGoalItem.body"
          id="newGoalItemBody"
          name="newGoalItemBody"
          label="Type your task"
          class="input-goal"
          @keyup.enter="handleAddGoalItem"
        >
        </v-text-field>
      </div>
    </v-flex>
    <v-flex xs12 d-flex>
      <GoalTaskSelector
        :items="tasklist"
        v-model="newGoalItem.taskRef"
        disabled
      />
    </v-flex>
    <v-flex xs12 d-flex>
      <GoalRefSelector
        :items="goalItemsRef"
        :tasklist="tasklist"
        :task-ref="newGoalItem.taskRef"
        v-model="newGoalItem.goalRef"
      />
    </v-flex>
    <!-- Related tasks timeline -->
    <v-flex xs12 d-flex v-if="newGoalItem.goalRef">
      <related-tasks-timeline :tasks="relatedTasks" />
    </v-flex>
    <v-flex xs12 d-flex>
      <goal-tags-input
        :goalTags="newGoalItem.tags"
        :userTags="userTags"
        @update-new-tag-items="updateNewTagItems"
      ></goal-tags-input>
    </v-flex>
    <v-flex x12 d-flex>
      <v-btn
        color="success"
        :loading="buttonLoading"
        :disabled="buttonLoading"
        @click="handleAddGoalItem"
      >
        Start Task
      </v-btn>
      <v-btn
        v-if="agentState === 'assigned'"
        color="primary"
        outline
        :disabled="buttonLoading"
        @click="$emit('start-agent')"
      >
        Start Agent
      </v-btn>
      <v-btn
        v-else
        color="primary"
        outline
        :disabled="buttonLoading"
        @click="$emit('build-agent')"
      >
        Build Agent
      </v-btn>
    </v-flex>
  </v-layout>
</template>

<script>
import getJSON from '../../utils/getJSON';
import GoalTagsInput from '../../molecules/GoalTagsInput/GoalTagsInput.vue';
import GoalRefSelector from '../../molecules/GoalRefSelector/GoalRefSelector.vue';
import GoalTaskSelector from '../../molecules/GoalTaskSelector/GoalTaskSelector.vue';
import RelatedTasksTimeline from '../../molecules/RelatedTasksTimeline/RelatedTasksTimeline.vue';
import { USER_TAGS } from '../../constants/settings';

export default {
  name: 'QuickGoalCreation',
  components: {
    GoalTagsInput,
    GoalRefSelector,
    GoalTaskSelector,
    RelatedTasksTimeline,
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
    goalItemsRef: {
      type: Array,
      default: () => [],
    },
    relatedTasks: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    buttonLoading: {
      type: Boolean,
      default: false,
    },
    agentState: {
      type: String,
      default: 'none', // 'none' | 'assigned'
    },
  },
  data() {
    return {
      newGoalItem: {
        body: this.selectedBody || '',
        isMilestone: false,
        goalRef: '',
        taskRef: this.selectedTaskRef || '',
        tags: [],
      },
      defaultGoalItem: {
        body: this.selectedBody || '',
        isMilestone: false,
        goalRef: '',
        taskRef: this.selectedTaskRef || '',
        tags: [],
      },
      userTags: getJSON(localStorage.getItem(USER_TAGS), []),
    };
  },
  mounted() {
    this.initializeTagsFromSelectedTask();
  },
  methods: {
    initializeTagsFromSelectedTask() {
      if (this.selectedTaskRef && this.tasklist && this.tasklist.length > 0) {
        const selectedTask = this.tasklist.find((task) => task.id === this.selectedTaskRef || task.taskId === this.selectedTaskRef);
        const taskTags = selectedTask && selectedTask.tags ? [...selectedTask.tags] : [];

        this.newGoalItem.tags = taskTags;
        this.defaultGoalItem.tags = taskTags;
      }
    },
    handleAddGoalItem() {
      const value = this.newGoalItem.body && this.newGoalItem.body.trim();
      if (!value) {
        return;
      }

      this.setLocalUserTag(this.newGoalItem.tags);
      this.$emit('add-goal-item', { ...this.newGoalItem });
    },
    updateNewTagItems(tags) {
      this.newGoalItem.tags = tags;
    },
    setLocalUserTag(newTags) {
      const userTags = getJSON(localStorage.getItem(USER_TAGS), []);
      newTags.forEach((tag) => {
        if (!userTags.includes(tag)) {
          userTags.push(tag);
        }
      });
      localStorage.setItem(USER_TAGS, JSON.stringify(userTags));
      this.userTags = [...userTags];
    },
    autoSelectGoalRef() {
      if (this.goalItemsRef && this.goalItemsRef.length) {
        this.goalItemsRef.forEach((goalItem) => {
          if (this.selectedTaskRef && goalItem.taskRef === this.selectedTaskRef) {
            this.newGoalItem.goalRef = goalItem.id;
          }
        });
      }
    },
  },
  watch: {
    selectedBody(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.newGoalItem = {
          ...this.defaultGoalItem,
          body: newVal,
        };
        this.defaultGoalItem = {
          ...this.defaultGoalItem,
          body: newVal,
        };
      }
    },
    selectedTaskRef(newVal, oldVal) {
      if (newVal !== oldVal) {
        const selectedTask = this.tasklist ? this.tasklist.find((task) => task.id === newVal || task.taskId === newVal) : null;
        const taskTags = selectedTask && selectedTask.tags ? [...selectedTask.tags] : [];

        this.newGoalItem = {
          ...this.defaultGoalItem,
          taskRef: newVal,
          tags: taskTags,
        };
        this.defaultGoalItem = {
          ...this.defaultGoalItem,
          taskRef: newVal,
          tags: taskTags,
        };
        this.autoSelectGoalRef();
      }
    },
    period(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.newGoalItem = {
          ...this.defaultGoalItem,
        };
        this.defaultGoalItem = {
          ...this.defaultGoalItem,
        };
      }
    },
    'newGoalItem.taskRef': function watchNewGoalItemTaskRef(newTaskRef, oldTaskRef) {
      if (newTaskRef !== oldTaskRef && newTaskRef && this.tasklist && this.tasklist.length > 0) {
        const selectedTask = this.tasklist.find((task) => task.id === newTaskRef || task.taskId === newTaskRef);
        if (selectedTask && selectedTask.tags && selectedTask.tags.length > 0) {
          const existingTags = this.newGoalItem.tags || [];
          const routineTags = selectedTask.tags || [];
          const mergedTags = [...new Set([...existingTags, ...routineTags])];
          this.newGoalItem.tags = mergedTags;
        }
      }
    },
    'newGoalItem.goalRef': function newGoalItemGoalRef(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.$emit('goal-ref-changed', newVal);
      }
    },
    tasklist(newVal) {
      if (newVal && newVal.length > 0) {
        this.initializeTagsFromSelectedTask();
      }
    },
    goalItemsRef() {
      this.autoSelectGoalRef();
    },
  },
};
</script>

<style>
.form-goal {
  display: flex;
  grid-column: 2;
  width: 100%;
}

.input-goal {
  display: inline-block;
  flex-shrink: 0;
  flex-grow: 1;
}

.v-select-list .v-subheader {
  padding: 0 8px 0 8px;
  height: 30px;
  border-bottom: 1px solid #ccc;
}

.condensed-timeline {
  background: rgba(255, 152, 0, 0.05);
  border-left: 3px solid #FF9800;
}

.condensed-timeline .v-timeline {
  padding-top: 0;
}
.condensed-timeline .v-card-title {
  padding-bottom: 8px;
}

.condensed-timeline .v-card-text {
  padding-top: 0;
}
</style>
