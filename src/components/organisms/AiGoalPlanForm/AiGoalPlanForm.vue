<template>
  <div v-if="milestoneData && milestoneData.entries" class="goal-plan-form">
    <v-divider class="my-4"></v-divider>

    <!-- Plan Title (Editable) -->
    <v-text-field
      v-model="milestoneData.title"
      label="Plan Title (will be saved as parent goal)"
      prepend-icon="title"
      filled
      class="mb-3"
    ></v-text-field>

    <!-- Milestone Checkbox for Goals Plan -->
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

    <!-- Goal Reference (only show when milestone is checked) -->
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

    <!-- Routine and Period Selection -->
    <PlanConfigSelector
      :routines="routines"
      :selectedRoutine.sync="selectedRoutine"
      :selectedPeriod.sync="selectedGoalPeriod"
      :periodOptions="periodOptions"
    />

    <!-- Timeline Results Card -->
    <v-card outlined class="mb-4 modern-shadow-sm">
      <v-card-title class="subtitle-1">
        <v-icon left>timeline</v-icon>
        Generated {{ milestoneData.period }} Plan ({{ milestoneData.entries.length }} items)
      </v-card-title>
      <v-card-text>
        <v-timeline dense>
          <TimelineEntryEditor
            v-for="(entry, index) in milestoneData.entries"
            :key="index"
            :title.sync="entry.title"
            :description.sync="entry.description"
            :periodName="entry.periodName"
            :date="entry.date"
            :color="getTimelineColor(entry.period)"
            :editorKey="`${index}-${editorKey}`"
            :editorConfig="editorConfig"
          />
        </v-timeline>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';
import PlanConfigSelector from '../../molecules/PlanConfigSelector/PlanConfigSelector.vue';
import TimelineEntryEditor from '../../molecules/TimelineEntryEditor/TimelineEntryEditor.vue';
import eventBus, { EVENTS } from '../../../utils/eventBus';
import {
  stepupMilestonePeriodDate,
  getTimelineEntryPeriod,
  getTimelineEntryDate,
} from '../../../utils/getDates';

export default {
  name: 'OrganismAiGoalPlanForm',
  components: {
    PlanConfigSelector,
    TimelineEntryEditor,
  },
  props: {
    searchQuery: {
      type: String,
      required: true,
    },
    currentTask: {
      type: Object,
      default: null,
    },
    goalItemsRef: {
      type: Array,
      default: () => [],
    },
    routines: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      milestoneData: null,
      selectedRoutine: null,
      selectedGoalPeriod: null,
      editorKey: 0,
      saving: false,
      periodOptions: [
        { text: 'Week Goals', value: 'week' },
        { text: 'Month Goals', value: 'month' },
        { text: 'Year Goals', value: 'year' },
      ],
      editorConfig: {
        toolbar: false,
        status: false,
        spellChecker: false,
        hideIcons: ['side-by-side', 'fullscreen'],
        minHeight: '72px',
        maxHeight: '120px',
        placeholder: 'Enter goal description...',
        renderingConfig: {
          singleLineBreaks: true,
          markedOptions: {
            breaks: true,
            gfm: true,
          },
        },
        previewRender: (plainText) => plainText.replace(/\n/g, '<br>'),
      },
    };
  },
  computed: {
    planTitlePeriodData() {
      if (!this.milestoneData || !this.milestoneData.period) {
        return { date: '', period: '' };
      }
      const firstEntryDate = (this.milestoneData.entries[0] && this.milestoneData.entries[0].date) || moment().format('DD-MM-YYYY');
      const { date, period } = stepupMilestonePeriodDate(
        firstEntryDate,
        this.milestoneData.period,
      );
      return { date, period };
    },
  },
  watch: {
    searchQuery: {
      handler(newVal) {
        if (newVal && !this.milestoneData && !this.loading) {
          this.searchGoals();
        }
      },
      immediate: true,
    },
    milestoneData: {
      deep: true,
      handler(newVal) {
        // Enforce milestone/goalRef relationship
        if (newVal && !newVal.isMilestone) {
          this.milestoneData.goalRef = null;
        }
      },
    },
    currentTask(newVal) {
      if (newVal && newVal.id && this.routines.length > 0 && !this.selectedRoutine) {
        const currentTaskInRoutines = this.routines.find(
          (routine) => routine.taskId === newVal.id,
        );
        if (currentTaskInRoutines) {
          this.selectedRoutine = newVal.id;
        }
      }
    },
  },
  methods: {
    getTimelineColor(period) {
      switch (period) {
        case 'day':
          return 'success';
        case 'week':
          return 'primary';
        case 'month':
          return 'warning';
        case 'year':
          return 'info';
        default:
          return 'primary';
      }
    },
    autoSelectGoalPeriod(query) {
      const lowerQuery = query.toLowerCase();
      if (/\b(year|yearly|annual|annually|12 months?)\b/.test(lowerQuery)) {
        return 'year';
      }
      if (/\b(month|monthly|4 weeks?|30 days?)\b/.test(lowerQuery)) {
        return 'month';
      }
      if (/\b(week|weekly|7 days?)\b/.test(lowerQuery)) {
        return 'week';
      }
      return 'week';
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
    async searchGoals() {
      if (!this.searchQuery.trim()) {
        this.$emit('error', 'Please enter a search query');
        return;
      }

      this.$emit('update:loading', true);

      try {
        this.selectedGoalPeriod = this.autoSelectGoalPeriod(this.searchQuery);
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
            isMilestone: false,
            goalRef: null,
          };
          this.editorKey += 1;

          // Auto-select routine after goals search
          this.$nextTick(() => {
            if (this.currentTask && this.currentTask.id && this.routines.length > 0) {
              const currentTaskInRoutines = this.routines.find(
                (routine) => routine.taskId === this.currentTask.id,
              );
              if (currentTaskInRoutines && !this.selectedRoutine) {
                this.selectedRoutine = this.currentTask.id;
              }
            }
          });
        } else {
          this.$emit('error', 'No results found for your query');
        }
      } catch (error) {
        console.error('Error searching goals:', error);
        this.$emit('error', 'Failed to search. Please try again.');
      } finally {
        this.$emit('update:loading', false);
      }
    },
    async saveGoals() {
      if (!this.milestoneData || !this.selectedRoutine || !this.selectedGoalPeriod) {
        this.$emit('error', 'Please select a routine and goal period');
        return;
      }

      this.saving = true;
      this.$emit('update:saving', true);

      let planGoalRef = null;

      try {
        // Step 1: Save plan title as goal item
        if (this.milestoneData.title) {
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
              isMilestone: this.milestoneData.isMilestone || false,
              goalRef: this.milestoneData.isMilestone
                ? this.milestoneData.goalRef || null
                : null,
            },
          });

          if (planTitleResult.data && planTitleResult.data.addGoalItem) {
            planGoalRef = planTitleResult.data.addGoalItem.id;
          } else {
            throw new Error('Failed to save plan title');
          }
        }

        // Step 2: Prepare timeline entries
        const goalItems = this.milestoneData.entries.map((entry) => {
          const entryPeriod = getTimelineEntryPeriod(this.milestoneData.period);

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
            taskRef: this.selectedRoutine,
            isMilestone: true,
            goalRef: planGoalRef,
            tags: [],
          };
        });

        // Step 3: Bulk save timeline entries
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

          eventBus.$emit(EVENTS.GOALS_SAVED, {
            count: savedItems.length,
            period: this.milestoneData.period,
            hasDayGoals,
            items: savedItems,
          });

          this.$emit('goals-saved', savedItems);
          this.$emit('success');
        } else {
          throw new Error('Bulk mutation failed');
        }
      } catch (error) {
        console.error('Error saving goals (attempting fallback):', error);

        // Fallback: Individual mutations
        try {
          const mutations = this.milestoneData.entries.map((entry) => {
            const entryPeriod = getTimelineEntryPeriod(this.milestoneData.period);

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
                body: entry.title,
                contribution: entry.description,
                taskRef: this.selectedRoutine,
                isMilestone: true,
                goalRef: planGoalRef,
              },
            });
          });

          await Promise.all(mutations);

          const hasDayGoals = getTimelineEntryPeriod(this.milestoneData.period) === 'day';

          eventBus.$emit(EVENTS.GOALS_SAVED, {
            count: this.milestoneData.entries.length,
            period: this.milestoneData.period,
            hasDayGoals,
            items: [],
          });

          this.$emit('goals-saved', []);
          this.$emit('success');
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
          this.$emit('error', 'Failed to save goals. Please try again.');
        }
      } finally {
        this.saving = false;
        this.$emit('update:saving', false);
      }
    },
    resetForm() {
      this.milestoneData = null;
      this.selectedRoutine = null;
      this.selectedGoalPeriod = null;
      this.editorKey = 0;
      this.saving = false;
    },
  },
};
</script>

<style scoped>
.goal-plan-form {
  /* Component styles */
}

.modern-shadow-sm {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
