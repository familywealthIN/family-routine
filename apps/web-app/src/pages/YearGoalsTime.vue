<template>
  <container-box transparent="true" :isLoading="loading">
    <div class="year-goals-container">
      <!-- Header with Add Goal Button -->
      <atom-layout row wrap align-center class="mb-4">
        <atom-flex xs12>
          <h1 class="display-1">{{ yearGoalTitle }}</h1>
        </atom-flex>
      </atom-layout>

      <!-- Auto-check threshold legend -->
      <atom-layout v-if="yearGoalsTree.length" row wrap class="mb-3">
        <atom-flex xs12>
          <atom-alert :value="true" type="info" outlined dense icon="info" class="threshold-legend">
            <strong>Auto-complete rules:</strong>
            a <strong>week</strong> auto-ticks after {{ thresholds.day }} day goals,
            a <strong>month</strong> after {{ thresholds.week }} week goals,
            a <strong>year</strong> after {{ thresholds.month }} month goals.
          </atom-alert>
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
              <!-- Year Goal Content: Description (3/4) + Progress Bar (1/4) -->
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
                      <atom-progress-circular
                        :value="calculateYearProgress(yearGoal)"
                        :color="yearGoal.isComplete ? 'success' : 'primary'"
                        size="120"
                        width="8"
                      >
                        <div class="text-xs-center">
                          <div class="display-1 font-weight-bold">
                            {{ Math.round(calculateYearProgress(yearGoal)) }}%
                          </div>
                          <div class="caption grey--text">
                            {{ progressCount(yearGoal, 'monthGoals') }}/{{ thresholds.month }} months
                          </div>
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
                        <atom-flex shrink class="status-icon-cell">
                          <atom-icon :color="monthGoal.isComplete ? 'success' : 'info'" small>
                            {{ monthGoal.isComplete ? 'check_circle' : 'radio_button_unchecked' }}
                          </atom-icon>
                        </atom-flex>
                        <atom-flex grow class="pr-3">
                          <div class="nested-goal-title">{{ monthGoal.body }}</div>
                          <div class="nested-goal-meta">
                            <span class="grey--text caption">{{ formatMonthDate(monthGoal.date) }}</span>
                          </div>
                        </atom-flex>
                        <atom-flex shrink class="period-progress-cell">
                          <div class="period-progress" @click.stop>
                            <div class="period-progress-label">
                              <strong>{{ progressCount(monthGoal, 'weekGoals') }}</strong>
                              / {{ thresholds.week }} weeks
                              <span class="period-progress-status" :class="periodStatusClass(monthGoal, isCurrentMonth(monthGoal.date))">
                                &middot; {{ periodStatusLabel(monthGoal, isCurrentMonth(monthGoal.date)) }}
                              </span>
                            </div>
                            <atom-progress-linear
                              :value="calculateMonthProgress(monthGoal)"
                              :color="periodColor(monthGoal, isCurrentMonth(monthGoal.date))"
                              background-color="grey lighten-3"
                              height="6"
                              rounded
                            />
                          </div>
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
                                  <atom-list-tile-content class="week-goal-content">
                                    <atom-list-tile-title>{{ weekGoal.body }}</atom-list-tile-title>
                                    <atom-list-tile-sub-title>{{ formatWeekDate(weekGoal.date) }}</atom-list-tile-sub-title>
                                    <div class="period-progress period-progress--inline" @click.stop>
                                      <div class="period-progress-label">
                                        <strong>{{ progressCount(weekGoal, 'dayGoals') }}</strong>
                                        / {{ thresholds.day }} days
                                        <span class="period-progress-status" :class="periodStatusClass(weekGoal, isCurrentWeek(weekGoal.date))">
                                          &middot; {{ periodStatusLabel(weekGoal, isCurrentWeek(weekGoal.date)) }}
                                        </span>
                                      </div>
                                      <atom-progress-linear
                                        :value="calculateWeekProgress(weekGoal)"
                                        :color="periodColor(weekGoal, isCurrentWeek(weekGoal.date))"
                                        background-color="grey lighten-3"
                                        height="5"
                                        rounded
                                      />
                                    </div>
                                  </atom-list-tile-content>
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
                                          <atom-icon :color="dayGoal.isComplete ? 'success' : 'grey'" small>
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
import ContainerBox from '@routine-notes/ui/templates/ContainerBox/ContainerBox.vue';
import {
  AtomAlert,
  AtomButton,
  AtomCard,
  AtomCardActions,
  AtomCardText,
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
  AtomProgressLinear,
  AtomSpacer,
  AtomSubheader,
  AtomToolbar,
  AtomToolbarTitle,
} from '@routine-notes/ui/atoms';
import { defaultGoalItem } from '@/constants/goals';
import { PROFILE_SETTINGS } from '../constants/settings';
import GoalCreation from '../containers/GoalCreationContainer.vue';

export default {
  name: 'YearGoalsTime',
  components: {
    GoalCreation,
    VueMarkdown,
    ContainerBox,
    AtomAlert,
    AtomButton,
    AtomCard,
    AtomCardActions,
    AtomCardText,
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
    AtomProgressLinear,
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
      thresholds: PROFILE_SETTINGS.autoCheckThreshold,
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
            progress
            routine {
              id
              name
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
              progress
              routine {
                id
                name
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
                progress
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
                  progress
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
        routineName: goalItem.routine ? goalItem.routine.name : null,
        monthGoals: [],
        expanded: false,
        expandedMonthIndex: null,
      };

      // Extract month goals from milestones. Server returns milestones in
      // insertion order, which doesn't match calendar order — sort by date.
      // Dates are DD-MM-YYYY strings, so parse via moment before comparing.
      const byDateAsc = (a, b) => {
        const ta = moment(a.date, 'DD-MM-YYYY').valueOf();
        const tb = moment(b.date, 'DD-MM-YYYY').valueOf();
        return ta - tb;
      };

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
                      .sort(byDateAsc)
                    : [],
                }))
                .sort(byDateAsc)
              : [],
          }))
          .sort(byDateAsc);

        // Auto-expand current month (do this AFTER sorting so the index is right)
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

    completedCount(goals) {
      if (!goals || !goals.length) return 0;
      return goals.filter((g) => g && g.isComplete).length;
    },

    // Prefer the server-maintained `progress` integer (set in autoCheckTaskPeriod,
    // goal.js:168-181) — it counts the sub-period items that are complete and is
    // the source of truth the auto-tick logic uses. Fall back to a client-side
    // count for legacy docs that pre-date the `progress` field.
    progressCount(goal, fallbackChildrenKey) {
      if (goal && typeof goal.progress === 'number') return goal.progress;
      return this.completedCount(goal && goal[fallbackChildrenKey]);
    },

    calculateYearProgress(yearGoal) {
      // Year auto-ticks when `threshold.month` months are complete
      // (default 6). Cap at 100% so the donut doesn't exceed full.
      if (yearGoal.isComplete) return 100;
      const threshold = this.thresholds.month || 1;
      const completedMonths = this.progressCount(yearGoal, 'monthGoals');
      return Math.min(100, (completedMonths / threshold) * 100);
    },

    calculateMonthProgress(monthGoal) {
      // Month auto-ticks when `threshold.week` weeks are complete (default 3)
      if (monthGoal.isComplete) return 100;
      const threshold = this.thresholds.week || 1;
      const completedWeeks = this.progressCount(monthGoal, 'weekGoals');
      return Math.min(100, (completedWeeks / threshold) * 100);
    },

    calculateWeekProgress(weekGoal) {
      // Week auto-ticks when `threshold.day` days are complete (default 5)
      if (weekGoal.isComplete) return 100;
      const threshold = this.thresholds.day || 1;
      const completedDays = this.progressCount(weekGoal, 'dayGoals');
      return Math.min(100, (completedDays / threshold) * 100);
    },

    // Backwards-compatible alias if anything still references it
    calculateGoalProgress(yearGoal) {
      return this.calculateYearProgress(yearGoal);
    },

    periodColor(goal, isActive) {
      if (goal && goal.isComplete) return 'success';
      if (isActive) return 'warning';
      return 'grey';
    },

    periodStatusLabel(goal, isActive) {
      if (goal && goal.isComplete) return 'Done';
      return isActive ? 'Active' : 'Inactive';
    },

    periodStatusClass(goal, isActive) {
      if (goal && goal.isComplete) return 'status-done';
      return isActive ? 'status-active' : 'status-inactive';
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
      const m = moment(date, 'DD-MM-YYYY');
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
        case 'week': {
          // Week period: last Friday of current week (DD-MM-YYYY format)
          // Week ends on Friday, not Sunday
          const currentDayOfWeek = currentDate.day(); // 0 = Sunday, 5 = Friday
          const daysUntilFriday = currentDayOfWeek <= 5 ? 5 - currentDayOfWeek : 7 - currentDayOfWeek + 5;
          date = currentDate.clone().add(daysUntilFriday, 'days').format('DD-MM-YYYY');
          break;
        }
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

/* Match month header horizontal padding to the week/day list tiles (12px)
   so the leading status icon column aligns down the nested tree. */
.month-goal-panel >>> .v-expansion-panel__header {
  padding: 8px 12px;
  min-height: 56px;
}

/* Match the month status icon's column width and right-gap to the
   .v-list__tile__action used on week/day tiles (32px wide, 8px gap). */
.status-icon-cell {
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-right: 8px;
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
  border-bottom: 1px solid #f5f5f5;
}

.day-goal-tile:last-child {
  border-bottom: none;
}

/* Shrink the action slots and let the title wrap so more of it is visible */
.day-goal-tile >>> .v-list__tile {
  height: auto !important;
  min-height: 40px;
  padding: 4px 12px;
  align-items: center;
}

.day-goal-tile >>> .v-list__tile__action {
  min-width: 32px;
  padding: 0;
  margin: 0;
}

.day-goal-tile >>> .v-list__tile__action:first-child {
  margin-right: 8px;
}

.day-goal-tile >>> .v-list__tile__action:last-child {
  margin-left: 8px;
}

.day-goal-tile >>> .v-list__tile__content {
  min-width: 0;
  overflow: visible;
  padding: 4px 0;
}

.day-goal-tile >>> .v-list__tile__title,
.day-goal-tile >>> .v-list__tile__sub-title {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  line-height: 1.3;
  height: auto !important;
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

/* Threshold legend */
.threshold-legend {
  font-size: 13px;
  line-height: 1.5;
}

/* Rounded edges for every progress bar on the page (bar + its inner fill) */
.year-goals-container >>> .v-progress-linear,
.year-goals-container >>> .v-progress-linear__background,
.year-goals-container >>> .v-progress-linear__bar,
.year-goals-container >>> .v-progress-linear__bar__determinate {
  border-radius: 999px !important;
  overflow: hidden;
}

/* Year progress block (1/4 column, sits next to the description) */
.progress-block {
  width: 100%;
}

.progress-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 12px;
  color: #616161;
  margin-bottom: 6px;
  gap: 6px;
  flex-wrap: wrap;
}

.progress-label-text strong {
  color: #212121;
}

.progress-label-value {
  font-weight: 600;
  color: #212121;
}

.progress-caption {
  font-size: 11px;
  margin-top: 4px;
  text-align: right;
}

/* Combined counter + status + bar used on month headers and week tiles */
.period-progress {
  min-width: 140px;
  width: 100%;
}

.period-progress--compact {
  min-width: 120px;
}

/* Week tile variant: bar lives under the title/subtitle on its own line */
.period-progress--inline {
  margin-top: 6px;
  min-width: 0;
}

.period-progress--inline .period-progress-label {
  justify-content: flex-start;
}

.period-progress-label {
  font-size: 12px;
  color: #616161;
  margin-bottom: 4px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.period-progress-label strong {
  color: #212121;
}

.period-progress-status {
  font-weight: 500;
}

.period-progress-status.status-done {
  color: #2e7d32;
}

.period-progress-status.status-active {
  color: #ef6c00;
}

.period-progress-status.status-inactive {
  color: #9e9e9e;
}

.period-progress-cell {
  min-width: 140px;
  max-width: 200px;
}

/* Allow the week tile to grow so the inline progress bar doesn't clip
   the title. Vuetify's v-list-tile pins the tile and its content column
   at ~48px with overflow:hidden — we relax both here. */
.week-goal-tile {
  height: auto !important;
  min-height: 72px;
}

.week-goal-tile >>> .v-list__tile {
  height: auto !important;
  min-height: 72px;
  padding: 8px 12px;
  align-items: flex-start;
}

.week-goal-tile >>> .v-list__tile__content {
  height: auto !important;
  min-width: 0;
  overflow: visible;
  padding: 0;
}

.week-goal-tile >>> .v-list__tile__title,
.week-goal-tile >>> .v-list__tile__sub-title {
  height: auto !important;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}

.week-goal-tile >>> .v-list__tile__action {
  align-self: center;
  min-width: 32px;
  padding: 0;
  margin: 0;
}

/* Leading status-icon action: consistent 8px gap to the title column */
.week-goal-tile >>> .v-list__tile__action:first-child {
  margin-right: 8px;
}

/* Trailing action (menu): consistent 8px gap from the content column */
.week-goal-tile >>> .v-list__tile__action:last-child {
  margin-left: 8px;
}

.week-goal-content {
  min-width: 0;
}

@media (max-width: 600px) {
  .period-progress,
  .period-progress--compact,
  .period-progress-cell {
    min-width: 100px;
  }
  .period-progress-label {
    font-size: 11px;
  }
}
</style>
