<template>
    <v-layout row>
      <v-flex xs12 sm6 offset-sm3>
        <div v-if="loading" class="text-xs-center" style="margin-top:100px;">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
        <div v-else>
          <v-card :color="adoptProgress()" class="white--text ml-2 mr-2 mt-2 pb-2 pl-2 mb-3">
            <v-layout row>
              <v-flex xs7>
                <v-card-title primary-title>
                  <div>
                    <div class="headline">Today's Efficiency</div>
                  </div>
                </v-card-title>
                <v-btn
                  color="error"
                  @click="goalDetailsDialog = true"
                >
                  Show Today's Goals
                </v-btn>
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
          <v-list subheader style="width:100%" v-if="tasklist && tasklist.length > 0">
            <v-subheader>Today</v-subheader>
            <template v-for="(task, index) in tasklist">
              <v-divider v-if="index != 0" :key="index" :inset="task.inset"></v-divider>

              <v-list-tile :key="task.id" avatar>
                <v-list-tile-avatar>
                  <v-btn
                    fab
                    small
                    :disabled="getButtonDisabled(task)"
                    :color="getButtonColor(task)"
                    @click="checkClick($event, index)"
                  >
                    <v-icon>{{getButtonIcon(task)}}</v-icon>
                  </v-btn>
                </v-list-tile-avatar>

                <v-list-tile-content>
                  <v-list-tile-title v-html="task.name"></v-list-tile-title>
                  <v-list-tile-sub-title v-html="task.time"></v-list-tile-sub-title>
                </v-list-tile-content>
              </v-list-tile>
              <details :key="task.id" v-if="filterTaskGoals(task.id).length" class="inline-goals">
                <summary>View Goals</summary>
                <ul>
                  <li :key="taskGoals.id" v-for="taskGoals in filterTaskGoals(task.id)">
                    <b>{{taskGoals.period}}</b>
                    <ul>
                      <li :key="taskGoal.body" v-for="taskGoal in taskGoals.goalItems" :class="{ completed: taskGoal.isComplete}">
                        {{taskGoal.body}}
                      </li>
                    </ul>
                  </li>
                </ul>
              </details>
            </template>
          </v-list>
          <div v-if="tasklist && tasklist.length === 0">
            <v-card>
              <v-card-text class="text-xs-center">
                <p>No items to display. Please go to settings and add routine items.</p>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </v-flex>
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
            <v-toolbar-title>Goals</v-toolbar-title>
            <v-spacer></v-spacer>
          </v-toolbar>
          <goal-list :goals="goals" :date="date" :tasklist="tasklist" />
        </v-card>
      </v-dialog>
    </v-layout>
</template>

<script>
/* eslint-disable no-param-reassign */
import moment from 'moment';
import gql from 'graphql-tag';

import redirectOnError from '../utils/redirectOnError';
import { TIMES_UP_TIME, PROACTIVE_START_TIME } from '../constants/settings';

import GoalList from './GoalList.vue';

export default {
  components: {
    GoalList,
  },
  apollo: {
    tasklist: {
      query: gql`
        query getRoutineDate($date: String!) {
          routineDate(date: $date) {
            id
            date
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
      update(data) {
        this.loading = false;
        this.tasklist = data.routineDate && data.routineDate.date
          ? data.routineDate.tasklist
          : [];
        if (data.routineDate === null) {
          this.addNewDayRoutine();
          return this.tasklist;
        }
        this.did = data.routineDate.id;
        this.setPassedWait();
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
        this.loading = false;
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
        this.loading = false;
      },
    },
  },
  data() {
    return {
      loading: true,
      goalDetailsDialog: false,
      tasklist: [],
      did: '',
      timerId: '',
    };
  },
  computed: {
    date() {
      return moment().format('DD-MM-YYYY');
    },
  },
  methods: {
    addNewDayRoutine() {
      this.loading = true;
      this.$apollo.mutate({
        mutation: gql`
          mutation addRoutine($date: String!) {
            addRoutine(date: $date) {
              id
              date
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
          this.setPassedWait();
          this.loading = false;
        },
        error: (error) => {
          redirectOnError(this.$router, error);
          clearInterval(this.timerId);
          this.loading = false;
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
    getButtonColor(task) {
      if (task.ticked) {
        return 'success';
      } if (task.passed) {
        return 'error';
      }
      return '';
    },
    getButtonDisabled(task) {
      if (task.passed || task.wait) {
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
    checkClick(e, i) {
      const taskId = i;
      const task = this.tasklist[taskId];
      if (!task.passed && !task.wait) {
        task.ticked = true;
        this.$apollo.mutate({
          mutation: gql`
            mutation tickRoutineItem(
              $id: ID!
              $name: String!
              $ticked: Boolean!
            ) {
              tickRoutineItem(id: $id, name: $name, ticked: $ticked) {
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
            name: task.name,
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
                $name: String!
                $passed: Boolean!
              ) {
                passRoutineItem(id: $id, name: $name, passed: $passed) {
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
              name: item.name,
              passed: item.passed,
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
                $name: String!
                $wait: Boolean!
              ) {
                waitRoutineItem(id: $id, name: $name, wait: $wait) {
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
              name: item.name,
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
  },
  mounted() {
    this.timerId = setInterval(() => {
      this.setPassedWait();
    }, 60 * 1000);
  },
};
</script>

<style>
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
</style>
