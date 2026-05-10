<template>
  <AtomForm ref="form" v-model="valid">
    <AtomContainer style="max-width: 900px;" fill-height>
      <AtomLayout wrap class="goal-creation">
        <AtomFlex xs12 v-if="shouldShowStatus(localGoalItem.period) && localGoalItem.body" class="status-row pb-0">
          <div class="d-flex align-center status-container">
            <task-status-tag
              :status="getNewTaskStatus(localGoalItem.taskRef, localGoalItem.originalDate, localGoalItem)"
              class="status-chip"
            />
          </div>
        </AtomFlex>
        <AtomFlex xs12 d-flex class="pb-0">
          <AtomTextField
            v-model="localGoalItem.body"
            id="newGoalItemBody"
            name="newGoalItemBody"
            label="Type your task"
            class="inputGoal"
            :rules="formRules.body"
            @keyup.enter="saveGoalItem"
            required
          />
        </AtomFlex>
        <AtomFlex xs12 class="pt-0">
          <GoalTaskToolbar
            :period.sync="localGoalItem.period"
            :date.sync="localGoalItem.date"
            :task-ref.sync="localGoalItem.taskRef"
            :goal-ref.sync="localGoalItem.goalRef"
            :is-milestone="localGoalItem.isMilestone"
            :tasklist="tasklist"
            :goal-items-ref="goalItemsRef"
            :disabled="newItemLoaded"
            :min-date="todayISO"
            @date-change="handleDateChange"
            @period-change="handlePeriodChange"
          />
          <AtomCard class="no-shadow">
            <AtomCardText class="pt-0">
            <AtomFlex xs12 d-flex>
          <goal-tags-input
            :goalTags="localGoalItem.tags"
            :userTags="userTags"
            @update-new-tag-items="updateNewTagItems"
          ></goal-tags-input>
        </AtomFlex>
        <AtomLayout row wrap>
        <AtomFlex sm8>
          <AtomCard flat>
            <AtomCardText class="pt-2 pr-0 pb-0 pl-0">
              <markdown-editor
                v-model="localGoalItem.contribution"
                ref="markdownEditor"
                variant="default"
                :editor-key="markdownEditorKey"
              />
              <!-- Auto-save status indicator -->
              <div v-if="localGoalItem.id" class="editor-statusbar text-right ml-2 text-muted mb-3">
                <div
                  v-if="autoSaveLoading"
                  small
                  color="primary"
                  outlined
                  class="mr-2"
                >
                  <AtomProgressCircular
                    size="12"
                    width="2"
                    indeterminate
                    color="primary"
                    class="mr-1"
                  />
                  Auto-saving...
                </div>
                <div
                  v-else-if="localGoalItem.contribution !== lastSavedContribution"
                  small
                  color="orange"
                  outlined
                  class="mr-2"
                >
                  <AtomIcon small class="mr-1">mdi-pencil</AtomIcon>
                  Unsaved changes
                </div>
                <div
                  v-else
                  small
                  color="success"
                  outlined
                  class="mr-2"
                >
                  <AtomIcon small class="mr-1">mdi-check</AtomIcon>
                  Saved
                </div>
              </div>
            </AtomCardText>
          </AtomCard>
        </AtomFlex>
        <AtomFlex sm4  d-flex v-if="localGoalItem.period === 'day' && localGoalItem.id">
          <sub-task-item-list
            :subTasks="localGoalItem.subTasks"
            :taskId="localGoalItem.id"
            :period="localGoalItem.period"
            :date="localGoalItem.date"
            @update-sub-task-items="updateSubTaskItems"
            @add-sub-task-item="$emit('add-sub-task-item', $event)"
            @delete-sub-task-item="$emit('delete-sub-task-item', $event)"
            @complete-sub-task-item="$emit('complete-sub-task-item', $event)"
          />
        </AtomFlex>
      </AtomLayout>
    </AtomCardText>
        <AtomFlex xs12>
          <div style="float: right;" class="mr-1">
            <AtomButton color="primary" :disabled="!valid" :loading="buttonLoading" @click="saveGoalItem" class="mr-3">
              Save
            </AtomButton>
          </div>
        </AtomFlex>
          </AtomCard>
        </AtomFlex>
      </AtomLayout>
    </AtomContainer>
  </AtomForm>
</template>

<script>
import { MarkdownEditor } from '@routine-notes/markdown-editor';

import taskStatusMixin from '../../composables/useTaskStatus';
import SubTaskItemList from '../../molecules/SubTaskItemList/SubTaskItemList.vue';
import GoalTagsInput from '../../molecules/GoalTagsInput/GoalTagsInput.vue';
import GoalTaskToolbar from '../GoalTaskToolbar/GoalTaskToolbar.vue';
import TaskStatusTag from '../../atoms/TaskStatusTag/TaskStatusTag.vue';
import getJSON from '../../utils/getJSON';
import { USER_TAGS } from '../../constants/settings';
import {
  AtomButton,
  AtomCard,
  AtomCardText,
  AtomContainer,
  AtomFlex,
  AtomForm,
  AtomIcon,
  AtomLayout,
  AtomProgressCircular,
  AtomTextField,
} from '../../atoms';

export default {
  name: 'OrganismGoalCreation',
  components: {
    AtomButton,
    AtomCard,
    AtomCardText,
    AtomContainer,
    AtomFlex,
    AtomForm,
    AtomIcon,
    AtomLayout,
    AtomProgressCircular,
    AtomTextField,
    SubTaskItemList,
    GoalTagsInput,
    GoalTaskToolbar,
    MarkdownEditor,
    TaskStatusTag,
  },
  mixins: [taskStatusMixin],
  props: {
    newGoalItem: {
      type: Object,
      required: true,
    },
    tasklist: {
      type: Array,
      default: () => [],
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
    autoSaveLoading: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      valid: false,
      newItemLoaded: false,
      formRules: {
        body: [
          (v) => !!v || 'Task Name is required',
          (v) => (v && v.length >= 3) || 'Name must be greater than 3 characters',
        ],
        dropDown: [(v) => !!v || 'This Option is required'],
      },
      periodOptionList: [
        {
          label: 'Day',
          value: 'day',
        },
        {
          label: 'Week',
          value: 'week',
        },
        {
          label: 'Month',
          value: 'month',
        },
        {
          label: 'Year',
          value: 'year',
        },
        {
          label: 'Lifetime',
          value: 'lifetime',
        },
      ],
      userTags: getJSON(localStorage.getItem(USER_TAGS), []),

      // Auto-save functionality
      autoSaveTimeout: null,
      lastSavedContribution: '',
      isInitialLoad: true,

      // Track previous period to detect actual changes
      previousPeriod: null,

      // Bumped whenever `newGoalItem` swaps identity (new vs existing, or
      // dialog closed → reopened). The underlying EasyMDE / CodeMirror
      // instance caches its own buffer, so we pass this counter through
      // MarkdownEditor's `editor-key` to force a remount — without it, a
      // new task would still show the previous task's contribution.
      markdownEditorKey: 0,
    };
  },
  computed: {
    todayISO() {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    localGoalItem: {
      get() {
        return this.newGoalItem;
      },
      set(val) {
        this.$emit('update:newGoalItem', val);
      },
    },
  },
  methods: {
    handleDateChange() {
      this.$emit('trigger-goal-items-ref');
    },

    handlePeriodChange(newPeriod) {
      // GoalTaskToolbar already handles date clearing and period tracking
      // This handler only needs to trigger goal items fetch when needed
      console.log('GoalCreation handlePeriodChange:', {
        newPeriod,
        currentDate: this.localGoalItem.date,
        currentPeriod: this.localGoalItem.period,
      });

      // Update tracked period for watchers
      this.previousPeriod = newPeriod;

      // Trigger goal items fetch if we have a valid date and not lifetime
      if (this.localGoalItem.date && newPeriod !== 'lifetime') {
        this.$emit('trigger-goal-items-ref');
      }
    },

    updatePeriod() {
      if (this.localGoalItem.period === 'lifetime') {
        this.localGoalItem.date = '01-01-1970';
      } else {
        this.localGoalItem.date = '';
      }
    },
    saveGoalItem() {
      this.$refs.form.validate();
      if (this.valid) {
        this.setLocalUserTag(this.localGoalItem.tags || []);
        if (this.localGoalItem.id) {
          this.$emit('update-goal-item', { ...this.localGoalItem }, {
            onSuccess: () => this.resetForm(),
            onError: () => this.resetForm(),
          });
        } else {
          this.$emit('add-goal-item', { ...this.localGoalItem }, {
            onSuccess: () => this.resetForm(),
            onError: () => this.resetForm(),
          });
        }
      }
    },

    updateNewTagItems(tags) {
      this.localGoalItem.tags = tags;
    },

    updateSubTaskItems(subTasks) {
      this.localGoalItem.subTasks = subTasks;
    },

    resetForm() {
      this.$refs.form.reset();
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
    goalItemsRef: {
      handler(newVal, oldVal) {
        console.log('goalItemsRef changed:', {
          oldLength: oldVal ? oldVal.length : 0,
          newLength: newVal ? newVal.length : 0,
          newVal,
        });
      },
      immediate: true,
    },

    newGoalItem(newVal, oldVal) {
      this.newItemLoaded = !!newVal.id && (oldVal.date === '' || typeof oldVal.date === 'undefined');
      if (
        newVal.date !== oldVal.date
        && (oldVal.date === '' || typeof oldVal.date === 'undefined')
      ) {
        this.$emit('trigger-goal-items-ref');
      }

      // Remount the markdown editor every time the parent hands us a
      // new goal item reference. Parents (PendingList, DashBoard,
      // GoalsFilterTime…) always *reassign* newGoalItem when the dialog
      // opens, so this watcher fires exactly once per open and we can
      // bump unconditionally. Without the bump, CodeMirror keeps its
      // previous buffer and a "new task" session still shows old content.
      this.markdownEditorKey += 1;

      // Reset component state when newGoalItem is cleared (dialog closed)
      // Or initialize it when loading a new/existing goal item
      if (!newVal.period || newVal.period === '') {
        // Form was cleared/reset - reset all tracking state
        this.previousPeriod = null;
        this.lastSavedContribution = '';
        this.isInitialLoad = true;
        // Clear any pending auto-save timeout
        if (this.autoSaveTimeout) {
          clearTimeout(this.autoSaveTimeout);
          this.autoSaveTimeout = null;
        }
      } else if (newVal.period !== this.previousPeriod) {
        // Period changed or new item loaded - update tracking
        this.previousPeriod = newVal.period;
      }

      // Initialize lastSavedContribution when newGoalItem loads
      if (newVal.id && newVal.contribution !== this.lastSavedContribution) {
        this.lastSavedContribution = newVal.contribution || '';
      }

      // Reset the initial load flag after the first change
      if (this.isInitialLoad && (newVal.id !== oldVal.id || newVal.contribution !== oldVal.contribution)) {
        this.$nextTick(() => {
          this.isInitialLoad = false;
        });
      }
    },

    // Auto-save contribution field when user stops typing
    'newGoalItem.contribution': function watchContribution(newValue) {
      // Only auto-save if the item has an ID (exists in database) and it's not the initial load
      if (!this.newGoalItem.id || newValue === this.lastSavedContribution || this.isInitialLoad) {
        return;
      }

      // Clear previous timeout
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
      }

      // Set new timeout for auto-save (2 seconds after user stops typing)
      this.autoSaveTimeout = setTimeout(() => {
        this.$emit('auto-save-contribution', this.newGoalItem.id, this.newGoalItem.contribution);
        this.lastSavedContribution = this.newGoalItem.contribution || '';
      }, 2000);
    },

    // Watch for taskRef changes to auto-fill tags (only for new goals, not edits)
    'newGoalItem.taskRef': function watchTaskRef(newTaskRef, oldTaskRef) {
      // Skip auto-fill in edit mode — keep only server-saved tags
      if (this.localGoalItem.id) return;

      if (newTaskRef !== oldTaskRef && newTaskRef && this.tasklist && this.tasklist.length > 0) {
        const selectedTask = this.tasklist.find((task) => task.id === newTaskRef || task.taskId === newTaskRef);
        if (selectedTask && selectedTask.tags && selectedTask.tags.length > 0) {
          // Merge existing tags with routine item tags, avoiding duplicates
          const existingTags = this.localGoalItem.tags || [];
          const routineTags = selectedTask.tags || [];
          const mergedTags = [...new Set([...existingTags, ...routineTags])];
          this.localGoalItem.tags = mergedTags;
        }
      }
    },

    // Watch for goalRef changes to automatically set isMilestone
    'newGoalItem.goalRef': function watchGoalRef(newGoalRef) {
      if (newGoalRef) {
        // Automatically set isMilestone to true when a goalRef is selected
        this.localGoalItem.isMilestone = true;
      }
    },

    // Also watch localGoalItem.goalRef for direct changes
    'localGoalItem.goalRef': function watchLocalGoalRef(newGoalRef) {
      if (newGoalRef) {
        // Automatically set isMilestone to true when a goalRef is selected
        this.localGoalItem.isMilestone = true;
      }
    },
  },

  beforeDestroy() {
    // Clean up the auto-save timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
  },
};
</script>

<style>
  /* easymde CSS is bundled by @routine-notes/markdown-editor's MarkdownEditor. */

  .no-shadow {
    box-shadow: none !important;
  }
  .v-input--checkbox .v-messages {
    display: none;
  }
  .goal-creation #newGoalItemBody {
    max-height: 42px;
    font-size: 36px;
    font-weight: 700;
  }

  /* Reduce extra space below title input */
  .goal-creation .inputGoal .v-text-field__details {
    min-height: 0;
    margin-bottom: 0;
    padding: 0;
  }

  .goal-creation .inputGoal .v-messages {
    min-height: 0;
  }

  .goal-creation .no-shadow {
    margin-top: 0;
  }

  .goal-creation .no-shadow > .v-card__text.pt-0 {
    padding-top: 0 !important;
  }

  .status-chip {
    max-width: fit-content;
    margin-left: 0;
  }

  .status-container {
    justify-content: flex-start;
    align-items: center;
    gap: 8px;
  }

  .goal-creation .status-row {
    margin-top: -4px;
    padding-top: 0;
  }

  /* Mobile: full-bleed EasyMDE editor inside the goal creation dialog */
  @media (max-width: 600px) {
    .goal-creation .markdown-editor {
      width: 100vw;
      margin-left: calc(50% - 50vw);
      margin-right: calc(50% - 50vw);
    }
    .goal-creation .markdown-editor .EasyMDEContainer .CodeMirror,
    .goal-creation .markdown-editor .EasyMDEContainer .editor-toolbar,
    .goal-creation .markdown-editor .EasyMDEContainer .editor-statusbar {
      border-radius: 0;
      border-left: 0;
      border-right: 0;
    }
    .goal-creation .v-card {
      box-shadow: none !important;
    }
  }

</style>
