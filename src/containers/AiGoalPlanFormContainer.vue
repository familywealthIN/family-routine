<template>
  <AiGoalPlanForm
    ref="goalForm"
    :searchQuery="searchQuery"
    :goalItemsRef="goalItemsRef"
    :tasklist="tasklist"
    :loading="loading"
    :milestoneData="milestoneData"
    :saving="saving"
    :selectedPeriod="selectedPeriod"
    :selectedDate="selectedDate"
    :selectedTaskRef="selectedTaskRef"
    :selectedGoalRef="selectedGoalRef"
    @update:valid="$emit('update:valid', $event)"
    @update:loading="loading = $event"
    @update:saving="saving = $event"
    @period-above-changed="$emit('period-above-changed', $event)"
    @error="$emit('error', $event)"
    @success="$emit('success')"
    @goals-saved="$emit('goals-saved', $event)"
    @search-goals="handleSearchGoals"
    @save-goals="handleSaveGoals"
    @reset-form="handleResetForm"
    @update:milestoneData="milestoneData = $event"
  />
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';
import AiGoalPlanForm from '../components/organisms/AiGoalPlanForm/AiGoalPlanForm.vue';
import eventBus, { EVENTS } from '../utils/eventBus';
import {
  stepupMilestonePeriodDate,
  getTimelineEntryPeriod,
  getTimelineEntryDate,
} from '../utils/getDates';
import { addMultipleGoalItemsToCache } from '../composables/useApolloCacheUpdates';

export default {
  name: 'AiGoalPlanFormContainer',
  components: {
    AiGoalPlanForm,
  },
  props: {
    searchQuery: {
      type: String,
      required: true,
    },
    goalItemsRef: {
      type: Array,
      default: () => [],
    },
    tasklist: {
      type: Array,
      default: () => [],
    },
    // Props from GoalTaskToolbar
    selectedPeriod: {
      type: String,
      default: 'day',
    },
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
    /**
     * Parent goal context for AI prompt enrichment.
     * When provided, the parent goal's body + contribution are injected as context.
     * Expected: { body: string, contribution: string } or null
     */
    parentGoalContext: {
      type: Object,
      default: null,
    },
    /**
     * Dashboard context from cached area/project Description + Next Steps.
     * When provided, injected as additional system prompt context.
     * Expected: { description: string, nextSteps: string } or null
     */
    dashboardContext: {
      type: Object,
      default: null,
    },
    promptTags: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      loading: false,
      saving: false,
      milestoneData: null,
    };
  },
  watch: {
    // Emit loading state changes to parent
    loading(newVal) {
      this.$emit('update:loading', newVal);
    },
    // Emit saving state changes to parent
    saving(newVal) {
      this.$emit('update:saving', newVal);
    },
  },
  methods: {
    getSelectedRoutineContext() {
      if (!this.selectedTaskRef || !Array.isArray(this.tasklist) || this.tasklist.length === 0) {
        return null;
      }

      const routine = this.tasklist.find(
        (task) => task.id === this.selectedTaskRef || task.taskId === this.selectedTaskRef,
      );

      if (!routine || !routine.description) {
        return null;
      }

      return {
        name: routine.name || routine.body || routine.title || 'Selected Routine',
        description: routine.description,
      };
    },

    // Expose saveGoals method for parent to call via ref
    saveGoals() {
      if (this.$refs.goalForm) {
        this.$refs.goalForm.saveGoals();
      }
    },
    // Expose searchGoals method for parent to call via ref
    searchGoals() {
      this.handleSearchGoals();
    },
    // Expose resetForm method for parent to call via ref
    resetForm() {
      this.handleResetForm();
      if (this.$refs.goalForm) {
        this.$refs.goalForm.resetForm();
      }
    },
    modifyQueryPeriod(query) {
      const now = moment();
      let modifiedQuery = query;

      // Week logic
      if (/\bweek\b/i.test(query)) {
        const daysLeftInWeek = 7 - now.day();
        if (daysLeftInWeek >= 5) {
          modifiedQuery = modifiedQuery.replace(/\bweek\b/gi, `${daysLeftInWeek} days`);
        } else {
          modifiedQuery = modifiedQuery.replace(/\bweek\b/gi, 'next week starting Sunday');
        }
      }

      // Month logic
      if (/\bmonth\b/i.test(query)) {
        const daysLeftInMonth = now.clone().endOf('month').diff(now, 'days') + 1;
        const weeksLeftInMonth = Math.ceil(daysLeftInMonth / 7);
        if (weeksLeftInMonth >= 3) {
          modifiedQuery = modifiedQuery.replace(/\bmonth\b/gi, `${weeksLeftInMonth} weeks`);
        } else {
          const nextMonth = now.clone().add(1, 'month').format('MMMM YYYY');
          modifiedQuery = modifiedQuery.replace(/\bmonth\b/gi, `next month (${nextMonth})`);
        }
      }

      // Year logic
      if (/\byear\b/i.test(query)) {
        const monthsLeftInYear = 12 - now.month();
        if (monthsLeftInYear >= 6) {
          modifiedQuery = modifiedQuery.replace(/\byear\b/gi, `${monthsLeftInYear} months`);
        } else {
          const nextYear = now.clone().add(1, 'year').format('YYYY');
          modifiedQuery = modifiedQuery.replace(/\byear\b/gi, `next year (${nextYear})`);
        }
      }

      return modifiedQuery;
    },

    async handleSearchGoals() {
      if (!this.searchQuery.trim()) {
        this.$emit('error', 'Please enter a search query');
        return;
      }

      this.loading = true;

      try {
        const modifiedQuery = this.modifyQueryPeriod(this.searchQuery);

        // Build system prompt from routine, parent goal, and dashboard context if available.
        let systemPrompt = null;
        const parts = [];
        const routineContext = this.getSelectedRoutineContext();

        if (routineContext) {
          parts.push(
            `Selected Routine: ${routineContext.name}\nRoutine Description: ${routineContext.description}`,
          );
        }

        if (this.parentGoalContext) {
          if (this.parentGoalContext.body) {
            parts.push(`Parent Goal: ${this.parentGoalContext.body}`);
          }
          if (this.parentGoalContext.contribution) {
            parts.push(`Description: ${this.parentGoalContext.contribution}`);
          }
        }

        if (parts.length > 0) {
          systemPrompt = parts.join('\n');
        }

        // Merge dashboard context (cached area/project Description + Next Steps)
        if (this.dashboardContext) {
          const dashboardParts = [];
          if (this.dashboardContext.description) {
            dashboardParts.push(`Area/Project Description:\n${this.dashboardContext.description}`);
          }
          if (this.dashboardContext.nextSteps) {
            dashboardParts.push(`Area/Project Next Steps:\n${this.dashboardContext.nextSteps}`);
          }
          if (dashboardParts.length > 0) {
            const dashboardPrompt = `${dashboardParts.join('\n\n')
            }\n\nUse the above area/project context to align the plan with ongoing progress and next steps.`;
            systemPrompt = systemPrompt
              ? `${systemPrompt}\n\n${dashboardPrompt}`
              : dashboardPrompt;
          }
        }

        const result = await this.$apollo.mutate({
          mutation: gql`
            mutation generateMilestonePlan($query: String!, $systemPrompt: String) {
              generateMilestonePlan(query: $query, systemPrompt: $systemPrompt) {
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
            systemPrompt,
          },
        });

        if (result.data && result.data.generateMilestonePlan) {
          this.milestoneData = {
            ...result.data.generateMilestonePlan,
          };

          this.$emit('search-complete', {
            milestoneData: this.milestoneData,
            selectedGoalPeriod: this.selectedPeriod,
          });
        } else {
          this.$emit('error', 'No results found for your query');
        }
      } catch (error) {
        console.error('Error searching goals:', error);
        this.$emit('error', 'Failed to search. Please try again.');
      } finally {
        this.loading = false;
      }
    },

    async handleSaveGoals(saveData) {
      const {
        milestoneData,
        planTitleGoalData,
        selectedGoalRef,
      } = saveData;

      if (!milestoneData || !this.selectedTaskRef || !this.selectedPeriod) {
        this.$emit('error', 'Please select a routine and goal period');
        return;
      }

      this.saving = true;

      try {
        // Step 1: Save plan title as goal item (must await to get planGoalRef)
        let planGoalRef = null;
        if (milestoneData.title) {
          const { date: planTitleDate, period: planTitlePeriod } = planTitleGoalData;

          const planTitleResult = await this.$goals.addGoalItem({
            date: planTitleDate,
            period: planTitlePeriod,
            body: milestoneData.title,
            taskRef: this.selectedTaskRef,
            isMilestone: !!selectedGoalRef,
            goalRef: selectedGoalRef || null,
            tags: [...this.promptTags],
          });

          if (planTitleResult && planTitleResult.id) {
            planGoalRef = planTitleResult.id;
          } else {
            throw new Error('Failed to save plan title');
          }
        }

        // Step 2: Prepare timeline entries
        const goalItems = milestoneData.entries.map((entry) => {
          const entryPeriod = getTimelineEntryPeriod(milestoneData.period);

          if (!entry.date) {
            throw new Error('Invalid entry: missing date');
          }

          let formattedDate = entry.date;
          if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
            formattedDate = moment(formattedDate, 'YYYY-MM-DD').format('DD-MM-YYYY');
          }

          if (!/^\d{2}-\d{2}-\d{4}$/.test(formattedDate)) {
            throw new Error(`Invalid date format: ${formattedDate}`);
          }

          const timelineDate = getTimelineEntryDate(formattedDate, entryPeriod);

          return {
            date: timelineDate,
            period: entryPeriod,
            body: entry.title,
            contribution: entry.description,
            taskRef: this.selectedTaskRef,
            isMilestone: true,
            goalRef: planGoalRef,
            tags: [...this.promptTags],
          };
        });

        // Close modal immediately — cache will be updated when server responds
        const hasDayGoals = goalItems.some((item) => item.period === 'day');
        this.saving = false;
        this.$emit('goals-saved', goalItems);
        this.$emit('success');

        // Step 3: Bulk save timeline entries in background
        this.$apollo.mutate({
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
        }).then((result) => {
          if (result.data && result.data.bulkAddGoalItems) {
            const savedItems = result.data.bulkAddGoalItems;

            // Update Apollo cache for each period
            const itemsByDatePeriod = {};
            savedItems.forEach((item) => {
              const key = `${item.date}-${item.period}`;
              if (!itemsByDatePeriod[key]) {
                itemsByDatePeriod[key] = [];
              }
              itemsByDatePeriod[key].push(item);
            });

            Object.keys(itemsByDatePeriod).forEach((key) => {
              const items = itemsByDatePeriod[key];
              const firstItem = items[0];
              addMultipleGoalItemsToCache(this.$apollo.provider.defaultClient, {
                goalItems: items,
                date: firstItem.date,
                period: firstItem.period,
              });
            });

            eventBus.$emit(EVENTS.GOALS_SAVED, {
              count: savedItems.length,
              period: milestoneData.period,
              hasDayGoals: savedItems.some((item) => item.period === 'day'),
              items: savedItems,
            });
          }
        }).catch((bulkError) => {
          console.error('Bulk save failed, attempting fallback:', bulkError);

          // Fallback: Individual mutations
          const mutations = milestoneData.entries.map((entry) => {
            const entryPeriod = getTimelineEntryPeriod(milestoneData.period);
            let formattedDate = entry.date;
            if (/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
              formattedDate = moment(formattedDate, 'YYYY-MM-DD').format('DD-MM-YYYY');
            }
            const timelineDate = getTimelineEntryDate(formattedDate, milestoneData.period);

            return this.$goals.addGoalItem({
              date: timelineDate,
              period: entryPeriod,
              body: entry.title,
              contribution: entry.description,
              taskRef: this.selectedTaskRef,
              isMilestone: true,
              goalRef: planGoalRef,
            });
          });

          Promise.all(mutations)
            .then(() => {
              eventBus.$emit(EVENTS.GOALS_SAVED, {
                count: milestoneData.entries.length,
                period: milestoneData.period,
                hasDayGoals,
                items: [],
              });
            })
            .catch((fallbackError) => {
              console.error('Fallback also failed:', fallbackError);
              this.$emit('error', 'Failed to save goals. Please try again.');
            });
        });
      } catch (error) {
        console.error('Error saving goals:', error);
        this.$emit('error', 'Failed to save goals. Please try again.');
        this.saving = false;
      }
    },

    handleResetForm() {
      this.milestoneData = null;
      this.loading = false;
      this.saving = false;
    },
  },
};
</script>
