<template>
  <v-dialog v-model="dialog" max-width="800px" persistent>
    <v-card class="modern-card-elevated ai-modal">
      <v-card-title class="headline sticky-header">
        <v-icon left>{{ isTaskMode ? 'task_alt' : 'timeline' }}</v-icon>
        {{ dynamicTitle }}
        <v-spacer></v-spacer>
        <v-btn icon @click="closeModal">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="scrollable-content" ref="scrollableContent" @scroll="handleScroll">
        <div class="content-wrapper">
          <!-- Scroll shadow indicators -->
          <div class="scroll-shadow scroll-shadow-top" v-show="showTopShadow"></div>
          <div class="scroll-shadow scroll-shadow-bottom" v-show="showBottomShadow"></div>
        <!-- Search Form -->
        <v-form @submit.prevent="handleSubmit">
          <v-text-field
            v-model="searchQuery"
            label="Describe what you want to accomplish"
            :placeholder="intelligentPlaceholder"
            prepend-icon="search"
            :loading="loading"
            :disabled="loading"
            @keyup.enter="handleSubmit"
            @input="onQueryChange"
            clearable
            filled
          >
            <template v-slot:append>
              <v-btn
                color="primary"
                :loading="loading"
                :disabled="!searchQuery || loading"
                @click="handleSubmit"
                icon
                class="search-btn"
              >
                <v-icon>{{ isTaskMode ? 'add_task' : 'search' }}</v-icon>
              </v-btn>
            </template>
          </v-text-field>
        </v-form>

        <!-- Error Display -->
        <v-alert v-if="error" type="error" dismissible @click="error = ''">
          {{ error }}
        </v-alert>

        <!-- Success Message for Task Creation -->
        <v-alert v-if="taskSuccess" type="success" dismissible @click="taskSuccess = false">
          Task successfully created!
        </v-alert>

        <!-- Task Creation Results -->
        <div v-if="isTaskMode && taskData">
          <v-divider class="my-4"></v-divider>

          <v-card outlined class="mb-4 modern-shadow-sm">
            <v-card-title class="subtitle-1">
              <v-icon left>task_alt</v-icon>
              Extracted Task Information
            </v-card-title>
            <v-card-text>
              <!-- Editable Task Title -->
              <v-text-field
                v-model="taskData.title"
                label="Task Title"
                prepend-icon="title"
                filled
                class="mb-3"
              ></v-text-field>

              <!-- Editable Task Description -->
              <v-textarea
                v-model="taskData.description"
                label="Task Description"
                prepend-icon="description"
                filled
                auto-grow
                rows="3"
                class="mb-3"
              ></v-textarea>

              <!-- Due Date -->
              <v-text-field
                v-model="taskData.dueDate"
                label="Due Date"
                prepend-icon="event"
                filled
                type="date"
                class="mb-3"
              ></v-text-field>

              <!-- Tags -->
              <goal-tags-input
                :goalTags="taskData.tags"
                :userTags="userTags"
                @update-new-tag-items="updateTaskTags"
                class="mb-3"
              ></goal-tags-input>

              <!-- Routine Task Selection -->
              <v-select
                :items="routines"
                v-model="taskData.taskRef"
                item-text="name"
                item-value="taskId"
                label="Routine Task"
                prepend-icon="schedule"
                filled
                class="mb-3"
              ></v-select>

              <!-- Milestone Checkbox -->
              <v-checkbox
                v-model="taskData.isMilestone"
                label="Milestone?"
                class="mb-3"
              ></v-checkbox>

              <!-- Goal Reference (only show when milestone is checked) -->
              <v-select
                v-if="taskData.isMilestone"
                :items="goalItemsRef"
                v-model="taskData.goalRef"
                item-text="body"
                item-value="id"
                label="Goal Task"
                prepend-icon="flag"
                filled
                class="mb-3"
              ></v-select>
            </v-card-text>
          </v-card>

          <!-- Related Tasks Timeline -->
          <v-card outlined class="mb-4 modern-shadow-sm" v-if="relatedTasks && relatedTasks.length > 0 && taskData && taskData.goalRef">
            <v-card-title class="pb-2">
              <v-icon left small>track_changes</v-icon>
              <span class="subtitle-2">Related Goals ({{ relatedTasks.length }})</span>
            </v-card-title>
            <v-card-text class="pt-0">
              <v-timeline dense>
                <v-timeline-item
                  v-for="task in relatedTasks"
                  :key="task.id"
                  :color="task.isComplete ? 'green' : 'orange'"
                  small
                  class="mb-1"
                >
                  <v-layout align-center>
                    <v-flex>
                      <div v-if="task.date" class="caption text--secondary">
                        {{ formatDateToDayOfWeek(task.date) }}
                      </div>
                      <span class="caption text--secondary">{{ formatTime(task.time) }}</span>
                      <div class="body-2">{{ task.body }}</div>
                      <div v-if="task.tags && task.tags.length > 0" class="mt-1">
                        <v-chip
                          v-for="tag in task.tags"
                          :key="tag"
                          x-small
                          outlined
                          class="mr-1"
                        >
                          {{ tag }}
                        </v-chip>
                      </div>
                    </v-flex>
                  </v-layout>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
          </v-card>
        </div>

        <!-- Goals Results Section -->
        <div v-if="!isTaskMode && milestoneData && milestoneData.entries">
          <v-divider class="my-4"></v-divider>

          <!-- Plan Title (Editable) -->
          <v-text-field
            v-model="milestoneData.title"
            label="Plan Title (will be saved as parent goal)"
            prepend-icon="title"
            filled
            class="mb-3"
          ></v-text-field>

          <!-- Milestone Checkbox for Goals Plan (moved below plan title) -->
          <v-checkbox
            v-model="milestoneData.isMilestone"
            label="Link to goal in period above?"
            class="mb-3"
          ></v-checkbox>

          <!-- Milestone explanation -->
          <v-alert
            v-if="milestoneData.isMilestone"
            type="info"
            dense
            outlined
            class="mb-3"
          >
            <span class="caption">
              The plan title will be linked to a goal in the period above, and all timeline entries will be milestones referencing the plan title.
            </span>
          </v-alert>
          <v-alert
            v-else
            type="info"
            dense
            outlined
            class="mb-3"
          >
            <span class="caption">
              The plan title will be saved as a standalone goal, and all timeline entries will be milestones referencing it.
            </span>
          </v-alert>

          <!-- Goal Reference for Goals Plan (only show when milestone is checked) -->
          <v-select
            v-if="milestoneData.isMilestone"
            :items="goalItemsRef"
            v-model="milestoneData.goalRef"
            item-text="body"
            item-value="id"
            label="On Period Above"
            prepend-icon="flag"
            filled
            class="mb-4"
          ></v-select>

          <!-- Routine Selection -->
          <v-row class="mb-4">
            <v-col cols="6">
              <v-select
                v-model="selectedRoutine"
                :items="routines"
                item-text="name"
                item-value="taskId"
                label="Routine Task"
                prepend-icon="schedule"
                filled
                @change="loadGoalPeriods"
              ></v-select>
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="selectedGoalPeriod"
                :items="goalPeriodOptions"
                label="Select Goal Period"
                prepend-icon="calendar_today"
                filled
                :disabled="!selectedRoutine"
              ></v-select>
            </v-col>
          </v-row>

          <!-- Timeline Results -->
          <v-card outlined class="mb-4 modern-shadow-sm">
            <v-card-title class="subtitle-1">
              <v-icon left>timeline</v-icon>
              Generated {{ milestoneData.period }} Plan ({{ milestoneData.entries.length }} items)
            </v-card-title>
            <v-card-text>
              <v-timeline dense>
                <v-timeline-item
                  v-for="(entry, index) in milestoneData.entries"
                  :key="index"
                  :color="getTimelineColor(entry.period)"
                  small
                  class="mb-2"
                >
                  <v-layout>
                    <v-flex>
                      <div class="caption text--secondary mb-1">
                        {{ entry.periodName }} ({{ entry.date }})
                      </div>
                      <!-- Editable Title -->
                      <v-text-field
                        v-model="entry.title"
                        label="Goal Title"
                        dense
                        filled
                        class="mb-2"
                      ></v-text-field>

                      <!-- Editable Description -->
                      <div class="description-editor">
                        <label class="v-label theme--light">Goal Description</label>
                        <vue-easymde
                          v-model="entry.description"
                          :configs="editorConfig"
                          :key="`editor-${index}-${editorKey}`"
                          :ref="`editor-${index}`"
                        />
                      </div>
                    </v-flex>
                  </v-layout>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
          </v-card>
        </div>
        </div>
      </v-card-text>

      <v-card-actions class="sticky-footer">
        <v-spacer></v-spacer>
        <v-btn
          v-if="(isTaskMode && taskData) || (!isTaskMode && milestoneData)"
          @click="handleSaveClick"
          color="primary"
          :loading="saving"
          :disabled="!canSave || saving"
        >
          {{ getSaveButtonText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';
import VueEasymde from 'vue-easymde';

import taskStatusMixin from '@/composables/useTaskStatus';
import GoalTagsInput from './GoalTagsInput.vue';
import { USER_TAGS } from '../constants/settings';
import getJSON from '../utils/getJSON';
import { stepupMilestonePeriodDate, getTimelineEntryPeriod, getTimelineEntryDate } from '../utils/getDates';
import eventBus, { EVENTS } from '../utils/eventBus';

export default {
  name: 'AiSearchModal',
  components: {
    VueEasymde,
    GoalTagsInput,
  },
  mixins: [taskStatusMixin],
  apollo: {
    goalItemsRef: {
      query: gql`
        query goalDatePeriod($period: String!, $date: String!) {
          goalDatePeriod(period: $period, date: $date) {
            id
            date
            period
            goalItems {
              id
              body
              taskRef
            }
          }
        }
      `,
      update(data) {
        this.goalItems = data && data.goalDatePeriod && data.goalDatePeriod.goalItems;
        return data.goalDatePeriod && data.goalDatePeriod.date
          ? this.groupGoalItemsRef(data.goalDatePeriod.goalItems)
          : [];
      },
      variables() {
        return {
          ...this.goalRefPeriodData,
        };
      },
      skip() {
        // For task mode: skip unless isMilestone is checked in taskData
        if (this.isTaskMode) {
          return !this.taskData || !this.taskData.isMilestone;
        }

        // For goals mode: skip unless we're in milestone mode and have milestone data
        return !this.milestoneData || !this.milestoneData.isMilestone;
      },
      error() {
        console.error('Failed to load goal items');
      },
    },
    relatedGoalsData: {
      query: gql`
        query goalsByGoalRef($goalRef: String!) {
          goalsByGoalRef(goalRef: $goalRef) {
            id
            date
            period
            goalItems {
              id
              body
              isComplete
              goalRef
              taskRef
              tags
              isMilestone
            }
          }
        }
      `,
      variables() {
        return {
          goalRef: this.taskData ? this.taskData.goalRef : '',
        };
      },
      skip() {
        return !this.taskData || !this.taskData.goalRef;
      },
      update(data) {
        return data && data.goalsByGoalRef ? data.goalsByGoalRef : [];
      },
    },
    routineTasksData: {
      query: gql`
        query routineDate($date: String!) {
          routineDate(date: $date) {
            tasklist {
              id
              name
              time
              description
            }
          }
        }
      `,
      variables() {
        return {
          date: moment().format('DD-MM-YYYY'),
        };
      },
      update(data) {
        const tasks = data && data.routineDate && data.routineDate.tasklist ? data.routineDate.tasklist.map((task) => ({
          name: task.name,
          taskId: task.id,
          time: task.time,
          description: task.description,
        })) : [];
        return tasks;
      },
      error() {
        console.error('Failed to load routine tasks');
      },
    },
  },
  props: {
    value: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      searchQuery: '',
      loading: false,
      saving: false,
      error: '',
      milestoneData: null,
      selectedRoutine: null,
      selectedGoalPeriod: null,
      editorKey: 0, // Key to force recreation of editors
      goalPeriodOptions: [
        { text: 'Week Goals', value: 'week' },
        { text: 'Month Goals', value: 'month' },
        { text: 'Year Goals', value: 'year' },
      ],
      // Task creation data
      taskData: null,
      taskSuccess: false,
      userTags: getJSON(localStorage.getItem(USER_TAGS), []),
      goalItems: [],
      relatedGoalsData: [],
      // Scroll shadow indicators
      showTopShadow: false,
      showBottomShadow: false,
      editorConfig: {
        toolbar: false, // Hide toolbar
        status: false, // Hide status bar
        spellChecker: false, // Disable spell checker
        hideIcons: ['side-by-side', 'fullscreen'], // Hide specific icons
        minHeight: '72px', // Match v-textarea height (3 rows)
        maxHeight: '120px', // Prevent excessive height
        placeholder: 'Enter goal description...',
        renderingConfig: {
          singleLineBreaks: true, // Preserve single line breaks
          markedOptions: {
            breaks: true, // Enable line breaks
            gfm: true, // GitHub Flavored Markdown
          },
        },
        previewRender: (plainText) => plainText.replace(/\n/g, '<br>'),
      },
    };
  },
  computed: {
    dialog: {
      get() {
        return this.value;
      },
      set(value) {
        this.$emit('input', value);
      },
    },
    isTaskMode() {
      // Intelligent mode detection based on search query
      // If query contains week, month, year keywords, it's goals mode
      // Otherwise, default to task mode
      if (!this.searchQuery) {
        return true; // Default to task mode when no query
      }

      const query = this.searchQuery.toLowerCase();
      const hasTimeKeywords = /\b(week|month|year|weekly|monthly|yearly|weeks|months|years)\b/.test(query);
      const hasPlanKeywords = /\b(plan|schedule|routine|program|strategy|course|curriculum)\b/.test(query);

      // If it has explicit time keywords or planning keywords, it's likely goals mode
      return !(hasTimeKeywords || hasPlanKeywords);
    },
    dynamicTitle() {
      if (this.isTaskMode) {
        return 'Add Task with AI';
      }
      return 'Build Goals with AI';
    },
    intelligentPlaceholder() {
      if (this.isTaskMode) {
        return 'e.g., "Call dentist tomorrow at 2 PM" or "Buy groceries after work"';
      }
      return 'e.g., "Create a fitness plan for the next week" or "Build a study schedule for this month"';
    },
    canSave() {
      if (this.isTaskMode) {
        const taskCanSave = this.taskData && this.taskData.title && this.taskData.description;
        return taskCanSave;
      }

      const hasBasicRequirements = this.milestoneData
        && this.milestoneData.entries
        && this.selectedRoutine
        && this.selectedGoalPeriod;

      // Always require a plan title when creating goals with entries
      if (this.milestoneData && this.milestoneData.entries && this.milestoneData.entries.length > 0) {
        const planCanSave = hasBasicRequirements && this.milestoneData.title && this.milestoneData.title.trim();
        return planCanSave;
      }

      return hasBasicRequirements;
    },
    getSaveButtonText() {
      if (this.isTaskMode) {
        return 'Create Task';
      }

      if (this.saving) {
        return 'Saving Plan & Timeline...';
      }

      return 'Save Plan & Timeline';
    },
    goalRefPeriodData() {
      // For task creation mode, always use week period to load week goals
      if (this.isTaskMode) {
        return {
          period: 'week',
          date: moment().weekday(5).format('DD-MM-YYYY'), // Friday of current week
        };
      }

      // For goals mode, use the milestone data period
      return stepupMilestonePeriodDate(this.milestoneData.period, moment().format('DD-MM-YYYY'));
    },
    currentTaskHasWeekGoals() {
      // Check if the current task has week goals available
      if (!this.$currentTaskData || !this.$currentTaskData.id || !this.goalItemsRef || !Array.isArray(this.goalItemsRef)) {
        return false;
      }

      return this.goalItemsRef.some((item) => item.taskRef === this.$currentTaskData.id);
    },
    currentTaskWeekGoal() {
      // Get the week goal for the current task
      if (!this.currentTaskHasWeekGoals) {
        return null;
      }

      return this.goalItemsRef.find((item) => item.taskRef === this.$currentTaskData.id);
    },
    planTitlePeriodData() {
      // Generate the correct period data for saving the plan title based on the original query period
      if (!this.milestoneData || !this.milestoneData.period) {
        return { period: 'week', date: moment().weekday(5).format('DD-MM-YYYY') };
      }

      const currentPlanPeriod = this.milestoneData.period;
      const currentDate = moment().format('DD-MM-YYYY');

      // Use the same period as the user's query for the plan title
      switch (currentPlanPeriod) {
        case 'year':
          return { period: 'year', date: moment(currentDate, 'DD-MM-YYYY').endOf('year').format('DD-MM-YYYY') };
        case 'month':
          return { period: 'month', date: moment(currentDate, 'DD-MM-YYYY').endOf('month').format('DD-MM-YYYY') };
        case 'week':
          return { period: 'week', date: moment(currentDate, 'DD-MM-YYYY').weekday(5).format('DD-MM-YYYY') };
        case 'day':
        default:
          return { period: 'day', date: currentDate };
      }
    },
    routines() {
      const tasks = this.routineTasksData || [];
      return tasks;
    },
    relatedTasks() {
      // Transform relatedGoalsData into a flat array of goal items
      if (!this.relatedGoalsData || !Array.isArray(this.relatedGoalsData)) {
        return [];
      }

      const tasks = [];
      this.relatedGoalsData.forEach((goalGroup) => {
        if (goalGroup.goalItems && Array.isArray(goalGroup.goalItems)) {
          goalGroup.goalItems.forEach((item) => {
            tasks.push({
              ...item,
              date: goalGroup.date,
              period: goalGroup.period,
            });
          });
        }
      });

      return tasks;
    },
  },
  watch: {
    // Watch for route changes to detect login/logout
    $route(to, from) {
      // If user navigates from login page to another page, refresh Apollo queries
      if (from.name === 'login' && to.name !== 'login') {
        this.refreshApolloQueries();
      }
    },

    // Watch for user email changes (indicates login/logout)
    '$root.$data.email': function watchUserEmail(newEmail, oldEmail) {
      // If email changes from null/undefined to a value, or from one user to another
      if ((!oldEmail && newEmail) || (oldEmail && newEmail && oldEmail !== newEmail)) {
        this.refreshApolloQueries();
      }
    },

    dialog(newVal) {
      if (newVal) {
        this.loadRoutines();
        this.resetForm();

        // Initialize scroll shadows after modal opens
        this.$nextTick(() => {
          this.checkScrollShadows();
        });

        // Auto-select routine task from current task if available (for both modes)
        // Use $nextTick to ensure this runs after resetForm()
        this.$nextTick(() => {
          if (this.$currentTaskData && this.$currentTaskData.id) {
            if (!this.isTaskMode) {
              // In goals mode, auto-select for routine selection
              this.selectedRoutine = this.$currentTaskData.id;
            } else {
              // In task mode, auto-select for taskRef in taskData
              this.$nextTick(() => {
                if (this.taskData) {
                  this.taskData.taskRef = this.$currentTaskData.id;
                  console.log('AiSearchModal: Task mode - taskData.taskRef set to:', this.taskData.taskRef);
                }
              });
            }
          } else {
            console.log('AiSearchModal: No current task data available for auto-selection');
          }

          // Set default goalRef and milestone checkbox from currentTask if available (task mode only)
          if (this.$currentTaskData && this.$currentTaskData.id && this.isTaskMode) {
            // Wait for goalItemsRef to load, then check for week goals
            this.$nextTick(() => {
              this.$watch('goalItemsRef', (newGoalItems) => {
                if (newGoalItems && Array.isArray(newGoalItems) && this.taskData) {
                  const matchingGoalItem = newGoalItems.find((item) => item.taskRef === this.$currentTaskData.id);
                  if (matchingGoalItem) {
                    this.taskData.goalRef = matchingGoalItem.id;
                    this.taskData.isMilestone = true;
                    console.log('Auto-selected week goal for current task:', matchingGoalItem);
                  } else {
                    console.log('AiSearchModal: No matching week goal found for current task');
                  }
                } else {
                  console.log('AiSearchModal: goalItemsRef not ready or taskData not available');
                }
              }, { immediate: true });
            });
          }
        });
      }
    },

    // Watch taskData.goalRef and ensure isMilestone is true when goalRef is set
    taskData: {
      handler(newVal, oldVal) {
        // Auto-select taskRef when taskData is first created (only if taskRef is empty)
        if (newVal && !oldVal && this.$currentTaskData && this.$currentTaskData.id) {
          if (!newVal.taskRef) {
            this.$set(this.taskData, 'taskRef', this.$currentTaskData.id);
            console.log('AiSearchModal: Auto-selected taskRef in taskData watcher:', this.$currentTaskData.id);
          }
        }

        // When taskRef is set to current task, check for week goals and auto-select
        if (newVal && newVal.taskRef === this.$currentTaskData.id && this.goalItemsRef && Array.isArray(this.goalItemsRef)) {
          console.log('AiSearchModal: taskRef matches current task, checking for week goals');
          const matchingGoalItem = this.goalItemsRef.find((item) => item.taskRef === this.$currentTaskData.id);
          if (matchingGoalItem && !newVal.goalRef) {
            this.$set(this.taskData, 'goalRef', matchingGoalItem.id);
            this.$set(this.taskData, 'isMilestone', true);
            console.log('Auto-selected week goal via taskData watcher:', matchingGoalItem);
          }
        }

        // Ensure isMilestone is true when goalRef is set
        if (newVal && newVal.goalRef && !newVal.isMilestone) {
          this.$set(this.taskData, 'isMilestone', true);
        }
        // Clear goalRef when isMilestone is set to false
        if (newVal && !newVal.isMilestone && newVal.goalRef) {
          this.$set(this.taskData, 'goalRef', '');
        }
      },
      deep: true,
    },

    // Watch routines data to auto-select current task when routines are loaded
    routines(newVal) {
      // Auto-select routine when routines data is loaded
      if (newVal && newVal.length > 0 && this.$currentTaskData && this.$currentTaskData.id) {
        // Check if the current task is in the routines list
        const currentTaskInRoutines = newVal.find((routine) => routine.taskId === this.$currentTaskData.id);

        if (currentTaskInRoutines) {
          // For goals mode: auto-select routine dropdown (always set it if current task is available)
          if (!this.isTaskMode) {
            this.selectedRoutine = this.$currentTaskData.id;
          }

          // For task mode: auto-select taskRef in taskData (only if taskData exists and taskRef is empty)
          if (this.isTaskMode && this.taskData && !this.taskData.taskRef) {
            this.taskData.taskRef = this.$currentTaskData.id;
          }
        } else {
          console.log('AiSearchModal: Current task not found in routines list');
        }
      } else {
        console.log('AiSearchModal: Routines data not available or current task not set');
      }
    },

    // Watch goalItemsRef to auto-select week goals when they load
    goalItemsRef(newVal) {
      if (newVal && Array.isArray(newVal) && this.$currentTaskData && this.$currentTaskData.id && this.isTaskMode && this.taskData) {
        const matchingGoalItem = newVal.find((item) => item.taskRef === this.$currentTaskData.id);
        if (matchingGoalItem && !this.taskData.goalRef) {
          this.taskData.goalRef = matchingGoalItem.id;
          this.taskData.isMilestone = true;
          console.log('Auto-selected week goal via goalItemsRef watcher:', matchingGoalItem);
        }
      }
    },

    // Watch milestoneData.goalRef and ensure isMilestone is true when goalRef is set
    milestoneData: {
      handler(newVal) {
        if (newVal && newVal.goalRef && !newVal.isMilestone) {
          this.$set(this.milestoneData, 'isMilestone', true);
        }
        // Clear goalRef when isMilestone is set to false
        if (newVal && !newVal.isMilestone && newVal.goalRef) {
          this.$set(this.milestoneData, 'goalRef', '');
        }
      },
      deep: true,
    },

    // Watch searchQuery to auto-select goal period in goals mode
    searchQuery(newVal) {
      // Only auto-select in goals mode and if no period is already selected
      if (!this.isTaskMode && newVal && !this.selectedGoalPeriod) {
        this.selectedGoalPeriod = this.autoSelectGoalPeriod(newVal);
      }
    },
  },
  methods: {
    handleScroll() {
      const el = this.$refs.scrollableContent;
      if (!el) return;

      this.showTopShadow = el.scrollTop > 10;
      this.showBottomShadow = el.scrollTop < (el.scrollHeight - el.clientHeight - 10);
    },

    checkScrollShadows() {
      this.$nextTick(() => {
        this.handleScroll();
      });
    },

    handleSaveClick() {
      if (this.isTaskMode) {
        this.saveTask();
      } else {
        this.saveGoals();
      }
    },

    handleSubmit() {
      if (this.isTaskMode) {
        this.createTask();
      } else {
        this.searchGoals();
      }
    },

    updateTaskTags(tags) {
      if (this.taskData) {
        this.taskData.tags = tags;
      }
    },

    onQueryChange() {
      // This method is called when the search query changes
      // It triggers reactivity for the computed properties that depend on searchQuery
      // No implementation needed as the computed properties will automatically update
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

    getTaskDate() {
      // Always return today's date for day tasks
      return moment().format('DD-MM-YYYY');
    },

    formatTime(time) {
      if (!time) return '';
      return time; // Time is already in HH:MM format
    },

    formatDateToDayOfWeek(date) {
      if (!date) return '';
      try {
        const momentDate = moment(date, ['DD-MM-YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY', 'YYYY/MM/DD']);
        if (!momentDate.isValid()) {
          console.warn('Invalid date format:', date);
          return date;
        }
        return momentDate.format('dddd');
      } catch (error) {
        console.error('Error formatting date to day of week:', error);
        return date;
      }
    },

    groupGoalItemsRef(goalItems) {
      if (!goalItems || !Array.isArray(goalItems)) return [];

      const groupedGoalItems = [];
      let currentTaskRef = '';

      // Create a copy and add time information from routine tasks
      const goalItemsWithTime = goalItems.map((goalItem) => {
        const timeTask = (this.routines && Array.isArray(this.routines))
          ? this.routines.find((task) => task.taskId === goalItem.taskRef)
          : null;
        return {
          ...goalItem,
          time: timeTask ? timeTask.time : null,
        };
      });

      goalItemsWithTime.sort((a, b) => {
        if (a.taskRef < b.taskRef) {
          return -1;
        }
        if (a.taskRef > b.taskRef) {
          return 1;
        }
        return 0;
      });

      // Sort by time if available
      goalItemsWithTime.sort((a, b) => {
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });

      goalItemsWithTime.forEach((goalItem) => {
        if (goalItem.taskRef !== currentTaskRef) {
          currentTaskRef = goalItem.taskRef;
          const selectedTask = (this.routines && Array.isArray(this.routines))
            ? this.routines.find((task) => task.taskId === currentTaskRef)
            : null;
          const taskName = selectedTask ? selectedTask.name : `Task ${currentTaskRef}`;
          groupedGoalItems.push({ header: taskName });
        }
        groupedGoalItems.push(goalItem);
      });

      return groupedGoalItems;
    },

    async createTask() {
      if (!this.searchQuery.trim()) {
        this.error = 'Please enter a task description';
        return;
      }

      this.loading = true;
      this.error = '';

      try {
        // Call AI extraction mutation
        const result = await this.$apollo.mutate({
          mutation: gql`
            mutation extractDayTask($query: String!) {
              extractDayTask(query: $query) {
                title
                description
                dueDate
                tags
                priority
              }
            }
          `,
          variables: {
            query: this.searchQuery,
          },
        });

        if (result.data && result.data.extractDayTask) {
          this.taskData = {
            ...result.data.extractDayTask,
            goalRef: '', // Will be set by user or auto-selected
            taskRef: '', // Will be auto-selected below
            isMilestone: false, // Default to false
            dueDate: result.data.extractDayTask.dueDate || moment().format('YYYY-MM-DD'), // Default to today if no due date extracted
          };

          // Auto-select current task immediately if available
          if (this.$currentTaskData && this.$currentTaskData.id) {
            this.taskData.taskRef = this.$currentTaskData.id;

            // Also set default goalRef and milestone checkbox from currentTask if available
            this.$nextTick(() => {
              if (this.goalItemsRef && Array.isArray(this.goalItemsRef)) {
                const matchingGoalItem = this.goalItemsRef.find((item) => item.taskRef === this.$currentTaskData.id);
                if (matchingGoalItem) {
                  this.taskData.goalRef = matchingGoalItem.id;
                  this.taskData.isMilestone = true; // Auto-check milestone if week goal exists
                  console.log('Auto-selected week goal for task creation:', matchingGoalItem);
                }
              }
            });
          }
        } else {
          this.error = 'Failed to extract task information from your query';
        }
      } catch (error) {
        console.error('Error extracting task:', error);
        this.error = 'Failed to process your request. Please try again.';
      } finally {
        this.loading = false;
      }
    },

    async saveTask() {
      if (!this.taskData || !this.taskData.title || !this.taskData.description) {
        this.error = 'Please fill in all required fields';
        return;
      }

      this.saving = true;
      this.error = '';

      try {
        // Use the addGoalItem mutation to create the task
        const result = await this.$apollo.mutate({
          mutation: gql`
            mutation addGoalItem(
              $date: String!
              $period: String!
              $body: String!
              $contribution: String
              $taskRef: String!
              $goalRef: String
              $tags: [String]
              $isMilestone: Boolean!
            ) {
              addGoalItem(
                date: $date
                period: $period
                body: $body
                contribution: $contribution
                taskRef: $taskRef
                goalRef: $goalRef
                tags: $tags
                isMilestone: $isMilestone
              ) {
                id
                body
                contribution
                taskRef
                goalRef
                tags
                isMilestone
              }
            }
          `,
          variables: {
            date: this.getTaskDate(),
            period: 'day', // Always use day for tasks
            body: this.taskData.title,
            contribution: this.taskData.description,
            taskRef: this.taskData.taskRef || '',
            goalRef: this.taskData.isMilestone ? this.taskData.goalRef || null : null,
            tags: this.taskData.tags || [],
            isMilestone: this.taskData.isMilestone || false,
          },
        });

        if (result.data && result.data.addGoalItem) {
          this.taskSuccess = true;
          this.setLocalUserTag(this.taskData.tags || []);

          // Emit global event for dashboard refetch
          eventBus.$emit(EVENTS.TASK_CREATED, result.data.addGoalItem);

          // Close modal and reset form immediately for better UX
          this.resetForm();
          this.closeModal();
        } else {
          this.error = 'Failed to create task';
        }
      } catch (error) {
        console.error('Error saving task:', error);
        this.error = 'Failed to save task. Please try again.';
      } finally {
        this.saving = false;
      }
    },

    async searchGoals() {
      if (!this.searchQuery.trim()) {
        this.error = 'Please enter a search query';
        return;
      }

      this.loading = true;
      this.error = '';

      try {
        // Auto-select goal period based on query
        this.selectedGoalPeriod = this.autoSelectGoalPeriod(this.searchQuery);

        // Modify query based on intelligent period logic
        const modifiedQuery = this.modifyQueryPeriod(this.searchQuery);

        const result = await this.$apollo.mutate({
          mutation: gql`
            mutation generateMilestonePlan($query: String!) {
              generateMilestonePlan(query: $query) {
                period
                title
                entries {
                  period
                  periodName
                  date
                  title
                  description
                }
              }
            }
          `,
          variables: {
            query: modifiedQuery,
          },
        });

        if (result.data && result.data.generateMilestonePlan) {
          this.milestoneData = {
            ...result.data.generateMilestonePlan,
            isMilestone: false, // Default to false
            goalRef: null, // Default to null
          };
          this.editorKey += 1; // Force recreate editors

          // Auto-select routine after goals search if available
          this.$nextTick(() => {
            if (this.$currentTaskData && this.$currentTaskData.id && this.routines && this.routines.length > 0) {
              const currentTaskInRoutines = this.routines.find((routine) => routine.taskId === this.$currentTaskData.id);
              if (currentTaskInRoutines && !this.selectedRoutine) {
                this.selectedRoutine = this.$currentTaskData.id;
              }
            }
          });
        } else {
          this.error = 'No results found for your query';
        }
      } catch (error) {
        console.error('Error searching goals:', error);
        this.error = 'Failed to search. Please try again.';
      } finally {
        this.loading = false;
      }
    },

    modifyQueryPeriod(query) {
      const now = moment();
      let modifiedQuery = query;

      // Week logic
      if (/\bweek\b/i.test(query)) {
        const daysLeftInWeek = 7 - now.day(); // Sunday = 0, so days left including today

        if (daysLeftInWeek >= 5) {
          // 5-7 days left, use remaining days
          modifiedQuery = modifiedQuery.replace(/\bweek\b/gi, `${daysLeftInWeek} days`);
        } else {
          // Less than 5 days left, use next week starting Sunday
          modifiedQuery = modifiedQuery.replace(/\bweek\b/gi, 'next week starting Sunday');
        }
      }

      // Month logic
      if (/\bmonth\b/i.test(query)) {
        const daysLeftInMonth = now.clone().endOf('month').diff(now, 'days') + 1;
        const weeksLeftInMonth = Math.ceil(daysLeftInMonth / 7);

        if (weeksLeftInMonth >= 3) {
          // 3+ weeks left, use remaining weeks
          modifiedQuery = modifiedQuery.replace(/\bmonth\b/gi, `${weeksLeftInMonth} weeks`);
        } else {
          // Less than 3 weeks left, use next month
          const nextMonth = now.clone().add(1, 'month').format('MMMM YYYY');
          modifiedQuery = modifiedQuery.replace(/\bmonth\b/gi, `next month (${nextMonth})`);
        }
      }

      // Year logic
      if (/\byear\b/i.test(query)) {
        const monthsLeftInYear = 12 - now.month(); // month() returns 0-11

        if (monthsLeftInYear >= 6) {
          // 6+ months left, use remaining months
          modifiedQuery = modifiedQuery.replace(/\byear\b/gi, `${monthsLeftInYear} months`);
        } else {
          // Less than 6 months left, use next year
          const nextYear = now.clone().add(1, 'year').format('YYYY');
          modifiedQuery = modifiedQuery.replace(/\byear\b/gi, `next year (${nextYear})`);
        }
      }

      return modifiedQuery;
    },

    async saveGoals() {
      if (!this.milestoneData || !this.selectedRoutine || !this.selectedGoalPeriod) {
        this.error = 'Please select a routine and goal period';
        console.error('Missing required fields:', {
          milestoneData: !!this.milestoneData,
          selectedRoutine: !!this.selectedRoutine,
          selectedGoalPeriod: !!this.selectedGoalPeriod,
        });
        return;
      }

      this.saving = true;
      this.error = '';

      let planGoalRef = null;

      try {
        // Step 1: Always save the plan title as a goal item (regardless of milestone setting)
        if (this.milestoneData.title) {
          // Use the same period as the user's query, not the parent period
          const { date: planTitleDate, period: planTitlePeriod } = this.planTitlePeriodData;

          const planTitleResult = await this.$apollo.mutate({
            mutation: gql`
              mutation addGoalItem(
                $date: String!
                $period: String!
                $body: String!
                $taskRef: String!
                $isMilestone: Boolean!
                $goalRef: String
              ) {
                addGoalItem(
                  date: $date
                  period: $period
                  body: $body
                  taskRef: $taskRef
                  isMilestone: $isMilestone
                  goalRef: $goalRef
                ) {
                  id
                  body
                  isMilestone
                  goalRef
                }
              }
            `,
            variables: {
              date: planTitleDate,
              period: planTitlePeriod,
              body: this.milestoneData.title,
              taskRef: this.selectedRoutine,
              isMilestone: this.milestoneData.isMilestone || false, // Use the user's milestone setting
              goalRef: this.milestoneData.isMilestone ? (this.milestoneData.goalRef || null) : null, // Only link to parent if milestone
            },
          });

          if (planTitleResult.data && planTitleResult.data.addGoalItem) {
            planGoalRef = planTitleResult.data.addGoalItem.id;
          } else {
            throw new Error('Failed to save plan title - no data returned');
          }
        }

        // Step 2: Prepare timeline entries with the correct goalRef
        const goalItems = this.milestoneData.entries.map((entry) => {
          // Use the new function to get the correct entry period
          const entryPeriod = getTimelineEntryPeriod(this.milestoneData.period);

          // Validate that we have a valid date
          if (!entry.date) {
            console.error('Entry missing date:', entry);
            throw new Error('Invalid entry: missing date');
          }

          // Ensure date is in DD-MM-YYYY format
          let formattedDate = entry.date;

          // If date is in ISO format (YYYY-MM-DD), convert to DD-MM-YYYY
          if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
            formattedDate = moment(formattedDate, 'YYYY-MM-DD').format('DD-MM-YYYY');
          }

          // Validate final date format
          if (!/^\d{2}-\d{2}-\d{4}$/.test(formattedDate)) {
            console.error('Invalid date format:', formattedDate);
            throw new Error(`Invalid date format: ${formattedDate}`);
          }

          // For month plans, convert dates to end of month; for week plans, convert to Friday
          const timelineDate = getTimelineEntryDate(formattedDate, entryPeriod);

          return {
            date: timelineDate,
            period: entryPeriod,
            body: entry.title, // Use title as body
            contribution: entry.description, // Use description as contribution
            taskRef: this.selectedRoutine,
            isMilestone: true, // Timeline entries are always milestones that reference the plan title
            goalRef: planGoalRef, // Always link to the plan title
            tags: [], // Empty tags for bulk insert
          };
        });

        // Step 3: Use bulk mutation to save all timeline entries at once
        const result = await this.$apollo.mutate({
          mutation: gql`
            mutation bulkAddGoalItems($goalItems: [GoalItemInput!]!) {
              bulkAddGoalItems(goalItems: $goalItems) {
                id
                body
                contribution
                date
                period
                isMilestone
                goalRef
              }
            }
          `,
          variables: {
            goalItems,
          },
        });

        if (result.data && result.data.bulkAddGoalItems) {
          const savedItems = result.data.bulkAddGoalItems;
          const hasDayGoals = savedItems.some((item) => item.period === 'day');

          const eventData = {
            count: savedItems.length,
            period: this.milestoneData.period,
            hasDayGoals,
            items: savedItems,
          };

          // Emit global event for dashboard refetch
          eventBus.$emit(EVENTS.GOALS_SAVED, eventData);

          this.resetForm();
          this.closeModal();
        } else {
          this.error = 'Failed to save timeline entries';
          console.error('Bulk mutation failed - no data returned');
        }
      } catch (error) {
        console.error('Error saving goals:', error);

        // Fallback to individual mutations if bulk mutation fails
        try {
          // Save timeline entries individually using the already saved planGoalRef
          const mutations = this.milestoneData.entries.map((entry) => {
            // Use the new function to get the correct entry period
            const entryPeriod = getTimelineEntryPeriod(this.milestoneData.period);

            // Validate that we have a valid date
            if (!entry.date) {
              console.error('Entry missing date in fallback:', entry);
              throw new Error('Invalid entry: missing date');
            }

            // Ensure date is in DD-MM-YYYY format for fallback mutations too
            let formattedDate = entry.date;

            // If date is in ISO format (YYYY-MM-DD), convert to DD-MM-YYYY
            if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
              formattedDate = moment(formattedDate, 'YYYY-MM-DD').format('DD-MM-YYYY');
            }

            // Validate final date format
            if (!/^\d{2}-\d{2}-\d{4}$/.test(formattedDate)) {
              console.error('Fallback: Invalid date format:', formattedDate);
              throw new Error(`Fallback: Invalid date format: ${formattedDate}`);
            }

            // For week plans, convert daily dates to Friday of that week
            const timelineDate = getTimelineEntryDate(formattedDate, this.milestoneData.period);

            return this.$apollo.mutate({
              mutation: gql`
                mutation addGoalItem(
                  $date: String!
                  $period: String!
                  $body: String!
                  $contribution: String
                  $taskRef: String!
                  $isMilestone: Boolean!
                  $goalRef: String
                ) {
                  addGoalItem(
                    date: $date
                    period: $period
                    body: $body
                    contribution: $contribution
                    taskRef: $taskRef
                    isMilestone: $isMilestone
                    goalRef: $goalRef
                  ) {
                    id
                    body
                    contribution
                    isMilestone
                    goalRef
                  }
                }
              `,
              variables: {
                date: timelineDate,
                period: entryPeriod,
                body: entry.title, // Use title as body
                contribution: entry.description, // Use description as contribution
                taskRef: this.selectedRoutine,
                isMilestone: true, // Timeline entries are always milestones that reference the plan title
                goalRef: planGoalRef, // Always link to the plan title
              },
            });
          });

          await Promise.all(mutations);

          // Emit with estimated data since we don't have the response data structure
          const hasDayGoals = getTimelineEntryPeriod(this.milestoneData.period) === 'day';

          const eventData = {
            count: this.milestoneData.entries.length,
            period: this.milestoneData.period,
            hasDayGoals,
            items: [], // Individual mutations don't return structured data
          };

          // Emit global event for dashboard refetch
          eventBus.$emit(EVENTS.GOALS_SAVED, eventData);

          this.resetForm();
          this.closeModal();
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
          this.error = 'Failed to save goals. Please try again.';
        }
      } finally {
        this.saving = false;
      }
    },

    // Simple save goals method for testing
    async saveGoalsSimple() {
      if (!this.milestoneData || !this.selectedRoutine || !this.selectedGoalPeriod) {
        this.error = 'Please select a routine and goal period';
        return;
      }

      this.saving = true;
      this.error = '';

      try {
        // Prepare simple goal items without milestone functionality
        const goalItems = this.milestoneData.entries.map((entry) => {
          // Use the new function to get the correct entry period
          const entryPeriod = getTimelineEntryPeriod(this.milestoneData.period);

          // Ensure date is in DD-MM-YYYY format for simple save too
          let formattedDate = entry.date;

          // If date is in ISO format (YYYY-MM-DD), convert to DD-MM-YYYY
          if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
            formattedDate = moment(formattedDate, 'YYYY-MM-DD').format('DD-MM-YYYY');
          }

          // For week plans, convert daily dates to Friday of that week
          const timelineDate = getTimelineEntryDate(formattedDate, this.milestoneData.period);

          return {
            date: timelineDate,
            period: entryPeriod,
            body: entry.title, // Use title as body
            contribution: entry.description, // Use description as contribution
            taskRef: this.selectedRoutine,
            isMilestone: true, // Timeline entries are always milestones
            goalRef: null, // Simple save doesn't create plan title, so no goalRef
            tags: [],
          };
        });

        // Use individual mutations for now to test
        const mutations = goalItems.map((goalItem) => this.$apollo.mutate({
          mutation: gql`
            mutation addGoalItem(
              $date: String!
              $period: String!
              $body: String!
              $contribution: String
              $taskRef: String!
              $isMilestone: Boolean!
              $goalRef: String
            ) {
              addGoalItem(
                date: $date
                period: $period
                body: $body
                contribution: $contribution
                taskRef: $taskRef
                isMilestone: $isMilestone
                goalRef: $goalRef
              ) {
                id
                body
                contribution
              }
            }
          `,
          variables: {
            date: goalItem.date,
            period: goalItem.period,
            body: goalItem.body,
            contribution: goalItem.contribution,
            taskRef: goalItem.taskRef,
            isMilestone: goalItem.isMilestone,
            goalRef: goalItem.goalRef,
          },
        }));

        await Promise.all(mutations);

        const hasDayGoals = getTimelineEntryPeriod(this.milestoneData.period) === 'day';

        const eventData = {
          count: this.milestoneData.entries.length,
          period: this.milestoneData.period,
          hasDayGoals,
          items: [], // Simple save doesn't return structured data
        };

        // Emit global event for dashboard refetch
        eventBus.$emit(EVENTS.GOALS_SAVED, eventData);

        this.resetForm();
        this.closeModal();
      } catch (error) {
        console.error('Simple save error:', error);
        this.error = `Failed to save goals: ${error.message}`;
      } finally {
        this.saving = false;
      }
    },

    loadRoutines() {
      // Routines are now loaded via Apollo query (routineTasksData)
      // This method can be used for any additional loading logic if needed
    },

    loadGoalPeriods() {
      // This would load available periods for the selected routine
      // For now, keep the default options
    },

    getTimelineColor(period) {
      switch (period) {
        case 'week': return 'blue';
        case 'month': return 'green';
        case 'year': return 'purple';
        default: return 'grey';
      }
    },

    resetForm() {
      this.searchQuery = '';
      this.milestoneData = null;
      this.taskData = null;
      this.selectedRoutine = null;
      this.selectedGoalPeriod = null;
      this.error = '';
      this.taskSuccess = false;
    },

    closeModal() {
      this.resetForm();
      this.dialog = false;
    },

    refreshApolloQueries() {
      // Refresh all Apollo queries in this component when user logs in
      try {
        if (this.$apollo.queries.routineTasksData) {
          this.$apollo.queries.routineTasksData.refetch();
        }
        if (this.$apollo.queries.goalItemsRef) {
          this.$apollo.queries.goalItemsRef.refetch();
        }
        if (this.$apollo.queries.relatedGoalsData) {
          this.$apollo.queries.relatedGoalsData.refetch();
        }
      } catch (error) {
        console.warn('AiSearchModal: Error refreshing Apollo queries:', error);
      }
    },

    autoSelectGoalPeriod(query) {
      // Auto-select goal period based on keywords in the query
      const lowerQuery = query.toLowerCase();

      // Check for year keywords
      if (/\b(year|yearly|annual|annually|12 months?)\b/.test(lowerQuery)) {
        return 'year';
      }

      // Check for month keywords
      if (/\b(month|monthly|4 weeks?|30 days?)\b/.test(lowerQuery)) {
        return 'month';
      }

      // Check for week keywords or default to week
      if (/\b(week|weekly|7 days?)\b/.test(lowerQuery)) {
        return 'week';
      }

      // Default to week if no specific period is mentioned
      return 'week';
    },
  },
};
</script>

<style scoped>
.modern-card-elevated {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
  border-radius: 16px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modern-shadow-sm {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-radius: 12px;
}

.ai-modal {
  border-radius: 16px;
}

.sticky-header {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  background: white;
  z-index: 1;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  max-height: calc(90vh - 140px); /* Account for header and footer */
  position: relative;
}

.content-wrapper {
  width: 100%;
  position: relative;
}

/* Scroll shadow indicators */
.scroll-shadow {
  position: absolute;
  left: 0;
  right: 0;
  height: 8px;
  pointer-events: none;
  z-index: 2;
  transition: opacity 0.3s ease;
}

.scroll-shadow-top {
  top: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1), transparent);
}

.scroll-shadow-bottom {
  bottom: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.1), transparent);
}

.sticky-footer {
  flex-shrink: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  background: white;
  z-index: 1;
}

/* Custom Scrollbar Styles */
.scrollable-content::-webkit-scrollbar {
  width: 8px;
}

.scrollable-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.scrollable-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.scrollable-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.scrollable-content::-webkit-scrollbar-thumb:active {
  background: rgba(0, 0, 0, 0.4);
}

/* Firefox scrollbar */
.scrollable-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05);
}

/* Smooth scrolling */
.scrollable-content {
  scroll-behavior: smooth;
}

/* Better spacing for timeline items in scrollable area */
.scrollable-content .v-timeline {
  padding-top: 8px;
  padding-bottom: 8px;
}

/* Ensure timeline items don't get cut off */
.scrollable-content .v-timeline-item {
  margin-bottom: 12px;
}

/* Better spacing for cards within scrollable area */
.scrollable-content .v-card {
  margin-bottom: 16px;
}

.scrollable-content .v-card:last-child {
  margin-bottom: 8px;
}

.search-btn {
  margin-right: 8px;
}

.description-editor {
  margin-bottom: 16px;
}

.description-editor .v-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 4px;
  display: block;
}

/* Responsive adjustments for smaller screens */
@media (max-height: 600px) {
  .scrollable-content {
    max-height: calc(90vh - 120px);
  }
}

@media (max-height: 500px) {
  .scrollable-content {
    max-height: calc(90vh - 100px);
  }
}
</style>
