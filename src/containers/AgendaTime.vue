<template>
  <container-box :isLoading="isLoading">
    <div class="weekdays pt-3 pl-2 pr-2">
      <template v-for="(weekDay, i) in weekDays">
        <div
          @click="setDate(i)"
          :class="`day ${weekDay.isActive ? 'active' : ''}`"
          :key="weekDay.day"
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
      <template v-if="goals && goals.find((goal) => goal.period === 'lifetime')" >
        <v-card>
          <v-card-title>
            <h3>Remember your Lifetime Goals</h3>
          </v-card-title>
          <v-card-text class="pt-0">
            <ul>
              <li
                v-for="goalItem in goals.find((goal) => goal.period === 'lifetime').goalItems"
                :key="goalItem.id"
              >
                {{goalItem.body}}
              </li>
            </ul>
          </v-card-text>
        </v-card>
      </template>
    </div>
    <div class="text-xs-center date-navigation" hidden>
      <v-btn
        fab
        outline
        small
        absolute
        left
        color="primary"
        :disabled="disablePrevious()"
        @click="previousDate()"
      >
        <v-icon dark>
          keyboard_arrow_left
        </v-icon>
      </v-btn>
      <v-btn
        fab
        outline
        small
        absolute
        right
        color="primary"
        @click="nextDate()"
      >
        <v-icon
          dark
        >
          keyboard_arrow_right
        </v-icon>
      </v-btn>
      <div class="date-today">{{today}}</div>
    </div>
    <div v-if="tasklist && tasklist.length">
      <v-timeline dense clipped>
        <template v-for="task in tasklist">
          <span :key="task.id">
            <v-timeline-item
              fill-dot
              class="pb-4 pt-4 routine-item"
              :color="getButtonColor(task)"
              medium
            >
              <template v-slot:icon>
                <v-icon class="white--text" >{{getButtonIcon(task)}}</v-icon>
              </template>
              <v-layout>
                <v-flex xs2>
                  <strong>{{task.time}}</strong>
                </v-flex>
                <v-flex>
                  <strong>{{task.name}}</strong>
                  <div class="caption"><pre>{{task.description}}</pre></div>
                </v-flex>
              </v-layout>
            </v-timeline-item>
            <template v-for="period in periods">
              <v-timeline-item
                hide-dot
                :key="period + task.id"
                class="pb-0 pt-2"
              >
                <v-layout class="period-separator" align-center justify-space-between>
                  <v-flex xs7>
                    <span style="text-transform: uppercase">{{period}}</span>
                  </v-flex>
                  <v-flex xs5 text-xs-right>
                    <!-- <v-btn
                      flat
                      icon
                      color="primary"
                      v-if="isEditable"
                      @click="
                        selectedTaskRef = task.id;
                        currentGoalPeriod = period;
                        goalDetailsDialog = true"
                      >
                      <v-icon>content_copy</v-icon>
                      <v-icon class="overlay-icon">arrow_back</v-icon>
                    </v-btn> -->
                    <v-btn
                      flat
                      icon
                      color="primary"
                      v-if="isEditable && period !== 'year'"
                      @click="clonePeriodGoalItem(task, period)"
                      >
                      <v-icon>content_copy</v-icon>
                      <v-icon class="overlay-icon">arrow_upward</v-icon>
                    </v-btn>
                    <v-btn
                      flat
                      icon
                      color="primary"
                      v-if="isEditable"
                      @click="newGoalItem(task, period)"
                      >
                      <v-icon>add</v-icon>
                    </v-btn>
                    <v-btn
                      flat
                      icon
                      color="primary"
                      v-else
                    >
                      <v-icon></v-icon>
                    </v-btn>
                  </v-flex>
                </v-layout>
              </v-timeline-item>
              <template v-if="filterTaskGoalsPeriod(task.id, period).length" >
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
                <v-timeline-item
                  :key="period"
                  class="mb-0 pb-3 pt-3"
                  hide-dot
                >
                  <span>No goal or activity set.</span>
                </v-timeline-item>
              </template>
            </template>
          </span>
        </template>
      </v-timeline>
    </div>
    <div v-if="tasklist && tasklist.length === 0">
      <v-card>
        <v-card-text class="text-xs-center">
          <p>No items to display. Please go to Routine Settings and add routine items.</p>
        </v-card-text>
      </v-card>
    </div>
    <v-dialog
      v-model="goalDetailsDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="goalDetailsDialog = false">
            <v-icon>close</v-icon>
          </v-btn>
          <v-toolbar-title>Add Goal</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <goal-list
          :goals="goals"
          :date="date"
          :period="currentGoalPeriod"
          :selectedBody="selectedBody"
          :tasklist="tasklist"
          :selectedTaskRef="selectedTaskRef"
          @toggle-goal-details-dialog="toggleGoalDetailsDialog"
        />
        <v-alert
          :value="true"
          color="success"
          icon="ev_station"
          outline
          class="ml-3 mr-3"
        >
          It's better to set Month and Weekly goals first to better guide daily milestones.
        </v-alert>
      </v-card>
    </v-dialog>
  </container-box>
</template>

<script>
/* eslint-disable no-param-reassign */
import moment from 'moment';
import gql from 'graphql-tag';

import GoalList from '../components/GoalList.vue';
import TimelineItemList from '../components/TimelineItemList.vue';
import ContainerBox from '../components/ContainerBox.vue';
import { stepupMilestonePeriodDate } from '../utils/getDates';

export default {
  components: {
    GoalList,
    TimelineItemList,
    ContainerBox,
  },
  apollo: {
    tasklist: {
      query: gql`
        query getRoutineDate($date: String!) {
          routineDate(date: $date) {
            id
            date
            skip
            tasklist {
              id
              name
              description
              time
              points
              ticked
              passed
              wait
            }
          }
        }
      `,
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
      query: gql`
        query agendaGoals($date: String!) {
          agendaGoals(date: $date) {
            id
            date
            period
            goalItems {
              id
              body
              progress
              isComplete
              taskRef
              goalRef
            }
          }
        }
      `,
      update(data) {
        return data.agendaGoals;
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
      weekDays: this.buildWeekdays(),
      periods: ['year', 'month', 'week', 'day'],
      isEditable: true,
    };
  },
  watch: {
    date(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.$apollo.queries.tasklist.refetch();
        const date = moment(this.date, 'DD-MM-YYYY');
        const todayDate = moment(new Date(), 'DD-MM-YYYY');
        this.isEditable = moment(date).isSameOrAfter(todayDate, 'day');
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
      this.$apollo.mutate({
        mutation: gql`
          mutation addRoutine($date: String!) {
            addRoutine(date: $date) {
              id
              date
              skip
              tasklist {
                id
                name
                time
                points
                ticked
                passed
                wait
              }
            }
          }
        `,
        variables: {
          date: this.date,
        },
        update: (store, { data: { addRoutine } }) => {
          this.tasklist = addRoutine && addRoutine.date ? addRoutine.tasklist : [];
          this.did = addRoutine.id;
          this.isLoading = false;
        },
      }).catch(() => {
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
    deleteTaskGoal(id) {
      this.goals.forEach((goal) => {
        goal.goalItems = goal
        && goal.goalItems
        && goal.goalItems.filter((goalItem) => goalItem.id !== id);
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
  computed: {
    today() {
      return moment(this.date, 'DD-MM-YYYY').format('DD MMMM YYYY');
    },
  },
};
</script>

<style>
  .v-timeline-item {
    padding-left: 16px;
    padding-right: 16px;
  }
  .routine-item {
    background-color: aqua;
  }
  .period-separator {
    border-bottom: 1px solid #ccc;
  }
  .v-timeline--dense:before {
    left: 34px !important;
  }
  .v-timeline--dense .v-timeline-item__dot {
    left: 16px !important;
  }
  .v-timeline--dense .v-timeline-item__dot--small {
    left: 23px !important;
  }
 .add-new .v-btn {
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
    border-radius: 4px;
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
