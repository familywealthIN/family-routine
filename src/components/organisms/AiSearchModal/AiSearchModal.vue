<template>
  <div>
    <!-- Mobile Bottom Sheet -->
    <v-bottom-sheet
      v-if="$vuetify.breakpoint.xsOnly"
      v-model="dialog"
      persistent
      max-width="100%"
    >
      <v-card class="ai-search-modal">
        <!-- Mobile Handle -->
        <div class="mobile-handle-container">
          <div class="mobile-handle"></div>
        </div>

        <!-- Sticky Header -->
        <div class="sticky-header">
          <v-card-title class="pb-2">
            <v-icon left :color="isTaskMode ? 'primary' : 'accent'">
              {{ isTaskMode ? 'task_alt' : 'timeline' }}
            </v-icon>
            <span>{{ dynamicTitle }}</span>
            <v-spacer></v-spacer>
            <v-btn icon @click="closeModal">
              <v-icon>close</v-icon>
            </v-btn>
          </v-card-title>
        </div>

        <!-- Scroll Shadow Indicators -->
        <div v-show="showTopShadow" class="scroll-shadow scroll-shadow--top"></div>

        <!-- Scrollable Content -->
        <v-card-text
          ref="scrollableContent"
          @scroll="handleScroll"
          class="scrollable-content"
          style="max-height: 70vh; overflow-y: auto;"
        >
          <!-- Search Input with Mode Hint -->
          <div class="search-form mb-4">
            <v-text-field
              v-model="searchQuery"
              :placeholder="intelligentPlaceholder"
              :loading="loading"
              prepend-icon="search"
              @keyup.enter="handleSubmit"
              filled
              class="mb-2"
            ></v-text-field>

            <!-- Mode Hint -->
            <v-alert
              v-if="searchQuery && searchQuery.length > 3"
              :type="isTaskMode ? 'info' : 'warning'"
              text
              dense
              class="mb-0"
            >
              <div class="d-flex align-center">
                <v-icon left small>{{ isTaskMode ? 'add_task' : 'timeline' }}</v-icon>
                <span class="caption">
                  {{ isTaskMode
                    ? 'Creating a task. Add keywords like "this week" or "plan" to build goals instead.'
                    : 'Building a goal plan. Remove time keywords to create a simple task instead.'
                  }}
                </span>
              </div>
            </v-alert>
          </div>

          <!-- Error Display -->
          <v-alert v-if="error" type="error" dismissible @input="error = ''">
            {{ error }}
          </v-alert>

          <!-- Task Creation Form (Task Mode) -->
          <AiTaskCreationForm
            v-if="hasSubmitted && isTaskMode"
            ref="taskForm"
            :searchQuery="searchQuery"
            :currentTask="$currentTaskData"
            :goalItemsRef="goalItemsRef"
            :routines="routines"
            :relatedGoalsData="relatedGoalsData"
            :loading.sync="loading"
            @error="error = $event"
            @update:loading="loading = $event"
            @update:saving="saving = $event"
            @update:valid="isFormValid = $event"
            @task-created="handleTaskCreated"
            @success="handleSuccess"
          />

          <!-- Goal Planning Form (Goals Mode) -->
          <AiGoalPlanForm
            v-if="hasSubmitted && !isTaskMode"
            ref="goalForm"
            :searchQuery="searchQuery"
            :currentTask="$currentTaskData"
            :goalItemsRef="goalItemsRef"
            :routines="routines"
            :loading.sync="loading"
            @error="error = $event"
            @update:loading="loading = $event"
            @update:saving="saving = $event"
            @update:valid="isFormValid = $event"
            @period-above-changed="handlePeriodAboveChanged"
            @goals-saved="handleGoalsSaved"
            @success="handleSuccess"
          />
        </v-card-text>

        <div v-show="showBottomShadow" class="scroll-shadow scroll-shadow--bottom"></div>

        <!-- Sticky Footer with Save Button -->
        <v-card-actions v-if="hasSubmitted" class="sticky-footer">
          <v-spacer></v-spacer>
          <v-btn text @click="closeModal">Cancel</v-btn>
          <v-btn
            :color="isTaskMode ? 'primary' : 'accent'"
            :disabled="!canSave"
            :loading="saving"
            @click="handleSaveClick"
          >
            {{ getSaveButtonText }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-bottom-sheet>

    <!-- Desktop Dialog -->
    <v-dialog
      v-else
      v-model="dialog"
      persistent
      max-width="800px"
    >
      <v-card class="ai-search-modal">
        <!-- Sticky Header -->
        <div class="sticky-header">
          <v-card-title class="pb-2">
            <v-icon left :color="isTaskMode ? 'primary' : 'accent'">
              {{ isTaskMode ? 'task_alt' : 'timeline' }}
            </v-icon>
            <span>{{ dynamicTitle }}</span>
            <v-spacer></v-spacer>
            <v-btn icon @click="closeModal">
              <v-icon>close</v-icon>
            </v-btn>
          </v-card-title>
        </div>

        <!-- Scroll Shadow Indicators -->
        <div v-show="showTopShadow" class="scroll-shadow scroll-shadow--top"></div>

        <!-- Scrollable Content -->
        <v-card-text
          ref="scrollableContent"
          @scroll="handleScroll"
          class="scrollable-content"
          style="max-height: 70vh; overflow-y: auto;"
        >
          <!-- Search Input with Mode Hint -->
          <div class="search-form mb-4">
            <v-text-field
              v-model="searchQuery"
              :placeholder="intelligentPlaceholder"
              :loading="loading"
              prepend-icon="search"
              @keyup.enter="handleSubmit"
              filled
              class="mb-2"
            ></v-text-field>

            <!-- Mode Hint -->
            <v-alert
              v-if="searchQuery && searchQuery.length > 3"
              :type="isTaskMode ? 'info' : 'warning'"
              text
              dense
              class="mb-0"
            >
              <div class="d-flex align-center">
                <v-icon left small>{{ isTaskMode ? 'add_task' : 'timeline' }}</v-icon>
                <span class="caption">
                  {{ isTaskMode
                    ? 'Creating a task. Add keywords like "this week" or "plan" to build goals instead.'
                    : 'Building a goal plan. Remove time keywords to create a simple task instead.'
                  }}
                </span>
              </div>
            </v-alert>
          </div>

          <!-- Error Display -->
          <v-alert v-if="error" type="error" dismissible @input="error = ''">
            {{ error }}
          </v-alert>

          <!-- Task Creation Form (Task Mode) -->
          <AiTaskCreationForm
            v-if="hasSubmitted && isTaskMode"
            ref="taskForm"
            :searchQuery="searchQuery"
            :currentTask="$currentTaskData"
            :goalItemsRef="goalItemsRef"
            :routines="routines"
            :relatedGoalsData="relatedGoalsData"
            :loading.sync="loading"
            @error="error = $event"
            @update:loading="loading = $event"
            @update:saving="saving = $event"
            @update:valid="isFormValid = $event"
            @task-created="handleTaskCreated"
            @success="handleSuccess"
          />

          <!-- Goal Planning Form (Goals Mode) -->
          <AiGoalPlanForm
            v-if="hasSubmitted && !isTaskMode"
            ref="goalForm"
            :searchQuery="searchQuery"
            :currentTask="$currentTaskData"
            :goalItemsRef="goalItemsRef"
            :routines="routines"
            :loading.sync="loading"
            @error="error = $event"
            @update:loading="loading = $event"
            @update:saving="saving = $event"
            @update:valid="isFormValid = $event"
            @period-above-changed="handlePeriodAboveChanged"
            @goals-saved="handleGoalsSaved"
            @success="handleSuccess"
          />
        </v-card-text>

        <div v-show="showBottomShadow" class="scroll-shadow scroll-shadow--bottom"></div>

        <!-- Sticky Footer with Save Button -->
        <v-card-actions v-if="hasSubmitted" class="sticky-footer">
          <v-spacer></v-spacer>
          <v-btn text @click="closeModal">Cancel</v-btn>
          <v-btn
            :color="isTaskMode ? 'primary' : 'accent'"
            :disabled="!canSave"
            :loading="saving"
            @click="handleSaveClick"
          >
            {{ getSaveButtonText }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';
import { stepupMilestonePeriodDate } from '@/utils/getDates';
import AiTaskCreationForm from '../AiTaskCreationForm/AiTaskCreationForm.vue';
import AiGoalPlanForm from '../AiGoalPlanForm/AiGoalPlanForm.vue';

export default {
  name: 'OrganismAiSearchModal',

  components: {
    AiTaskCreationForm,
    AiGoalPlanForm,
  },

  props: {
    value: {
      type: Boolean,
      required: true,
    },
  },

  data() {
    return {
      searchQuery: '',
      error: '',
      loading: false,
      saving: false,
      hasSubmitted: false,
      isFormValid: false,
      showTopShadow: false,
      showBottomShadow: false,
      routineData: [],
      currentParentPeriodData: null,
    };
  },

  computed: {
    dialog: {
      get() {
        return this.value;
      },
      set(val) {
        this.$emit('input', val);
      },
    },

    // Intelligent mode detection based on query content
    isTaskMode() {
      if (!this.searchQuery) return true;

      const query = this.searchQuery.toLowerCase();

      // Check for time-based keywords (week, month, year, etc.)
      const timeKeywords = /\b(week|month|year|weekly|monthly|yearly|weeks|months|years)\b/;

      // Check for planning keywords
      const planKeywords = /\b(plan|schedule|routine|program|strategy|course|curriculum)\b/;

      // If query contains time or planning keywords, it's goals mode
      if (timeKeywords.test(query) || planKeywords.test(query)) {
        return false;
      }

      // Otherwise, it's task mode
      return true;
    },

    dynamicTitle() {
      return this.isTaskMode ? 'Add Task with AI' : 'Build Goals with AI';
    },

    intelligentPlaceholder() {
      if (this.isTaskMode) {
        return 'e.g., "Call dentist tomorrow at 2pm", "Buy groceries", "Reply to client email"';
      }
      return 'e.g., "Learn Python this week", "Plan healthy eating this month", "Build a portfolio this year"';
    },

    canSave() {
      return this.isFormValid;
    },

    getSaveButtonText() {
      return this.isTaskMode ? 'Create Task' : 'Save Plan & Timeline';
    },

    // Get routine tasks from $currentTaskList
    routines() {
      if (!this.$currentTaskList || !Array.isArray(this.$currentTaskList)) {
        return [];
      }

      return this.$currentTaskList.map((task) => ({
        taskId: task.id,
        name: task.name || task.body || task.title || 'Unnamed Task',
        time: task.time || null,
        tags: task.tags || [],
      }));
    },

    // Compute period data for goalItemsRef query
    goalRefPeriodData() {
      // If we have specific parent period data from the form, use it
      if (!this.isTaskMode && this.currentParentPeriodData) {
        return {
          period: this.currentParentPeriodData.period,
          date: this.currentParentPeriodData.date,
        };
      }

      // For task mode, calculate based on current task date and period
      if (this.isTaskMode && this.$currentTaskData) {
        // If current task has period and date, step up to parent period
        const taskPeriod = this.$currentTaskData.period || 'day';
        const taskDate = this.$currentTaskData.date || moment().format('DD-MM-YYYY');
        return stepupMilestonePeriodDate(taskPeriod, taskDate);
      }

      // Default fallback to week goals
      const friday = moment().day(5); // Friday
      return {
        period: 'week',
        date: friday.format('DD-MM-YYYY'),
      };
    },
  },

  apollo: {
    // Query for goals in the period above (used for milestone linking)
    goalItemsRef: {
      query: gql`
        query getGoalItemsRef($period: String!, $date: String!) {
          goalDatePeriod(period: $period, date: $date) {
            id
            date
            period
            goalItems {
              id
              body
              period
              date
              taskRef
              tags
              isComplete
            }
          }
        }
      `,
      variables() {
        return this.goalRefPeriodData;
      },
      skip() {
        // Skip if not authenticated
        if (!this.$root.$data.email) return true;

        // Only fetch in task mode when milestone might be needed
        // Or in goals mode when milestone goal reference is needed
        return false;
      },
      update(data) {
        return data.goalDatePeriod && data.goalDatePeriod.date ? data.goalDatePeriod.goalItems : [];
      },
    },

    // Query for related goals data (used when a goal is selected as milestone)
    relatedGoalsData: {
      query: gql`
        query getRelatedGoalsData($goalRef: ID!) {
          goalItemMilestone(goalRef: $goalRef) {
            id
            body
            period
            date
            taskRef
            tags
            isComplete
          }
        }
      `,
      variables() {
        // Get goalRef from the active form
        if (this.isTaskMode && this.$refs.taskForm) {
          const { taskData } = this.$refs.taskForm;
          return { goalRef: (taskData && taskData.goalRef) || '' };
        }
        if (!this.isTaskMode && this.$refs.goalForm) {
          const { milestoneData } = this.$refs.goalForm;
          return { goalRef: (milestoneData && milestoneData.goalRef) || '' };
        }
        return { goalRef: '' };
      },
      skip() {
        // Skip if not authenticated
        if (!this.$root.$data.email) return true;

        // Skip if no goalRef is set
        if (this.isTaskMode && this.$refs.taskForm) {
          const { taskData } = this.$refs.taskForm;
          return !taskData || !taskData.goalRef;
        }
        if (!this.isTaskMode && this.$refs.goalForm) {
          const { milestoneData } = this.$refs.goalForm;
          return !milestoneData || !milestoneData.goalRef;
        }

        return true;
      },
      update(data) {
        return data.goalItemMilestone || [];
      },
    },
  },

  watch: {
    // Watch for route changes to detect login/logout
    $route(to, from) {
      if (from.name === 'login' && to.name !== 'login') {
        this.refreshApolloQueries();
      }
    },

    // Watch for user email changes (indicates login/logout)
    '$root.$data.email': function watchUserEmail(newEmail, oldEmail) {
      if ((!oldEmail && newEmail) || (oldEmail && newEmail && oldEmail !== newEmail)) {
        this.refreshApolloQueries();
      }
    },

    // Initialize when dialog opens
    dialog(newVal) {
      if (newVal) {
        this.resetForm();

        // Initialize scroll shadows after modal opens
        this.$nextTick(() => {
          this.checkScrollShadows();
        });
      }
    },

    // Watch routines to auto-select current task when data is loaded
    routines: {
      handler(newVal) {
        if (newVal && newVal.length > 0 && this.$currentTaskData && this.$currentTaskData.id) {
          // Check if the current task is in the routines list
          const currentTaskInRoutines = newVal.find(
            (routine) => routine.taskId === this.$currentTaskData.id,
          );

          if (currentTaskInRoutines) {
            // For goals mode: auto-select routine in goal form
            if (!this.isTaskMode && this.$refs.goalForm) {
              this.$refs.goalForm.selectedRoutine = this.$currentTaskData.id;
            }

            // For task mode: auto-select taskRef in task form
            if (this.isTaskMode && this.$refs.taskForm) {
              const { taskData } = this.$refs.taskForm;
              if (taskData && !taskData.taskRef) {
                taskData.taskRef = this.$currentTaskData.id;
              }
            }
          }
        }
      },
      immediate: false,
    },
  },

  methods: {
    handleScroll() {
      const el = this.$refs.scrollableContent;
      if (!el) return;

      this.showTopShadow = el.scrollTop > 10;
      this.showBottomShadow = el.scrollTop < el.scrollHeight - el.clientHeight - 10;
    },

    checkScrollShadows() {
      this.$nextTick(() => {
        this.handleScroll();
      });
    },

    handleSaveClick() {
      if (this.isTaskMode && this.$refs.taskForm) {
        this.$refs.taskForm.saveTask();
      } else if (!this.isTaskMode && this.$refs.goalForm) {
        this.$refs.goalForm.saveGoals();
      }
    },

    handleSubmit() {
      if (!this.searchQuery) return;

      if (!this.hasSubmitted) {
        this.hasSubmitted = true;
      } else {
        // If already submitted, trigger a re-search in the active form
        this.$nextTick(() => {
          if (this.isTaskMode && this.$refs.taskForm) {
            this.$refs.taskForm.createTask();
          } else if (!this.isTaskMode && this.$refs.goalForm) {
            this.$refs.goalForm.searchGoals();
          }
        });
      }
    },

    handleTaskCreated(data) {
      // Task was created successfully
      console.log('Orchestrator: Task created', data);
    },

    handleGoalsSaved(data) {
      // Goals were saved successfully
      console.log('Orchestrator: Goals saved', data);
    },

    handlePeriodAboveChanged(data) {
      console.log('Orchestrator: Period above changed', data);
      this.currentParentPeriodData = data;

      // Refetch the goalItemsRef query with the new period data
      if (this.$apollo.queries.goalItemsRef) {
        this.$apollo.queries.goalItemsRef.refetch();
      }
    },

    handleSuccess() {
      // Close modal on success
      this.$nextTick(() => {
        this.closeModal();
      });
    },

    closeModal() {
      this.dialog = false;
      this.resetForm();
    },

    resetForm() {
      this.searchQuery = '';
      this.error = '';
      this.loading = false;
      this.saving = false;
      this.hasSubmitted = false;
      this.isFormValid = false;
      this.showTopShadow = false;
      this.showBottomShadow = false;
      this.currentParentPeriodData = null;

      // Reset child forms
      this.$nextTick(() => {
        if (this.$refs.taskForm && this.$refs.taskForm.resetForm) {
          this.$refs.taskForm.resetForm();
        }
        if (this.$refs.goalForm && this.$refs.goalForm.resetForm) {
          this.$refs.goalForm.resetForm();
        }
      });
    },

    refreshApolloQueries() {
      // Refresh Apollo queries when user logs in/out
      this.$apollo.queries.goalItemsRef.refetch();
      if (!this.$apollo.queries.relatedGoalsData.skip) {
        this.$apollo.queries.relatedGoalsData.refetch();
      }
    },
  },
};
</script>

<style scoped>
.ai-search-modal {
  position: relative;
  border-radius: 16px 16px 0 0 !important;
}

.mobile-handle-container {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px 0;
  background: white;
}

.mobile-handle {
  width: 36px;
  height: 4px;
  background-color: #e0e0e0;
  border-radius: 2px;
}

@media (min-width: 600px) {
  .ai-search-modal {
    border-radius: 4px !important;
  }
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 2;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.sticky-footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: white;
  border-top: 1px solid #e0e0e0;
  padding: 16px;
}

.scroll-shadow {
  position: sticky;
  height: 8px;
  width: 100%;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 1;
}

.scroll-shadow--top {
  top: 64px; /* Below sticky header */
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1), transparent);
}

.scroll-shadow--bottom {
  bottom: 52px; /* Above sticky footer */
  background: linear-gradient(to top, rgba(0, 0, 0, 0.1), transparent);
}

.scrollable-content {
  position: relative;
  padding: 24px;
}

@media (max-width: 600px) {
  .scrollable-content {
    padding: 16px;
  }
}

.search-form {
  position: relative;
}
</style>
