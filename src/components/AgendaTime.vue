<template>
  <container-box :isLoading="isLoading">
    <div class="pl-3 pr-3">
      <p class="pt-4">
        Work on your daily agenda to bring you closer to your lifetime goal.
      </p>
      <template v-if="goals.find((goal) => goal.period === 'lifetime')" >
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
              <v-flex xs3 class="pr-3">
                <strong>{{task.time}}</strong>
              </v-flex>
              <v-flex>
                <strong>{{task.name}}</strong>
                <div class="caption">{{task.description}}</div>
              </v-flex>
            </v-layout>
          </v-timeline-item>
          <template v-for="period in periods">
            <v-timeline-item
              hide-dot
              :key="period"
              class="pb-0 pt-2"
            >
              <v-layout class="period-separator" align-center justify-space-between>
                <v-flex xs7>
                  <span style="text-transform: uppercase">{{period}}</span>
                </v-flex>
                <v-flex xs5 text-xs-right>
                  <v-btn
                    flat
                    icon
                    color="primary"
                    @click="
                      selectedTaskRef = task.id;
                      currentGoalPeriod = period;
                      goalDetailsDialog = true"
                    >
                    <v-icon>add</v-icon>
                  </v-btn>
                </v-flex>
              </v-layout>
            </v-timeline-item>
            <template v-if="filterTaskGoalsPeriod(task.id, period).length" >
              <template
                v-for="taskGoals in filterTaskGoalsPeriod(task.id, period)"
              >
                <timeline-item-list
                  :key="taskGoals.id"
                  :goal="taskGoals"
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

import redirectOnError from '../utils/redirectOnError';

import GoalList from './GoalList.vue';
import TimelineItemList from './TimelineItemList.vue';
import ContainerBox from './ContainerBox.vue';

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
      error(error) {
        redirectOnError(this.$router, error);
        clearInterval(this.timerId);
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
      error(error) {
        redirectOnError(this.$router, error);
        clearInterval(this.timerId);
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
      timerId: '',
      skipDay: false,
      currentGoalPeriod: 'day',
      selectedTaskRef: '',
      date: moment().format('DD-MM-YYYY'),
      periods: ['year', 'month', 'week', 'day'],
    };
  },
  watch: {
    date(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.$apollo.queries.tasklist.refetch();
      }
    },
  },
  methods: {
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
        error: (error) => {
          redirectOnError(this.$router, error);
          clearInterval(this.timerId);
          this.isLoading = false;
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        },
      });
    },
    deleteTaskGoal(id) {
      this.goals.forEach((goal) => {
        goal.goalItems = goal.goalItems.filter((goalItem) => goalItem.id !== id);
      });
    },
    updateSelectedTaskRef(id) {
      this.selectedTaskRef = id;
    },
    getButtonColor(task) {
      if (task.ticked) {
        return 'success';
      } if (task.passed) {
        return 'error';
      }
      return 'grey';
    },
    getButtonIcon(task) {
      if (task.ticked) {
        return 'check';
      } if (task.passed && !task.ticked) {
        return 'close';
      } if (!task.passed && !task.ticked && !task.wait) {
        return 'alarm';
      }
      return 'more_horiz';
    },
    filterTaskGoalsPeriod(id, currentGoalPeriod) {
      const taskGoalList = [];
      if (this.goals && this.goals.length) {
        this.goals
          .forEach((goal) => {
            if (goal.period === currentGoalPeriod) {
              const taskGoalItems = goal.goalItems.filter((goalItem) => goalItem.taskRef === id);
              if (taskGoalItems.length) {
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
      return taskGoalList;
    },
    toggleGoalDetailsDialog(bool) {
      this.goalDetailsDialog = bool;
    },
  },
  mounted() {
    this.timerId = setInterval(() => {
      if (this.date !== moment().format('DD-MM-YYYY')) {
        this.date = moment().format('DD-MM-YYYY');
      }
    }, 60 * 1000);
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
</style>
