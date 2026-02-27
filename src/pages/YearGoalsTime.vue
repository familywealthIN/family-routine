<template>
  <container-box transparent="true" :isLoading="loading">
    <div class="year-goals-container">
      <!-- Header with Add Goal Button -->
      <atom-layout row wrap align-center class="mb-4">
        <atom-flex xs12>
          <h1 class="display-1">{{ yearGoalTitle }}</h1>
        </atom-flex>
      </atom-layout>

      <!-- Empty State -->
      <atom-layout v-if="!yearGoalsTree.length" justify-center class="mt-5">
        <atom-flex xs12 md8>
          <atom-card class="text-xs-center pa-5">
            <atom-icon size="64" color="grey lighten-1">timeline</atom-icon>
            <h2 class="headline mt-3">No Year Goals to Manage</h2>
            <p class="subheading grey--text mt-2">
              Create year goals from the Goals section to start adding month, week, and day milestones here
            </p>
          </atom-card>
        </atom-flex>
      </atom-layout>

      <!-- Year Goals Tree View -->
      <atom-layout v-else row wrap>
        <atom-flex xs12>
          <div v-for="yearGoal in yearGoalsTree" :key="yearGoal.id" class="year-goal-card mb-4">
            <atom-card>
              <!-- Year Goal Content: Description (3/4) + Progress Donut (1/4) -->
              <atom-card-text class="pa-3">
                <atom-layout row wrap>
                  <!-- Contribution/Description (3/4 width) -->
                  <atom-flex xs8 md9 class="pr-md-3">
                    <atom-layout align-center class="mb-2">
                      <atom-icon small class="mr-2">description</atom-icon>
                      <strong>Description</strong>
                    </atom-layout>
                    <div v-if="yearGoal.contribution" class="contribution-text">
                      <vue-markdown :source="yearGoal.contribution"></vue-markdown>
                    </div>
                    <div v-else class="grey--text">
                      No description provided
                    </div>
                  </atom-flex>

                  <!-- Progress Donut (1/4 width) -->
                  <atom-flex xs4 md3 class="text-xs-center">
                    <atom-layout column align-center justify-center fill-height>
                      <atom-progress-circular :value="calculateGoalProgress(yearGoal)"
                        :color="yearGoal.isComplete ? 'success' : 'primary'" size="120" width="8">
                        <div class="text-xs-center">
                          <div class="display-1 font-weight-bold">{{ Math.round(calculateGoalProgress(yearGoal)) }}%
                          </div>
                          <div class="caption grey--text">Complete</div>
                        </div>
                      </atom-progress-circular>
                    </atom-layout>
                  </atom-flex>
                </atom-layout>
              </atom-card-text>

              <atom-divider></atom-divider>

              <!-- Action Buttons -->
              <atom-card-actions class="px-3">
                <atom-button flat small color="primary" @click="editGoal(yearGoal)">
                  <atom-icon small left>edit</atom-icon>
                  Edit
                </atom-button>
                <atom-button flat small color="accent" @click="openCreateGoalDrawer('month', yearGoal)">
                  <atom-icon small left>add</atom-icon>
                  Add Month Goal
                </atom-button>
              </atom-card-actions>

              <atom-divider></atom-divider>

              <!-- Month Goals (Nested) -->
              <div v-if="yearGoal.monthGoals && yearGoal.monthGoals.length" class="nested-goals month-goals">
                <atom-subheader class="nested-header">
                  <atom-icon small class="mr-2">event</atom-icon>
                  Month Goals ({{ yearGoal.monthGoals.length }})
                </atom-subheader>

                <atom-expansion-panel v-model="yearGoal.expandedMonthIndex" class="nested-expansion">
                  <atom-expansion-panel-content v-for="monthGoal in yearGoal.monthGoals" :key="monthGoal.id"
                    class="month-goal-panel">
                    <!-- Month Goal Header -->
                    <template v-slot:header>
                      <atom-layout align-center>
                        <atom-flex shrink>
                          <atom-icon :color="monthGoal.isComplete ? 'success' : 'info'" small class="mr-2">
                            {{ monthGoal.isComplete ? 'check_circle' : 'radio_button_unchecked' }}
                          </atom-icon>
                        </atom-flex>
                        <atom-flex grow>
                          <div class="nested-goal-title">{{ monthGoal.body }}</div>
                          <div class="nested-goal-meta">
                            <span class="grey--text caption">{{ formatMonthDate(monthGoal.date) }}</span>
                          </div>
                        </atom-flex>
                        <atom-flex shrink>
                          <atom-chip small
                            :color="monthGoal.isComplete ? 'success' : (isCurrentMonth(monthGoal.date) ? 'info' : 'grey')"
                            text-color="white">
                            {{ monthGoal.isComplete ? 'Done' : (isCurrentMonth(monthGoal.date) ? 'Active' : 'Inactive')
                            }}
                          </atom-chip>
                        </atom-flex>
                      </atom-layout>
                    </template>

                    <!-- Month Goal Content -->
                    <atom-card flat class="nested-goal-content">
                      <atom-layout row wrap>
                        <!-- Month Description (50% on md+) -->
                        <atom-flex xs12 md6 class="pr-md-2">
                          <atom-card-text v-if="monthGoal.contribution" class="py-2">
                            <div class="contribution-text small">
                              <vue-markdown :source="monthGoal.contribution"></vue-markdown>
                            </div>
                          </atom-card-text>
                          <atom-card-text v-else class="py-2">
                            <div class="grey--text caption">No description</div>
                          </atom-card-text>

                          <atom-card-actions class="px-3 py-1">
                            <atom-button flat x-small color="primary" @click="editGoal(monthGoal)">
                              <atom-icon x-small left>edit</atom-icon>
                              Edit
                            </atom-button>
                            <atom-button flat x-small color="accent" @click="openCreateGoalDrawer('week', monthGoal)">
                              <atom-icon x-small left>add</atom-icon>
                              Add Week Goal
                            </atom-button>
                          </atom-card-actions>
                        </atom-flex>

                        <!-- Week Goals (50% on md+) -->
                        <atom-flex xs12 md6 class="pl-md-2">
                          <div v-if="monthGoal.weekGoals && monthGoal.weekGoals.length" class="nested-goals week-goals">
                            <atom-subheader class="nested-header py-0">
                              <atom-icon x-small class="mr-1">view_week</atom-icon>
                              Week Goals ({{ monthGoal.weekGoals.length }})
                            </atom-subheader>

                            <atom-list dense class="nested-list">
                              <template v-for="weekGoal in monthGoal.weekGoals">
                                <atom-list-tile v-if="weekGoal" :key="weekGoal.id" @click="toggleWeekGoal(weekGoal)"
                                  class="week-goal-tile">
                                  <atom-list-tile-action>
                                    <atom-icon :color="weekGoal.isComplete ? 'success' : 'warning'" small>
                                      {{ weekGoal.isComplete ? 'check_circle' : 'radio_button_unchecked' }}
                                    </atom-icon>
                                  </atom-list-tile-action>
                                  <atom-list-tile-content>
                                    <atom-list-tile-title>{{ weekGoal.body }}</atom-list-tile-title>
                                    <atom-list-tile-sub-title>{{ formatWeekDate(weekGoal.date) }}</atom-list-tile-sub-title>
                                  </atom-list-tile-content>
                                  <atom-list-tile-action>
                                    <atom-chip x-small
                                      :color="weekGoal.isComplete ? 'success' : (isCurrentWeek(weekGoal.date) ? 'warning' : 'grey')"
                                      text-color="white">
                                      {{ weekGoal.isComplete ? 'Done' : (isCurrentWeek(weekGoal.date) ? 'Active' :
                                      'Inactive') }}
                                    </atom-chip>
                                  </atom-list-tile-action>
                                  <atom-list-tile-action>
                                    <atom-menu offset-y>
                                      <template v-slot:activator="{ on }">
                                        <atom-button icon small v-on="on" @click.stop>
                                          <atom-icon small>more_vert</atom-icon>
                                        </atom-button>
                                      </template>
                                      <atom-list dense>
                                        <atom-list-tile @click="editGoal(weekGoal)">
                                          <atom-list-tile-title>
                                            <atom-icon small left>edit</atom-icon>
                                            Edit
                                          </atom-list-tile-title>
                                        </atom-list-tile>
                                        <atom-list-tile @click="openCreateGoalDrawer('day', weekGoal)">
                                          <atom-list-tile-title>
                                            <atom-icon small left>add</atom-icon>
                                            Add Day Goal
                                          </atom-list-tile-title>
                                        </atom-list-tile>
                                        <atom-divider></atom-divider>
                                        <atom-list-tile @click="deleteGoal(weekGoal)">
                                          <atom-list-tile-title class="red--text">
                                            <atom-icon small left color="red">delete</atom-icon>
                                            Delete
                                          </atom-list-tile-title>
                                        </atom-list-tile>
                                      </atom-list>
                                    </atom-menu>
                                  </atom-list-tile-action>
                                </atom-list-tile>

                                <!-- Day Goals (Nested under expanded week) -->
                                <atom-expand-transition :key="`expand-${weekGoal.id}`">
                                  <div
                                    v-if="weekGoal && weekGoal.expanded && weekGoal.dayGoals && weekGoal.dayGoals.length"
                                    class="nested-goals day-goals">
                                    <atom-list dense class="nested-list">
                                      <atom-list-tile v-for="dayGoal in weekGoal.dayGoals" :key="dayGoal.id"
                                        class="day-goal-tile">
                                        <atom-list-tile-action>
                                          <atom-icon :color="dayGoal.isComplete ? 'success' : 'grey'" x-small>
                                            {{ dayGoal.isComplete ? 'check_circle' : 'radio_button_unchecked' }}
                                          </atom-icon>
                                        </atom-list-tile-action>
                                        <atom-list-tile-content>
                                          <atom-list-tile-title class="caption">{{ dayGoal.body }}</atom-list-tile-title>
                                          <atom-list-tile-sub-title class="caption">{{ formatDayDate(dayGoal.date)
                                            }}</atom-list-tile-sub-title>
                                        </atom-list-tile-content>
                                        <atom-list-tile-action>
                                          <atom-button icon x-small @click="editGoal(dayGoal)">
                                            <atom-icon x-small>edit</atom-icon>
                                          </atom-button>
                                        </atom-list-tile-action>
                                      </atom-list-tile>
                                    </atom-list>
                                  </div>
                                </atom-expand-transition>
                              </template>
                            </atom-list>
                          </div>
                        </atom-flex>
                      </atom-layout>
                    </atom-card>
                  </atom-expansion-panel-content>
                </atom-expansion-panel>
              </div>
            </atom-card>
          </div>
        </atom-flex>
      </atom-layout>

      <!-- Goal Edit/Create Dialog -->
      <atom-dialog v-model="goalDrawer" fullscreen hide-overlay transition="dialog-bottom-transition">
        <atom-card>
          <atom-toolbar color="white">
            <atom-toolbar-title>
              <atom-icon left>{{ drawerGoal.id ? 'edit' : 'add' }}</atom-icon>
              {{ drawerGoal.id ? 'Edit' : 'Create' }} {{ drawerGoal.period }} Goal
            </atom-toolbar-title>
            <atom-spacer></atom-spacer>
            <atom-button icon @click="closeDrawer">
              <atom-icon>close</atom-icon>
            </atom-button>
          </atom-toolbar>
          <atom-card class="no-shadow">
            <atom-card-text class="pa-0">
              <goal-creation :newGoalItem="drawerGoal" v-on:add-update-goal-entry="handleGoalSaved" />
            </atom-card-text>
          </atom-card>
        </atom-card>
      </atom-dialog>
    </div>
  </container-box>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';
import VueMarkdown from 'vue-markdown';
import ContainerBox from '@/components/templates/ContainerBox/ContainerBox.vue';
import {
  AtomButton,
  AtomCard,
  AtomCardActions,
  AtomCardText,
  AtomChip,
  AtomDialog,
  AtomDivider,
  AtomExpandTransition,
  AtomExpansionPanel,
  AtomExpansionPanelContent,
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomList,
  AtomListTile,
  AtomListTileAction,
  AtomListTileContent,
  AtomListTileSubTitle,
  AtomListTileTitle,
  AtomMenu,
  AtomProgressCircular,
  AtomSpacer,
  AtomSubheader,
  AtomToolbar,
  AtomToolbarTitle,
} from '@/components/atoms';
import { defaultGoalItem } from '@/constants/goals';
import GoalCreation from '../containers/GoalCreationContainer.vue';

export default {
  name: 'YearGoalsTime',
  components: {
    GoalCreation,
    VueMarkdown,
    ContainerBox,
    AtomButton,
    AtomCard,
    AtomCardActions,
    AtomCardText,
    AtomChip,
    AtomDialog,
    AtomDivider,
    AtomExpandTransition,
    AtomExpansionPanel,
    AtomExpansionPanelContent,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomList,
    AtomListTile,
    AtomListTileAction,
    AtomListTileContent,
    AtomListTileSubTitle,
    AtomListTileTitle,
    AtomMenu,
    AtomProgressCircular,
    AtomSpacer,
    AtomSubheader,
    AtomToolbar,
    AtomToolbarTitle,
  },
  props: {
    tag: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      loading: true,
      yearGoalsTree: [],
      goalDrawer: false,
      drawerGoal: {
        ...defaultGoalItem, // Use defaultGoalItem as base
        period: 'year', // Override period for year goals
      },
    };
  },
  computed: {
    goalId() {
      return this.$route.params.id || null;
    },
    yearGoalTitle() {
      if (this.yearGoal && this.yearGoal.body) {
        return this.yearGoal.body;
      }
      if (this.tag) {
        return this.tag;
      }
      return `Year Goals ${moment().format('YYYY')}`;
    },
  },
  watch: {
    tag() {
      // Rebuild tree when tag changes
      if (this.yearGoal) {
        this.buildGoalTree(this.yearGoal);
      }
    },
    goalId(newVal) {
      // Refetch when goalId changes
      if (newVal) {
        this.loading = true;
        this.$apollo.queries.yearGoal.refetch();
      } else {
        // Clear data and stop loading when goalId is cleared
        this.loading = false;
        this.yearGoalsTree = [];
      }
    },
  },
  apollo: {
    yearGoal: {
      query: gql`
        query currentYearGoal($id: ID!) {
          currentYearGoal(id: $id) {
            id
            body
            date
            period
            status
            tags
            contribution
            taskRef
            goalRef
            routine {
              id
              body
            }
            milestones {
              id
              body
              date
              period
              status
              isComplete
              contribution
              taskRef
              goalRef
              routine {
                id
                body
              }
              milestones {
                id
                body
                date
                period
                status
                isComplete
                contribution
                taskRef
                goalRef
                milestones {
                  id
                  body
                  date
                  period
                  status
                  isComplete
                  contribution
                  taskRef
                  goalRef
                }
              }
            }
          }
        }
      `,
      variables() {
        return {
          id: this.goalId,
        };
      },
      skip() {
        return !this.$root.$data.email || !this.goalId;
      },
      update(data) {
        this.loading = false;
        console.log('[YearGoals] currentYearGoal response:', data.currentYearGoal);
        if (data.currentYearGoal) {
          this.buildGoalTree(data.currentYearGoal);
        }
        return data.currentYearGoal;
      },
      error(error) {
        this.loading = false;
        console.error('Error fetching year goal:', error);
      },
    },
  },
  mounted() {
    // If no goalId is provided, the query will be skipped, so set loading to false
    if (!this.goalId) {
      this.loading = false;
    }
  },
  methods: {
    buildGoalTree(goalItem) {
      console.log('[buildGoalTree] Input goalItem:', goalItem);

      // Handle single GoalItem instead of array
      if (!goalItem) {
        this.yearGoalsTree = [];
        return;
      }

      const tree = {
        ...goalItem,
        isComplete: goalItem.isComplete !== undefined ? goalItem.isComplete : this.isGoalComplete(goalItem),
        routineName: goalItem.routine ? goalItem.routine.body : null,
        monthGoals: [],
        expanded: false,
        expandedMonthIndex: null,
      };

      // Extract month goals from milestones
      if (goalItem.milestones && goalItem.milestones.length > 0) {
        tree.monthGoals = goalItem.milestones
          .filter((m) => m && m.period === 'month')
          .map((monthGoal) => ({
            ...monthGoal,
            isComplete: monthGoal.isComplete !== undefined ? monthGoal.isComplete : this.isGoalComplete(monthGoal),
            weekGoals: monthGoal.milestones && monthGoal.milestones.length > 0
              ? monthGoal.milestones
                .filter((w) => w && w.period === 'week')
                .map((weekGoal) => ({
                  ...weekGoal,
                  isComplete: weekGoal.isComplete !== undefined ? weekGoal.isComplete : this.isGoalComplete(weekGoal),
                  expanded: this.isCurrentWeek(weekGoal.date),
                  dayGoals: weekGoal.milestones && weekGoal.milestones.length > 0
                    ? weekGoal.milestones
                      .filter((d) => d && d.period === 'day')
                      .map((dayGoal) => ({
                        ...dayGoal,
                        isComplete: dayGoal.isComplete !== undefined ? dayGoal.isComplete : this.isGoalComplete(dayGoal),
                      }))
                    : [],
                }))
              : [],
          }));

        // Auto-expand current month
        const currentMonthIndex = tree.monthGoals.findIndex((m) => this.isCurrentMonth(m.date));
        if (currentMonthIndex !== -1) {
          tree.expandedMonthIndex = currentMonthIndex;
        }
      }

      this.yearGoalsTree = [tree];
    },

    isGoalComplete(goal) {
      if (!goal) return false;
      return goal.status === 'done';
    },

    calculateGoalProgress(yearGoal) {
      // Calculate completion percentage based on month goals
      if (!yearGoal.monthGoals || yearGoal.monthGoals.length === 0) {
        return yearGoal.isComplete ? 100 : 0;
      }

      const completedMonths = yearGoal.monthGoals.filter((m) => m.isComplete).length;
      return (completedMonths / yearGoal.monthGoals.length) * 100;
    },

    formatYearDate(date) {
      const m = moment(date, 'DD-MM-YYYY');
      return m.isValid() ? m.format('YYYY') : date;
    },

    formatMonthDate(date) {
      const m = moment(date, 'DD-MM-YYYY');
      return m.isValid() ? m.format('MMMM') : date;
    },

    formatWeekDate(date) {
      if (date && date.includes('W')) {
        const [, week] = date.split('-W');
        return `Week ${parseInt(week, 10)}`;
      }
      const m = moment(date, 'DD-MM-YYYY');
      return m.isValid() ? `Week ${m.week()}` : date;
    },

    formatDayDate(date) {
      const m = moment(date);
      return m.isValid() ? m.format('dddd, MMM D, YYYY') : date;
    },

    isCurrentMonth(date) {
      // Check if the given date is in the current month
      const currentMonth = moment().format('YYYY-MM');
      const goalMonth = moment(date, 'DD-MM-YYYY').format('YYYY-MM');
      return currentMonth === goalMonth;
    },

    isCurrentWeek(date) {
      // Check if the given date is in the current week
      const currentWeek = moment().format('YYYY-[W]WW');
      const goalWeek = moment(date, 'DD-MM-YYYY').format('YYYY-[W]WW');
      return currentWeek === goalWeek;
    },

    openCreateGoalDrawer(period, parentGoal = null) {
      const currentDate = moment();
      let date = '';

      // Calculate appropriate date based on period
      // CRITICAL: All dates must be in DD-MM-YYYY format
      switch (period) {
        case 'year':
          // Year period: last day of the year (December 31st)
          date = currentDate.clone().endOf('year').format('DD-MM-YYYY');
          break;
        case 'month':
          // Month period: last day of the month
          date = currentDate.clone().endOf('month').format('DD-MM-YYYY');
          break;
        case 'week':
          // Week period: last Friday of current week (DD-MM-YYYY format)
          // Week ends on Friday, not Sunday
          const currentDayOfWeek = currentDate.day(); // 0 = Sunday, 5 = Friday
          const daysUntilFriday = currentDayOfWeek <= 5 ? 5 - currentDayOfWeek : 7 - currentDayOfWeek + 5;
          date = currentDate.clone().add(daysUntilFriday, 'days').format('DD-MM-YYYY');
          break;
        case 'day':
          // Day period: current day in DD-MM-YYYY format
          date = currentDate.format('DD-MM-YYYY');
          break;
        default:
          date = currentDate.clone().endOf('year').format('DD-MM-YYYY');
          break;
      }

      this.drawerGoal = {
        body: '',
        period,
        date,
        tags: [],
        contribution: '',
        isMilestone: !!parentGoal,
        goalRef: parentGoal ? parentGoal.id : null,
      };

      this.goalDrawer = true;
    },

    editGoal(goal) {
      this.drawerGoal = {
        id: goal.id,
        body: goal.body,
        period: goal.period,
        date: goal.date,
        tags: goal.tags || [],
        contribution: goal.contribution || '',
        status: goal.status,
        taskRef: goal.taskRef || '',
        isMilestone: !!goal.goalRef,
        goalRef: goal.goalRef || null,
      };

      this.goalDrawer = true;
    },

    closeDrawer() {
      this.goalDrawer = false;
      this.drawerGoal = {
        body: '',
        period: 'year',
        date: '',
        tags: [],
        contribution: '',
        isMilestone: false,
        goalRef: null,
      };
    },

    handleGoalSaved() {
      // Refetch year goal to update tree
      this.$apollo.queries.yearGoal.refetch();
      this.closeDrawer();
    },

    handleGoalUpdated() {
      // Refetch year goal to update tree
      this.$apollo.queries.yearGoal.refetch();
      this.closeDrawer();
    },

    toggleWeekGoal(weekGoal) {
      // Toggle expansion of week goal to show day goals
      this.$set(weekGoal, 'expanded', !weekGoal.expanded);
    },

    async markComplete(goal) {
      try {
        await this.$goals.updateGoalItem({
          id: goal.id,
          body: goal.body,
          status: 'done',
        });

        // Refetch to update UI
        this.$apollo.queries.yearGoal.refetch();

        this.$notify({
          title: 'Success',
          text: 'Goal marked as complete',
          group: 'notify',
          type: 'success',
          duration: 3000,
        });
      } catch (error) {
        console.error('Error marking goal complete:', error);
        this.$notify({
          title: 'Error',
          text: 'Failed to mark goal as complete',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      }
    },

    async deleteGoal(goal) {
      if (!confirm(`Are you sure you want to delete "${goal.body}"?`)) {
        return;
      }

      try {
        await this.$goals.deleteGoalItem({
          id: goal.id,
          period: goal.period,
          date: goal.date,
        });

        // Refetch to update UI
        this.$apollo.queries.yearGoal.refetch();

        this.$notify({
          title: 'Success',
          text: 'Goal deleted successfully',
          group: 'notify',
          type: 'success',
          duration: 3000,
        });
      } catch (error) {
        console.error('Error deleting goal:', error);
        this.$notify({
          title: 'Error',
          text: 'Failed to delete goal',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      }
    },
  },
};
</script>

<style scoped>

/* Year Goal Panels */
.year-goal-panel {
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}

.year-goal-title {
  font-size: 18px;
  font-weight: 500;
  color: #1976d2;
}

.year-goal-meta {
  margin-top: 4px;
  font-size: 13px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.year-goal-content {
  background: #fafafa;
}

/* Contribution Section */
.contribution-section {
  background: white;
  border-left: 4px solid #1976d2;
  margin: 12px;
  border-radius: 4px;
}

.contribution-text {
  line-height: 1.6;
  color: #424242;
}

.contribution-text.small {
  font-size: 13px;
}

.contribution-text>>>p {
  margin-bottom: 8px;
}

.contribution-text>>>h1,
.contribution-text>>>h2,
.contribution-text>>>h3 {
  margin-top: 12px;
  margin-bottom: 8px;
}

/* Nested Goals Styling */
.nested-goals {
  background: white;
  margin: 8px 12px 12px 12px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.month-goals {
  border-left: 4px solid #0288d1;
}

.week-goals {
  border-left: 4px solid #ffa726;
  margin: 8px;
}

.day-goals {
  border-left: 4px solid #9e9e9e;
  margin-left: 48px;
  background: #f5f5f5;
}

.nested-header {
  font-weight: 500;
  color: #616161;
  height: 36px;
}

.nested-expansion {
  box-shadow: none !important;
}

.month-goal-panel {
  border-bottom: 1px solid #e0e0e0;
}

.month-goal-panel:last-child {
  border-bottom: none;
}

.nested-goal-title {
  font-size: 15px;
  font-weight: 400;
  color: #424242;
}

.nested-goal-meta {
  margin-top: 2px;
}

.nested-goal-content {
  background: #fafafa;
}

/* Week and Day Goal Tiles */
.week-goal-tile {
  border-bottom: 1px solid #eeeeee;
  cursor: pointer;
}

.week-goal-tile:hover {
  background: #f5f5f5;
}

.week-goal-tile:last-child {
  border-bottom: none;
}

.day-goal-tile {
  padding-left: 24px;
  border-bottom: 1px solid #f5f5f5;
}

.day-goal-tile:last-child {
  border-bottom: none;
}

/* Responsive */
@media (max-width: 768px) {
  .year-goals-container {
    padding: 12px;
  }

  .year-goal-title {
    font-size: 16px;
  }

  .nested-goals {
    margin: 4px 8px 8px 8px;
  }
}

/* Year Goal Card Styling */
.year-goal-card {
  transition: box-shadow 0.3s ease;
}

.year-goal-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
