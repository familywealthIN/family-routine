<template>
  <div v-if="taskData" class="task-creation-form">
    <AtomDivider class="my-4" />

    <!-- Success Message -->
    <AtomAlert v-if="taskSuccess" type="success" dismissible @click="$emit('dismiss-success')">
      Task successfully created!
    </AtomAlert>

    <!-- Task Information Card - TickTick Style -->
    <div class="task-card-compact">
      <!-- Editable Task Title (Large, Bold) -->
      <AtomTextField
        :value="taskData.title"
        @input="updateField('title', $event)"
        placeholder="Task name"
        solo
        flat
        hide-details
        class="task-title-input"
      />

      <!-- Editable Task Description with Markdown -->
      <div class="task-description-editor">
        <markdown-editor
          :value="taskData.description"
          @input="updateField('description', $event)"
          variant="compact"
          :configs="editorConfig"
        />
      </div>
    </div>

    <!-- Related tasks timeline -->
    <AtomFlex xs12 d-flex v-if="selectedGoalRef">
      <related-tasks-timeline :tasks="relatedTasks" />
    </AtomFlex>
  </div>
</template>

<script>
import { MarkdownEditor } from '@routine-notes/markdown-editor';
import RelatedTasksTimeline from '../../molecules/RelatedTasksTimeline/RelatedTasksTimeline.vue';
import {
  AtomAlert,
  AtomDivider,
  AtomFlex,
  AtomTextField,
} from '../../atoms';

export default {
  name: 'OrganismAiTaskCreationForm',
  components: {
    AtomAlert,
    AtomDivider,
    AtomFlex,
    AtomTextField,
    RelatedTasksTimeline,
    MarkdownEditor,
  },
  props: {
    taskData: {
      type: Object,
      default: null,
    },
    taskSuccess: {
      type: Boolean,
      default: false,
    },
    saving: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    goalItemsRef: {
      type: Array,
      default: () => [],
    },
    tasklist: {
      type: Array,
      default: () => [],
    },
    routines: {
      type: Array,
      default: () => [],
    },
    relatedGoalsData: {
      type: Array,
      default: () => [],
    },
    // Props from GoalTaskToolbar
    selectedDate: {
      type: String,
      default: '',
    },
    selectedTaskRef: {
      type: String,
      default: null,
    },
    selectedGoalRef: {
      type: String,
      default: null,
    },
    promptTags: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      // Only AI-task-specific overrides; the shared MarkdownEditor applies
      // the compact preset for toolbar/status/spellcheck/rendering.
      editorConfig: {
        minHeight: '80px',
        maxHeight: '200px',
        placeholder: 'Description',
      },
    };
  },
  computed: {
    relatedTasks() {
      if (!this.selectedGoalRef || !this.relatedGoalsData || !Array.isArray(this.relatedGoalsData)) {
        return [];
      }

      const tasks = [];
      this.relatedGoalsData.forEach((goal) => {
        if (goal.goalItems && Array.isArray(goal.goalItems)) {
          goal.goalItems.forEach((goalItem) => {
            if (goalItem.goalRef === this.selectedGoalRef) {
              tasks.push({
                id: goalItem.id,
                body: goalItem.body,
                date: goal.date,
                period: goal.period,
                isComplete: goalItem.isComplete,
                goalRef: goalItem.goalRef,
                taskRef: goalItem.taskRef,
                tags: goalItem.tags || [],
              });
            }
          });
        }
      });

      return tasks
        .sort((a, b) => {
          if (!a.time) return 1;
          if (!b.time) return -1;
          return a.time.localeCompare(b.time);
        })
        .slice(0, 10);
    },
    isValid() {
      return !!(this.taskData && this.taskData.title && this.taskData.description);
    },
  },
  watch: {
    isValid: {
      handler(newVal) {
        this.$emit('update:valid', newVal);
      },
      immediate: true,
    },
  },
  methods: {
    updateField(field, value) {
      this.$emit('update-task-data', {
        ...this.taskData,
        [field]: value,
      });
    },
  },
};
</script>

<style scoped>
/* easymde CSS is bundled by @routine-notes/markdown-editor's MarkdownEditor. */

.task-creation-form {
  width: 100%;
}

/* Compact Task Card - TickTick/Todoist Style */
.task-card-compact {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #e0e0e0;
}

.task-title-input >>> .v-input__control .v-input__slot {
  font-size: 18px !important;
  font-weight: 600 !important;
  padding: 0 0 8px 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  border-bottom: 1px solid #e8e8e8 !important;
}

.task-title-input >>> input {
  font-size: 18px !important;
  font-weight: 600 !important;
  line-height: 1.4 !important;
}

.task-title-input >>> input::placeholder {
  color: #999 !important;
  font-weight: 500 !important;
}

/* EasyMDE markdown editor styles */
.task-description-editor >>> .EasyMDEContainer {
  background: transparent;
}

.task-description-editor >>> .EasyMDEContainer .CodeMirror {
  border: none;
  border-top: 1px solid #e8e8e8;
  border-radius: 0;
  font-size: 16px;
  color: #666;
  background: transparent;
  padding: 0;
}

.task-description-editor >>> .EasyMDEContainer .CodeMirror-scroll {
  min-height: 80px;
  max-height: 200px;
}

.task-description-editor >>> .EasyMDEContainer .CodeMirror .CodeMirror-placeholder {
  color: #aaa;
}

/* Mobile responsive */
@media (max-width: 600px) {
  .task-card-compact {
    padding: 12px;
  }

  .task-title-input >>> .v-input__control .v-input__slot,
  .task-title-input >>> input {
    font-size: 16px !important;
  }

  .task-description-editor >>> .EasyMDEContainer .CodeMirror {
    font-size: 16px;
  }
}
</style>
