<template>
  <container-box :is-loading="isLoading">
    <div class="weekdays pt-3 pl-2 pr-2">
      <template v-for="(weekDay, i) in weekDays">
        <div
          :key="weekDay.day"
          :class="`day ${weekDay.isActive ? 'active' : ''}`"
          @click="setDate(i)"
        >
          <div>{{ weekDay.day }}</div>
          <div>{{ weekDay.dayNumber }}</div>
        </div>
      </template>
    </div>
    <div class="pl-3 pr-3">
      <p class="pt-4">
        Work on your daily agenda to bring you closer to your lifetime goal.
      </p>
      <template v-if="goals && goals.find((goal) => goal.period === 'lifetime')">
        <atom-card class="modern-card">
          <atom-card-title>
            <h3>Remember your Lifetime Goals</h3>
          </atom-card-title>
          <atom-card-text class="pt-0">
            <ul>
              <li
                v-for="goalItem in goals.find((goal) => goal.period === 'lifetime').goalItems"
                :key="goalItem.id"
              >
                {{ goalItem.body }}
              </li>
            </ul>
          </atom-card-text>
        </atom-card>
      </template>
    </div>
    <div
      class="text-xs-center date-navigation"
      hidden
    >
      <atom-button
        fab
        outline
        small
        absolute
        left
        color="primary"
        :disabled="disablePrevious()"
        @click="previousDate()"
      >
        <atom-icon dark>keyboard_arrow_left</atom-icon>
      </atom-button>
      <atom-button
        fab
        outline
        small
        absolute
        right
        color="primary"
        @click="nextDate()"
      >
        <atom-icon dark>keyboard_arrow_right</atom-icon>
      </atom-button>
      <div class="date-today">
        {{ today }}
      </div>
    </div>
    <div v-if="tasklist && tasklist.length">
      <atom-timeline
        dense
        clipped
      >
        <template v-for="task in tasklist">
          <span :key="task.id">
            <atom-timeline-item
              fill-dot
              class="pb-4 pt-4 routine-item"
              :color="getButtonColor(task)"
              medium
            >
              <template #icon>
                <atom-icon class="white--text">{{ getButtonIcon(task) }}</atom-icon>
              </template>
              <atom-layout>
                <atom-flex xs2>
                  <strong>{{ task.time }}</strong>
                </atom-flex>
                <atom-flex>
                  <strong>{{ task.name }}</strong>
                  <br />
                  <a @click="() => $router.push(`/agenda/tree/${task.id}`)">Go to Month Planner</a>
                  <div class="caption"><pre>{{ task.description }}</pre></div>
                </atom-flex>
              </atom-layout>
            </atom-timeline-item>
            <template v-for="period in periods">
              <atom-timeline-item
                :key="period + task.id"
                hide-dot
                class="pb-0 pt-2"
              >
                <atom-layout
                  class="period-separator"
                  align-center
                  justify-space-between
                >
                  <atom-flex xs7>
                    <span style="text-transform: uppercase">{{ period }}</span>
                  </atom-flex>
                  <atom-flex
                    xs5
                    text-xs-right
                  >
                    <!-- <atom-button
                      flat
                      icon
                      color="primary"
                      v-if="isEditable"
                      @click="
                        selectedTaskRef = task.id;
                        currentGoalPeriod = period;
                        goalDetailsDialog = true"
                      >
                      <atom-icon>content_copy</atom-icon>
                      <atom-icon class="overlay-icon">arrow_back</atom-icon>
                    </atom-button> -->
                    <atom-button
                      v-if="isEditable && period !== 'year'"
                      flat
                      icon
                      color="primary"
                      @click="clonePeriodGoalItem(task, period)"
                    >
                      <atom-icon>content_copy</atom-icon>
                      <atom-icon class="overlay-icon">arrow_upward</atom-icon>
                    </atom-button>
                    <atom-button
                      v-if="isEditable"
                      flat
                      icon
                      color="primary"
                      @click="newGoalItem(task, period)"
                    >
                      <atom-icon>add</atom-icon>
                    </atom-button>
                    <atom-button
                      v-else
                      flat
                      icon
                      color="primary"
                    >
                      <atom-icon />
                    </atom-button>
                  </atom-flex>
                </atom-layout>
              </atom-timeline-item>
              <template v-if="filterTaskGoalsPeriod(task.id, period).length">
                <template
                  v-for="(taskGoals, i) in filterTaskGoalsPeriod(task.id, period)"
                >
                  <timeline-item-list
                    :key="task.id + period + i"
                    :goal="taskGoals"
                    :period="period"
                    @delete-task-goal="deleteTaskGoal"
                  />
                </template>
              </template>
              <template v-else>
                <atom-timeline-item
                  :key="period"
                  class="mb-0 pb-3 pt-3"
                  hide-dot
                >
                  <span>No goal or activity set.</span>
                </atom-timeline-item>
              </template>
            </template>
          </span>
        </template>
      </atom-timeline>
    </div>
    <div v-if="tasklist && tasklist.length === 0">
      <atom-card class="modern-card">
        <atom-card-text class="text-xs-center">
          <p>No items to display. Please go to Routine Settings and add routine items.</p>
        </atom-card-text>
      </atom-card>
    </div>
    <atom-dialog
      v-model="goalDetailsDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <atom-card class="modern-card-elevated">
        <atom-toolbar
          dark
          color="primary"
        >
          <atom-button
            icon
            dark
            @click="goalDetailsDialog = false"
          >
            <atom-icon>close</atom-icon>
          </atom-button>
          <atom-toolbar-title>Add Goal</atom-toolbar-title>
          <atom-spacer />
        </atom-toolbar>
        <goal-list
          :goals="goals"
          :date="date"
          :period="currentGoalPeriod"
          :selected-body="selectedBody"
          :tasklist="tasklist"
          :selected-task-ref="selectedTaskRef"
          @toggle-goal-details-dialog="toggleGoalDetailsDialog"
        />
        <atom-alert
          :value="true"
          color="success"
          icon="ev_station"
          outline
          class="ml-3 mr-3"
        >
          It's better to set Month and Weekly goals first to better guide daily milestones.
        </atom-alert>
      </atom-card>
    </atom-dialog>
  </container-box>
</template>

<script>
/* eslint-disable no-param-reassign */
import moment from 'moment';

import TimelineItemList from '@routine-notes/ui/molecules/TimelineItemList/TimelineItemList.vue';
import ContainerBox from '@routine-notes/ui/templates/ContainerBox/ContainerBox.vue';
import {
  AtomAlert,
  AtomButton,
  AtomCard,
  AtomCardText,
  AtomCardTitle,
  AtomDialog,
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomSpacer,
  AtomTimeline,
  AtomTimelineItem,
  AtomToolbar,
  AtomToolbarTitle,
} from '@routine-notes/ui/atoms';
import GoalList from '../containers/GoalListContainer.vue';
import { stepupMilestonePeriodDate } from '../utils/getDates';
import { ROUTINE_DATE_QUERY, AGENDA_GOALS_QUERY } from '../composables/graphql/queries';

export default {
  components: {
    GoalList,
    TimelineItemList,
    ContainerBox,
    AtomAlert,
    AtomButton,
    AtomCard,
    AtomCardText,
    AtomCardTitle,
    AtomDialog,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomSpacer,
    AtomTimeline,
    AtomTimelineItem,
    AtomToolbar,
    AtomToolbarTitle,
  },
  apollo: {
    tasklist: {
      query: ROUTINE_DATE_QUERY,
      update(data) {
        this.isLoading = false;
        this.tasklist = data.routineDate && data.routineDate.date
          ? data.routineDate.tasklist
          : [];
        if (data.routineDate === null) {
          this.addNewDayRoutine();
          return this.tasklist;
        }
        this.did = data.routineDate.id;
        this.skipDay = !!(data.routineDate.skip);
        return data.routineDate.tasklist;
      },
      variables() {
        return {
          date: this.date,
        };
      },
      error() {
        this.isLoading = false;
      },
    },
    goals: {
      query: AGENDA_GOALS_QUERY,
      update(data) {
        return data.agendaGoals;
      },
      variables() {
        return {
          date: this.goalsDate,
        };
      },
      error() {
        this.isLoading = false;
      },
    },
  },
  data() {
    return {
      isLoading: true,
      goalDetailsDialog: false,
      tasklist: [],
      did: '',
      skipDay: false,
      currentGoalPeriod: 'day',
      selectedBody: '',
      selectedTaskRef: '',
      date: moment().format('DD-MM-YYYY'),
      goalsDate: moment().format('DD-MM-YYYY'),
      weekDays: this.buildWeekdays(),
      periods: ['year', 'month', 'week', 'day'],
      isEditable: true,
    };
  },
  computed: {
    today() {
      return moment(this.date, 'DD-MM-YYYY').format('DD MMMM YYYY');
    },
  },
  watch: {
    date(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.$apollo.queries.tasklist.refetch();
        const newDate = moment(newVal, 'DD-MM-YYYY');
        const oldDate = moment(oldVal, 'DD-MM-YYYY');
        const todayDate = moment(new Date(), 'DD-MM-YYYY');
        this.isEditable = moment(newDate).isSameOrAfter(todayDate, 'day');
        // Only refetch goals when the week changes
        if (!newDate.isSame(oldDate, 'week')) {
          this.goalsDate = newVal;
        }
      }
    },
  },
  methods: {
    buildWeekdays() {
      const weekDays = [];
      const dayShort = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const currentDate = moment();

      const weekStart = currentDate.clone().startOf('week');
      // const weekEnd = currentDate.clone().endOf('isoWeek');

      dayShort.forEach((day, i) => {
        weekDays.push({
          dayNumber: moment(weekStart).add(i, 'days').format('DD'),
          isActive: moment().weekday() === i,
          day,
        });
      });

      return weekDays;
    },
    addNewDayRoutine() {
      this.isLoading = true;
      this.$routine.addRoutine(this.date)
        .then(() => this.$apollo.queries.tasklist.refetch())
        .then(() => {
          this.isLoading = false;
        })
        .catch(() => {
          this.isLoading = false;
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },
    deleteTaskGoal({ id, period, date }) {
      // Apollo cache optimistic update handles instant UI removal
      this.$goals.deleteGoalItem({
        id, period, date, dayDate: this.date,
      })
        .catch(() => {
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },
    updateSelectedTaskRef(id) {
      this.selectedTaskRef = id;
    },
    disablePrevious() {
      return this.date === moment().format('DD-MM-YYYY');
    },
    previousDate() {
      this.date = moment(this.date, 'DD-MM-YYYY').subtract(1, 'days').format('DD-MM-YYYY');
    },
    nextDate() {
      this.date = moment(this.date, 'DD-MM-YYYY').add(1, 'days').format('DD-MM-YYYY');
    },
    setDate(indx) {
      const currentDate = moment();
      const weekStart = currentDate.clone().startOf('week');

      this.weekDays = this.weekDays.map((weekDay, i) => {
        if (Number(indx) === i) {
          weekDay.isActive = true;
          return weekDay;
        }
        weekDay.isActive = false;
        return weekDay;
      });
      this.date = moment(weekStart).add(indx, 'days').format('DD-MM-YYYY');
    },
    getButtonColor(task) {
      if (task) {
        if (task.ticked) {
          return 'success';
        } if (task.passed) {
          return 'error';
        }
      }
      return 'grey';
    },
    getButtonIcon(task) {
      if (task) {
        if (task.ticked) {
          return 'check';
        } if (task.passed && !task.ticked) {
          return 'close';
        } if (!task.passed && !task.ticked && !task.wait) {
          return 'alarm';
        }
      }
      return 'more_horiz';
    },
    newGoalItem(task, period) {
      this.selectedTaskRef = task.id;
      this.currentGoalPeriod = period;
      this.selectedBody = '';
      this.goalDetailsDialog = true;
    },
    clonePeriodGoalItem(task, period) {
      const stepUpPeriod = stepupMilestonePeriodDate(period);
      const filteredPeriodGoals = this.filterTaskGoalsPeriod(task.id, stepUpPeriod.period);
      this.selectedBody = (filteredPeriodGoals && filteredPeriodGoals.length && filteredPeriodGoals[0].goalItems[0].body) || '';
      this.selectedTaskRef = task.id;
      this.currentGoalPeriod = period;
      this.goalDetailsDialog = true;
    },
    filterTaskGoalsPeriod(id, currentGoalPeriod) {
      const taskGoalList = [];
      if (this.goals && this.goals.length) {
        this.goals
          .forEach((goal) => {
            if (goal && goal.period === currentGoalPeriod) {
              const taskGoalItems = goal
                && goal.goalItems
                && goal.goalItems.filter((goalItem) => goalItem.taskRef === id);

              if (taskGoalItems && taskGoalItems.length) {
                const newGoal = {
                  id: goal.id,
                  period: goal.period,
                  date: goal.date,
                  goalItems: taskGoalItems,
                };
                taskGoalList.push(newGoal);
              }
            }
          });
      }
      return Array.isArray(taskGoalList) ? taskGoalList : [];
    },
    toggleGoalDetailsDialog(bool) {
      this.goalDetailsDialog = bool;
    },
  },
};
</script>

<style scoped>
  >>> .v-timeline-item {
    padding-left: 16px;
    padding-right: 16px;
  }
  .period-separator {
    border-bottom: 1px solid #ccc;
  }
  >>> .v-timeline--dense:before {
    left: 34px !important;
  }
  >>> .v-timeline--dense .v-timeline-item__dot {
    left: 16px !important;
  }
  >>> .v-timeline--dense .v-timeline-item__dot--small {
    left: 23px !important;
  }
 .add-new >>> .v-btn {
    margin-left: -15px;
    padding-left: 0;
    text-align: left;
  }
  .date-navigation {
    padding: 32px 32px 0 32px;
  }
  .date-navigation .date-today {
    height: 40px;
    padding-top: 10px;
    font-weight: bold;
  }

  .weekdays {
    width: 100%;
    display: flex;
    justify-content:space-evenly;
    align-items: center;
    font-weight: 500;
  }
  .weekdays .day {
    padding: 16px;
    border-radius: 16px;
    text-align: center;
  }

  #mobileLayout .weekdays .day {
    border-radius: 16px;
  }

  .weekdays .day.active {
    background-color: #288bd5;
    color: #fff;
  }

  .overlay-icon {
    position: absolute;
    font-size: 14px;
    padding: 2px 0 0 3px;
  }
</style>
