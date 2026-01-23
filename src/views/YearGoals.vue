<template>
  <container-box transparent="true" :isLoading="loading">
    <div class="year-goals-container">
      <!-- Header with Add Goal Button -->
      <v-layout row wrap align-center class="mb-4">
        <v-flex xs12>
          <h1 class="display-1">{{ yearGoalTitle }}</h1>
        </v-flex>
      </v-layout>

      <!-- Empty State -->
      <v-layout v-if="!yearGoalsTree.length" justify-center class="mt-5">
        <v-flex xs12 md8>
          <v-card class="text-xs-center pa-5">
            <v-icon size="64" color="grey lighten-1">timeline</v-icon>
            <h2 class="headline mt-3">No Year Goals to Manage</h2>
            <p class="subheading grey--text mt-2">
              Create year goals from the Goals section to start adding month, week, and day milestones here
            </p>
          </v-card>
        </v-flex>
      </v-layout>

      <!-- Year Goals Tree View -->
      <v-layout v-else row wrap>
        <v-flex xs12>
          <div v-for="yearGoal in yearGoalsTree" :key="yearGoal.id" class="year-goal-card mb-4">
            <v-card>
              <!-- Year Goal Content: Description (3/4) + Progress Donut (1/4) -->
              <v-card-text class="pa-3">
                <v-layout row wrap>
                  <!-- Contribution/Description (3/4 width) -->
                  <v-flex xs8 md9 class="pr-md-3">
                    <v-layout align-center class="mb-2">
                      <v-icon small class="mr-2">description</v-icon>
                      <strong>Description</strong>
                    </v-layout>
                    <div v-if="yearGoal.contribution" class="contribution-text">
                      <vue-markdown :source="yearGoal.contribution"></vue-markdown>
                    </div>
                    <div v-else class="grey--text">
                      No description provided
                    </div>
                  </v-flex>

                  <!-- Progress Donut (1/4 width) -->
                  <v-flex xs4 md3 class="text-xs-center">
                    <v-layout column align-center justify-center fill-height>
                      <v-progress-circular :value="calculateGoalProgress(yearGoal)"
                        :color="yearGoal.isComplete ? 'success' : 'primary'" size="120" width="8">
                        <div class="text-xs-center">
                          <div class="display-1 font-weight-bold">{{ Math.round(calculateGoalProgress(yearGoal)) }}%
                          </div>
                          <div class="caption grey--text">Complete</div>
                        </div>
                      </v-progress-circular>
                    </v-layout>
                  </v-flex>
                </v-layout>
              </v-card-text>

              <v-divider></v-divider>

              <!-- Action Buttons -->
              <v-card-actions class="px-3">
                <v-btn flat small color="primary" @click="editGoal(yearGoal)">
                  <v-icon small left>edit</v-icon>
                  Edit
                </v-btn>
                <v-btn flat small color="accent" @click="openCreateGoalDrawer('month', yearGoal)">
                  <v-icon small left>add</v-icon>
                  Add Month Goal
                </v-btn>
              </v-card-actions>

              <v-divider></v-divider>

              <!-- Month Goals (Nested) -->
              <div v-if="yearGoal.monthGoals && yearGoal.monthGoals.length" class="nested-goals month-goals">
                <v-subheader class="nested-header">
                  <v-icon small class="mr-2">event</v-icon>
                  Month Goals ({{ yearGoal.monthGoals.length }})
                </v-subheader>

                <v-expansion-panel v-model="yearGoal.expandedMonthIndex" class="nested-expansion">
                  <v-expansion-panel-content v-for="monthGoal in yearGoal.monthGoals" :key="monthGoal.id"
                    class="month-goal-panel">
                    <!-- Month Goal Header -->
                    <template v-slot:header>
                      <v-layout align-center>
                        <v-flex shrink>
                          <v-icon :color="monthGoal.isComplete ? 'success' : 'info'" small class="mr-2">
                            {{ monthGoal.isComplete ? 'check_circle' : 'radio_button_unchecked' }}
                          </v-icon>
                        </v-flex>
                        <v-flex grow>
                          <div class="nested-goal-title">{{ monthGoal.body }}</div>
                          <div class="nested-goal-meta">
                            <span class="grey--text caption">{{ formatMonthDate(monthGoal.date) }}</span>
                          </div>
                        </v-flex>
                        <v-flex shrink>
                          <v-chip small
                            :color="monthGoal.isComplete ? 'success' : (isCurrentMonth(monthGoal.date) ? 'info' : 'grey')"
                            text-color="white">
                            {{ monthGoal.isComplete ? 'Done' : (isCurrentMonth(monthGoal.date) ? 'Active' : 'Inactive')
                            }}
                          </v-chip>
                        </v-flex>
                      </v-layout>
                    </template>

                    <!-- Month Goal Content -->
                    <v-card flat class="nested-goal-content">
                      <v-layout row wrap>
                        <!-- Month Description (50% on md+) -->
                        <v-flex xs12 md6 class="pr-md-2">
                          <v-card-text v-if="monthGoal.contribution" class="py-2">
                            <div class="contribution-text small">
                              <vue-markdown :source="monthGoal.contribution"></vue-markdown>
                            </div>
                          </v-card-text>
                          <v-card-text v-else class="py-2">
                            <div class="grey--text caption">No description</div>
                          </v-card-text>

                          <v-card-actions class="px-3 py-1">
                            <v-btn flat x-small color="primary" @click="editGoal(monthGoal)">
                              <v-icon x-small left>edit</v-icon>
                              Edit
                            </v-btn>
                            <v-btn flat x-small color="accent" @click="openCreateGoalDrawer('week', monthGoal)">
                              <v-icon x-small left>add</v-icon>
                              Add Week Goal
                            </v-btn>
                          </v-card-actions>
                        </v-flex>

                        <!-- Week Goals (50% on md+) -->
                        <v-flex xs12 md6 class="pl-md-2">
                          <div v-if="monthGoal.weekGoals && monthGoal.weekGoals.length" class="nested-goals week-goals">
                            <v-subheader class="nested-header py-0">
                              <v-icon x-small class="mr-1">view_week</v-icon>
                              Week Goals ({{ monthGoal.weekGoals.length }})
                            </v-subheader>

                            <v-list dense class="nested-list">
                              <template v-for="weekGoal in monthGoal.weekGoals">
                                <v-list-tile v-if="weekGoal" :key="weekGoal.id" @click="toggleWeekGoal(weekGoal)"
                                  class="week-goal-tile">
                                  <v-list-tile-action>
                                    <v-icon :color="weekGoal.isComplete ? 'success' : 'warning'" small>
                                      {{ weekGoal.isComplete ? 'check_circle' : 'radio_button_unchecked' }}
                                    </v-icon>
                                  </v-list-tile-action>
                                  <v-list-tile-content>
                                    <v-list-tile-title>{{ weekGoal.body }}</v-list-tile-title>
                                    <v-list-tile-sub-title>{{ formatWeekDate(weekGoal.date) }}</v-list-tile-sub-title>
                                  </v-list-tile-content>
                                  <v-list-tile-action>
                                    <v-chip x-small
                                      :color="weekGoal.isComplete ? 'success' : (isCurrentWeek(weekGoal.date) ? 'warning' : 'grey')"
                                      text-color="white">
                                      {{ weekGoal.isComplete ? 'Done' : (isCurrentWeek(weekGoal.date) ? 'Active' :
                                      'Inactive') }}
                                    </v-chip>
                                  </v-list-tile-action>
                                  <v-list-tile-action>
                                    <v-menu offset-y>
                                      <template v-slot:activator="{ on }">
                                        <v-btn icon small v-on="on" @click.stop>
                                          <v-icon small>more_vert</v-icon>
                                        </v-btn>
                                      </template>
                                      <v-list dense>
                                        <v-list-tile @click="editGoal(weekGoal)">
                                          <v-list-tile-title>
                                            <v-icon small left>edit</v-icon>
                                            Edit
                                          </v-list-tile-title>
                                        </v-list-tile>
                                        <v-list-tile @click="openCreateGoalDrawer('day', weekGoal)">
                                          <v-list-tile-title>
                                            <v-icon small left>add</v-icon>
                                            Add Day Goal
                                          </v-list-tile-title>
                                        </v-list-tile>
                                      </v-list>
                                    </v-menu>
                                  </v-list-tile-action>
                                </v-list-tile>

                                <!-- Day Goals (Nested under expanded week) -->
                                <v-expand-transition :key="`expand-${weekGoal.id}`">
                                  <div
                                    v-if="weekGoal && weekGoal.expanded && weekGoal.dayGoals && weekGoal.dayGoals.length"
                                    class="nested-goals day-goals">
                                    <v-list dense class="nested-list">
                                      <v-list-tile v-for="dayGoal in weekGoal.dayGoals" :key="dayGoal.id"
                                        class="day-goal-tile">
                                        <v-list-tile-action>
                                          <v-icon :color="dayGoal.isComplete ? 'success' : 'grey'" x-small>
                                            {{ dayGoal.isComplete ? 'check_circle' : 'radio_button_unchecked' }}
                                          </v-icon>
                                        </v-list-tile-action>
                                        <v-list-tile-content>
                                          <v-list-tile-title class="caption">{{ dayGoal.body }}</v-list-tile-title>
                                          <v-list-tile-sub-title class="caption">{{ formatDayDate(dayGoal.date)
                                            }}</v-list-tile-sub-title>
                                        </v-list-tile-content>
                                        <v-list-tile-action>
                                          <v-btn icon x-small @click="editGoal(dayGoal)">
                                            <v-icon x-small>edit</v-icon>
                                          </v-btn>
                                        </v-list-tile-action>
                                      </v-list-tile>
                                    </v-list>
                                  </div>
                                </v-expand-transition>
                              </template>
                            </v-list>
                          </div>
                        </v-flex>
                      </v-layout>
                    </v-card>
                  </v-expansion-panel-content>
                </v-expansion-panel>
              </div>
            </v-card>
          </div>
        </v-flex>
      </v-layout>

      <!-- Goal Edit/Create Dialog -->
      <v-dialog v-model="goalDrawer" fullscreen hide-overlay transition="dialog-bottom-transition">
        <v-card>
          <v-toolbar color="white">
            <v-toolbar-title>
              <v-icon left>{{ drawerGoal.id ? 'edit' : 'add' }}</v-icon>
              {{ drawerGoal.id ? 'Edit' : 'Create' }} {{ drawerGoal.period }} Goal
            </v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon @click="closeDrawer">
              <v-icon>close</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card class="no-shadow">
            <v-card-text class="pa-0">
              <goal-creation :newGoalItem="drawerGoal" v-on:add-update-goal-entry="handleGoalSaved" />
            </v-card-text>
          </v-card>
        </v-card>
      </v-dialog>
    </div>
  </container-box>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';
import VueMarkdown from 'vue-markdown';
import GoalCreation from '@/components/organisms/GoalCreation/GoalCreation.vue';
import ContainerBox from '@/components/templates/ContainerBox/ContainerBox.vue';

export default {
  name: 'YearGoals',
  components: {
    GoalCreation,
    VueMarkdown,
    ContainerBox,
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
        body: '',
        period: 'year',
        date: '',
        tags: [],
        contribution: '',
        isMilestone: false,
        goalRef: null,
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
    goalId() {
      // Refetch when goalId changes
      if (this.goalId) {
        this.loading = true;
        this.$apollo.queries.yearGoal.refetch();
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
      switch (period) {
        case 'year':
          date = currentDate.format('YYYY');
          break;
        case 'month':
          date = currentDate.format('YYYY-MM');
          break;
        case 'week':
          date = currentDate.format('YYYY-[W]WW');
          break;
        case 'day':
          date = currentDate.format('YYYY-MM-DD');
          break;
        default:
          date = currentDate.format('YYYY');
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
        await this.$apollo.mutate({
          mutation: gql`
            mutation updateGoalItem(
              $id: ID!
              $body: String!
              $status: String
            ) {
              updateGoalItem(
                id: $id
                body: $body
                status: $status
              ) {
                id
                status
              }
            }
          `,
          variables: {
            id: goal.id,
            body: goal.body,
            status: 'done',
          },
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
