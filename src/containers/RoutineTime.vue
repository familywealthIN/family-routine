<template>
  <container-box :isLoading="isLoading">
    <div class="pt-2">
      <v-card :color="adoptProgress()" class="white--text ml-2 mr-2 pb-2 pl-2 mb-3">
        <v-layout row>
          <v-flex xs7>
            <v-card-title primary-title>
              <div>
                <div class="headline">Today's Efficiency</div>
              </div>
            </v-card-title>
          </v-flex>
          <v-flex xs5 class="mb-3">
            <v-progress-circular
              :value="countTotal(tasklist)"
              :size="70"
              :rotate="-90"
              style="float: right;"
              class="mt-3 mr-3"
              color="white"
              width="10">{{countTotal(tasklist)}}</v-progress-circular>
          </v-flex>
        </v-layout>
      </v-card>
    </div>
    <v-list
      subheader
      style="width:100%"
      v-if="tasklist && tasklist.length > 0"
      class="concentrated-view"
    >
      <v-subheader>
        <div class="d-flex title-options">
          <div class="sub-header">
            {{this.today}}
          </div>
          <div>
            <v-switch
              v-model="skipDay"
              label="Skip Day"
              @change="skipClick()"
            ></v-switch>
          </div>
        </div>
      </v-subheader>
      <template v-if="skipDay">
        <div class="skip-box">
          <img src="/img/relax.jpg">
          <h1>Relax, Detox and Enjoy the Day</h1>
        </div>
      </template>
      <template v-else>
        <template v-for="(task, index) in tasklist">
          <v-divider v-if="index != 0" :key="index" :inset="task.inset"></v-divider>

          <v-list-tile
            :key="task.id"
            @click="updateSelectedTaskRef(task.id)"
            :class="task.id === selectedTaskRef ? 'active' : ''"
            avatar
          >
            <v-list-tile-avatar>
              <v-btn
                fab
                small
                :disabled="getButtonDisabled(task)"
                :color="getButtonColor(task)"
                @click="checkClick($event, task)"
              >
                <v-icon>{{getButtonIcon(task)}}</v-icon>
              </v-btn>
            </v-list-tile-avatar>

            <v-list-tile-content>
              <v-list-tile-title>
                <span>{{task.name}}</span>
              </v-list-tile-title>
              <v-list-tile-sub-title v-if="task.id === selectedTaskRef">
                <div class="time-text">{{task.time}}</div>
                <div>
                  <v-btn-toggle v-model="currentGoalPeriod" >
                    <v-btn flat value="day">
                      Today
                    </v-btn>
                    <v-btn flat value="week">
                      Week
                    </v-btn>
                    <v-btn flat value="month">
                      Month
                    </v-btn>
                    <v-btn flat value="year">
                      Year
                    </v-btn>
                  </v-btn-toggle>
                </div>
              </v-list-tile-sub-title>
              <v-list-tile-sub-title v-else v-html="task.time"></v-list-tile-sub-title>
              <div v-if="task.id === selectedTaskRef" class="task-goals">
                <v-layout
                  row
                  wrap
                  v-if="filterTaskGoalsPeriod(task.id, 'week').length
                    && filterTaskGoalsPeriod(task.id, 'month').length"
                >
                  <v-flex xs12>
                    <v-alert
                      :value="true"
                      color="success"
                      icon="check_circle"
                      outline
                    >
                      You are all set.
                      Do daily milestones to complete weekly and monthly goals.
                    </v-alert>
                  </v-flex>
                </v-layout>
                <v-layout row wrap v-else>
                  <v-flex xs6 v-if="!filterTaskGoalsPeriod(task.id, 'month').length">
                    <v-chip @click="currentGoalPeriod = 'month', goalDetailsDialog = true">
                      <v-avatar class="red text-white"><v-icon>close</v-icon></v-avatar>
                      Set Month's Goal
                    </v-chip>
                  </v-flex>
                  <v-flex xs6 v-if="filterTaskGoalsPeriod(task.id, 'month').length">
                    <v-chip>
                      <v-avatar class="success text-white"><v-icon>check</v-icon></v-avatar>
                      Set Month's Goal
                    </v-chip>
                  </v-flex>
                  <v-flex xs6 v-if="!filterTaskGoalsPeriod(task.id, 'week').length">
                    <v-chip @click="currentGoalPeriod = 'week', goalDetailsDialog = true">
                      <v-avatar class="red text-white"><v-icon>close</v-icon></v-avatar>
                      Set Week's Goal
                    </v-chip>
                  </v-flex>
                  <v-flex xs6 v-if="filterTaskGoalsPeriod(task.id, 'week').length">
                    <v-chip>
                      <v-avatar class="success text-white"><v-icon>check</v-icon></v-avatar>
                      Set Week's Goal
                    </v-chip>
                  </v-flex>
                </v-layout>
                <div v-if="filterTaskGoalsPeriod(task.id, currentGoalPeriod).length" >
                  <div
                    :key="taskGoals.id"
                    v-for="taskGoals in filterTaskGoalsPeriod(task.id, currentGoalPeriod)"
                  >
                    <v-list two-line subheader>
                      <goal-item-list
                        :goal="taskGoals"
                        @delete-task-goal="deleteTaskGoal"
                      />
                    </v-list>
                  </div>
                </div>
                <small class="no-goals-text" v-else>
                  No goal or activity logged.
                </small>
                <div class="add-new">
                  <v-btn
                    small
                    flat
                    @click="goalDetailsDialog = true"
                  >
                    <v-icon>add</v-icon>
                    Add Goal or Activity
                  </v-btn>
                </div>
              </div>
            </v-list-tile-content>
          </v-list-tile>
          <!--
          <details :key="task.id" v-if="filterTaskGoals(task.id).length" class="inline-goals">
            <summary>View Goals</summary>
            <ul>
              <li :key="taskGoals.id" v-for="taskGoals in filterTaskGoals(task.id)">
                <b>{{taskGoals.period}}</b>
                <ul>
                  <li
                    :key="taskGoal.body"
                    v-for="taskGoal in taskGoals.goalItems"
                    :class="{ completed: taskGoal.isComplete}"
                  >
                    {{taskGoal.body}}
                  </li>
                </ul>
              </li>
            </ul>
          </details>
          -->
        </template>
      </template>
    </v-list>
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
import { TIMES_UP_TIME, PROACTIVE_START_TIME } from '../constants/settings';

import GoalList from '../components/GoalList.vue';
import GoalItemList from '../components/GoalItemList.vue';
import ContainerBox from '../components/ContainerBox.vue';

export default {
  components: {
    GoalList,
    GoalItemList,
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
              time
              points
              ticked
              passed
              wait
              stimuli {
                name
                splitRate
                earned
              }
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
        this.setPassedWait();
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
        query dailyGoals($date: String!) {
          dailyGoals(date: $date) {
            id
            date
            period
            goalItems {
              id
              body
              isComplete
              taskRef
              goalRef
              isMilestone
            }
          }
        }
      `,
      update(data) {
        return data.dailyGoals;
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
                stimuli {
                  name
                  splitRate
                  earned
                }
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
          this.setPassedWait();
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
      return '';
    },
    getButtonDisabled(task) {
      if (!task.ticked && (task.passed || task.wait)) {
        return true;
      }
      return false;
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
    checkClick(e, task) {
      e.stopPropagation();
      if (!task.passed && !task.wait && !task.ticked) {
        task.ticked = true;
        this.$apollo.mutate({
          mutation: gql`
            mutation tickRoutineItem(
              $id: ID!
              $taskId: String!
              $ticked: Boolean!
            ) {
              tickRoutineItem(id: $id, taskId: $taskId, ticked: $ticked) {
                id
                tasklist {
                  name
                  ticked
                }
              }
            }
          `,
          variables: {
            id: this.did,
            taskId: task.id,
            ticked: task.ticked,
          },
          error: (error) => {
            task.ticked = false;
            redirectOnError(this.$router, error);
            clearInterval(this.timerId);
            this.$notify({
              title: 'Error',
              text: 'An unexpected error occured',
              group: 'notify',
              type: 'error',
              duration: 3000,
            });
          },
        });
      }
    },
    skipClick() {
      this.$apollo.mutate({
        mutation: gql`
            mutation skipRoutine(
              $id: ID!
              $skip: Boolean!
            ) {
              skipRoutine(id: $id, skip: $skip) {
                id
                skip
              }
            }
          `,
        variables: {
          id: this.did,
          skip: !!(this.skipDay),
        },
      }).catch((error) => {
        let text = 'An unexpected error occured';
        if (error.message) {
          // eslint-disable-next-line prefer-destructuring
          text = error.message.split('GraphQL error: ')[1];
        }
        setTimeout(() => { this.skipDay = false; }, 1000);
        redirectOnError(this.$router, error);
        this.$notify({
          title: 'Error',
          text,
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      });
    },
    passedTime(item) {
      if (!item.ticked) {
        const timestamp = moment(item.time, 'HH:mm');
        const exp = timestamp.diff(moment());
        if (moment.duration(exp).asMinutes() < -TIMES_UP_TIME && !item.passed) {
          item.passed = true;
          this.$apollo.mutate({
            mutation: gql`
              mutation passRoutineItem(
                $id: ID!
                $taskId: String!
                $ticked: Boolean!
                $passed: Boolean!
              ) {
                passRoutineItem(id: $id, taskId: $taskId, ticked: $ticked, passed: $passed) {
                  id
                  tasklist {
                    id
                    name
                    ticked
                  }
                }
              }
            `,
            variables: {
              id: this.did,
              taskId: item.id,
              ticked: item.ticked,
              passed: item.passed,
            },
            update: (store, { data: { passRoutineItem } }) => {
              if (passRoutineItem.tasklist) {
                const currentTask = passRoutineItem.tasklist.find((task) => task.id === item.id);
                if (currentTask.ticked) {
                  item.passed = false;
                  item.ticked = true;
                }
              }
            },
            error: (error) => {
              redirectOnError(this.$router, error);
              clearInterval(this.timerId);
              item.passed = false;
              this.$notify({
                title: 'Error',
                text: 'An unexpected error occured',
                group: 'notify',
                type: 'error',
                duration: 3000,
              });
            },
          });
        }
      }
    },
    waitTime(item) {
      if (!item.ticked) {
        const timestamp = moment(item.time, 'HH:mm');
        const exp = timestamp.diff(moment());
        if (moment.duration(exp).asMinutes() < PROACTIVE_START_TIME && item.wait) {
          item.wait = false;
          this.$apollo.mutate({
            mutation: gql`
              mutation waitRoutineItem(
                $id: ID!
                $taskId: String!
                $wait: Boolean!
              ) {
                waitRoutineItem(id: $id, taskId: $taskId, wait: $wait) {
                  id
                  tasklist {
                    name
                    wait
                  }
                }
              }
            `,
            variables: {
              id: this.did,
              taskId: item.id,
              wait: item.wait,
            },
            error: (error) => {
              redirectOnError(this.$router, error);
              clearInterval(this.timerId);
              item.wait = false;
              this.$notify({
                title: 'Error',
                text: 'An unexpected error occured',
                group: 'notify',
                type: 'error',
                duration: 3000,
              });
            },
          });
        }
      }
    },
    setPassedWait() {
      Array.prototype.forEach.call(this.tasklist, (task) => {
        this.passedTime(task);
        this.waitTime(task);
      });
    },
    countTotal() {
      return this.tasklist.reduce((total, num) => {
        if (num.ticked) {
          return total + num.points;
        }
        return total;
      }, 0);
    },
    adoptProgress() {
      const count = this.countTotal(this.tasklist);
      if (count < 33) {
        return 'error';
      }
      if (count < 70) {
        return 'warning';
      }
      return 'success';
    },
    filterTaskGoals(id) {
      const taskGoalList = [];
      if (this.goals && this.goals.length) {
        this.goals
          .forEach((goal) => {
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
          });
      }
      return taskGoalList;
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
      this.setPassedWait();
    }, 60 * 1000);
  },
};
</script>

<style>
  .text-white {
    color: #fff;
  }
  .inline-goals {
    padding: 8px 16px;
    background-color: antiquewhite;
  }
  .inline-goals summary {
    outline: none;
  }
  .inline-goals ul {
    list-style: none;
    padding-left: 4px;
  }

  .title-options {
    width: 100%;
    justify-content: space-between;
    align-items: center;
  }

  .title-options > .sub-header {
    flex: 12 !important;
  }

  .concentrated-view .active {
    background-color: #fff;
  }

  .concentrated-view .active .v-list__tile--avatar,
  .concentrated-view .v-list__tile--avatar {
    transition: 0.35s;
  }

  .concentrated-view .active .v-list__tile--avatar {
    height: 240px;
  }

  .concentrated-view .active .v-list__tile__avatar {
    align-self: start;
  }

  .concentrated-view .active .v-list__tile > .v-list__tile__avatar > .v-avatar,
  .concentrated-view .active .v-list__tile > .v-list__tile__avatar > .v-avatar button{
    height: 48px !important;
    width: 48px !important;
  }

  .concentrated-view .active .v-list__tile{
    padding-top: 16px;
    padding-bottom: 16px;
  }
  .concentrated-view .active .v-list__tile__avatar {
    justify-content: start;
  }

  .concentrated-view .active .v-list__tile__content {
    justify-content: start;
  }

  .concentrated-view .active .v-list__tile__title {
    font-size: 24px;
    height: 28px;
  }

  .concentrated-view .active .goal-list .v-list__tile__title {
    font-size: 10px;
  }

  .concentrated-view .v-list__tile__sub-title {
    display: flex;
    justify-content: space-between;
    align-content: center;
    padding: 4px 0;
  }

  .concentrated-view .v-list__tile__sub-title .time-text {
    align-self: center;
  }

  .concentrated-view .v-list__tile__sub-title .v-item-group {
    border: 1px solid #1976d2;
    border-radius: 4px;
    box-shadow: none;
  }

  .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn {
    height: 24px;
  }
  .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn__content {
    font-size: 10px;
    color: #000;
  }

   .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn--active {
    background-color: #1976d2;
  }

  .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn--active .v-btn__content {
    color: #fff;
  }

  .concentrated-view .task-goals {
    width: 100%;
    height: 150px;
    overflow-x: hidden;
    overflow-y: auto;
  }
  .concentrated-view .task-goals .v-list__tile {
    padding: 4px 0;
    height: 32px;
  }
  .concentrated-view .task-goals .v-input--selection-controls__ripple,
  .concentrated-view .task-goals .v-list__tile__action .v-btn,
  .concentrated-view .task-goals .v-list__tile__title {
    height: 24px;
  }

  .concentrated-view .task-goals .v-input--selection-controls__ripple {
    top: calc(50% - 19px);
  }

  .v-list__tile__side-title {
    color: rgba(0,0,0,0.54);
    padding-left: 8px;
  }
  .concentrated-view .task-goals .v-list {
    background: transparent;
  }
  .concentrated-view .task-goals .v-list__tile__action {
    min-width: 36px;
  }
  .concentrated-view
  .task-goals .v-input--selection-controls:not(.v-input--hide-details) .v-input__slot {
    margin-bottom: 3px;
  }
  .concentrated-view .task-goals .v-list__tile__title {
    font-size: 14px;
  }
  .concentrated-view .task-goals .v-chip {
    cursor: pointer;
    font-size: 11px;
    margin: 0 2px 0 0;
  }
  .concentrated-view .task-goals .no-goals-text {
    /* text-align: center; */
    display: block;
    padding: 20px 0 20px 36px;
    color: #777;
  }
  .concentrated-view .task-goals .v-alert.v-alert--outline {
    padding: 4px;
    font-size: 11px;
  }
  .concentrated-view .task-goals .add-new {
    border-top: 1px solid #ccc;
    padding-top: 8px;
  }
  .concentrated-view .task-goals .add-new .v-btn {
    padding: 0;
    margin: 0;
    text-align: left;
    color: rgba(0,0,0,0.87);
    text-transform: initial;
    font-size: 14px;
    font-weight: 400;
  }
  .concentrated-view .task-goals .add-new .v-btn .v-icon {
    padding-right: 12px;
  }
  .concentrated-view .task-goals .add-new .v-btn .v-btn__content {
    justify-content: initial;
  }
  .skip-box {
    text-align: center;
    padding: 32px 16px;
  }
  .skip-box img {
    max-width: 100%;
    width: auto;
  }
</style>
