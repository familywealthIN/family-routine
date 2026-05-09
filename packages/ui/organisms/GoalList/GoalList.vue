<template>
  <AtomLayout row wrap>
    <AtomFlex xs12 d-flex>
      <div class="pl-3 pr-3 formGoal mt-3 mb-2">
        <AtomTextField
          clearable
          v-model="newGoalItem.body"
          id="newGoalItemBody"
          name="newGoalItemBody"
          label="Type your task"
          class="inputGoal"
          @keyup.enter="addGoalItem"
        />
        <AtomButton
          icon
          color="success"
          fab
          class="ml-3 mr-0"
          :loading="buttonLoading"
          @click="addGoalItem(newGoalItem)"
        >
          <AtomIcon dark>send</AtomIcon>
        </AtomButton>
      </div>
    </AtomFlex>
    <AtomFlex xs12 d-flex>
      <goal-tags-input
        class="ml-3 mr-3"
        :goalTags="newGoalItem.tags"
        :userTags="userTags"
        @update-new-tag-items="updateNewTagItems"
      ></goal-tags-input>
    </AtomFlex>
    <AtomFlex xs12 d-flex>
      <GoalTaskSelector
        class="pl-3 pr-3"
        :items="tasklist"
        v-model="newGoalItem.taskRef"
      />
    </AtomFlex>
    <AtomFlex class="pl-3" v-if="showMilestoneOption" xs6 d-flex>
    <AtomCheckbox
      v-model="newGoalItem.isMilestone"
      label="Milestone?"
    />
    </AtomFlex>
    <AtomFlex class="pr-3" v-if="newGoalItem.isMilestone" xs6 d-flex>
      <GoalRefSelector
        :items="goalItemsRef"
        :tasklist="tasklist"
        :task-ref="newGoalItem.taskRef"
        v-model="newGoalItem.goalRef"
      />
    </AtomFlex>
  </AtomLayout>
</template>

<script>
import {
  AtomButton,
  AtomCheckbox,
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomTextField,
} from '../../atoms';
import getJSON from '../../utils/getJSON';
import GoalTagsInput from '../../molecules/GoalTagsInput/GoalTagsInput.vue';
import GoalRefSelector from '../../molecules/GoalRefSelector/GoalRefSelector.vue';
import GoalTaskSelector from '../../molecules/GoalTaskSelector/GoalTaskSelector.vue';
import { USER_TAGS } from '../../constants/settings';

export default {
  name: 'OrganismGoalList',

  components: {
    AtomButton,
    AtomCheckbox,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomTextField,
    GoalTagsInput,
    GoalRefSelector,
    GoalTaskSelector,
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
    goalItemsRef: {
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
  },
  data() {
    return {
      show: true,
      newGoalItem: {
        body: this.selectedBody || '',
        isMilestone: this.isDefaultMilestone || false,
        goalRef: '',
        taskRef: this.selectedTaskRef || '',
        tags: [],
      },
      defaultGoalItem: {
        body: this.selectedBody || '',
        isMilestone: this.isDefaultMilestone || false,
        goalRef: '',
        taskRef: this.selectedTaskRef || '',
        tags: [],
      },
      showMilestoneOption: true,
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
    addGoalItem() {
      const value = this.newGoalItem.body && this.newGoalItem.body.trim();
      if (!value) {
        return;
      }

      this.setLocalUserTag(this.newGoalItem.tags);
      this.$emit('add-goal-item', { ...this.newGoalItem });
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
  /* Portal-rendered by Vuetify outside component DOM — cannot be scoped */
  .v-select-list .v-subheader {
    padding: 0 8px 0 8px;
    height: 30px;
    border-bottom: 1px solid #ccc;
  }
</style>
<style scoped>
  .formGoal {
    display: flex;
    grid-column: 2;
    width: 100%;
  }

  .inputGoal {
    display:inline-block;
    flex-shrink: 0;
    flex-grow: 1;
  }
</style>
