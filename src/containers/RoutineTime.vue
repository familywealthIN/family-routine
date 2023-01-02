<template>
  <container-box :isLoading="isLoading">
    <div class="pt-2">
      <v-card :color="adoptProgress()" class="white--text ml-3 mr-3 pt-1 pb-1 mb-3 elevation-0">
        <v-layout style="max-width: 320px; margin: 0 auto;" row wrap>
          <v-flex xs4 class="mt-3 text-xs-center">
            Discipline
          </v-flex>
          <v-flex xs4 class="mt-3 text-xs-center">
            Kinetics
          </v-flex>
          <v-flex xs4 class="mt-3 text-xs-center">
            Geniuses
          </v-flex>
          <v-flex xs4 class="mb-3 text-xs-center">
            <v-progress-circular
              :value="countTotal('D')"
              :size="50"
              :rotate="-90"
              class="mt-3"
              color="white"
              width="6">{{Number(countTotal('D')).toFixed(1)}}</v-progress-circular>
          </v-flex>
          <v-flex xs4 class="mb-3 text-xs-center">
            <v-progress-circular
              :value="countTotal('K')"
              :size="50"
              :rotate="-90"
              class="mt-3"
              color="white"
              width="6">{{Number(countTotal('K')).toFixed(1)}}</v-progress-circular>
          </v-flex>
          <v-flex xs4 class="mb-3 text-xs-center">
            <v-progress-circular
              :value="countTotal('G')"
              :size="50"
              :rotate="-90"
              class="mt-3"
              color="white"
              width="6">{{Number(countTotal('G')).toFixed(1)}}</v-progress-circular>
          </v-flex>
        </v-layout>
      </v-card>
    </div>
    <v-list
      subheader
      style="width:100%"
      v-if="tasklist && tasklist.length > 0"
      class="concentrated-view elevation-0"
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
        <div v-for="(task, index) in tasklist" :key="task">
          <v-divider v-if="index != 0" :key="task" :inset="task.inset"></v-divider>
          <v-list-tile
            :key="task"
            @click="updateSelectedTaskRef(task.id)"
            :class="task.id === selectedTaskRef ? 'active' : ''"
            avatar
          >
            <v-progress-circular
              :value="countTaskPercentage(task)"
              :size="48"
              :rotate="-90"
              class="mr-3 circular-task"
              width="2"
              color="warning"
            >
              <v-list-tile-avatar>
                <v-btn
                  fab
                  small
                  class="elevation-0"
                  :disabled="getButtonDisabled(task)"
                  :color="getButtonColor(task)"
                  @click="checkDialogClick($event, task)"
                >
                  <v-icon>{{getButtonIcon(task)}}</v-icon>
                </v-btn>
              </v-list-tile-avatar>
            </v-progress-circular>
            <v-list-tile-content>
              <v-list-tile-title>
                <span>{{task.name}}</span>
              </v-list-tile-title>
              <v-list-tile-sub-title v-if="task.id === selectedTaskRef">
                <div class="time-text">
                  {{task.time}} - {{countTaskCompleted(task)}}/{{countTaskTotal(task)}}
                </div>
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
              <v-list-tile-sub-title v-else >
                {{task.time}}
              </v-list-tile-sub-title>
              <div v-if="task.id === selectedTaskRef" class="pt-2 pb-2 task-goals">
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
                        :progress="getWeekProgress(currentGoalPeriod, taskGoals)"
                        @delete-task-goal="deleteTaskGoal"
                        @refresh-task-goal="refreshTaskGoal"
                        @toggle-goal-display-dialog="toggleGoalDisplayDialog"
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
            <v-list-tile-action v-if="task.id !== selectedTaskRef">
                <v-list-tile-action-text>
                  <b>{{countTaskCompleted(task)}}</b>/{{countTaskTotal(task)}}
                </v-list-tile-action-text>
                <v-list-tile-action-text>tasks</v-list-tile-action-text>
            </v-list-tile-action>
          </v-list-tile>
        </div>
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
    <v-dialog
      v-model="goalDisplayDialog"
      fullscreen
      hide-overlay
      transition="dialog-bottom-transition"
    >
      <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="toggleGoalDisplayDialog(false)">
            <v-icon>close</v-icon>
          </v-btn>
          <v-toolbar-title>Goal Details</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <v-card>
          <v-card-text>
            <goal-display
              :selectedGoalItem="selectedGoalItem"
              @toggle-goal-display-dialog="toggleGoalDisplayDialog"
            />
          </v-card-text>
        </v-card>
      </v-card>
    </v-dialog>
    <v-dialog v-model="quickTaskDialog" max-width="600px">
      <v-card>
        <v-card-title>
          <span class="headline">{{quickTaskTitle}}</span>
        </v-card-title>
        <v-card-text>
          <p>
            {{quickTaskDescription}}
          </p>
          <quick-goal-creation
            :goals="goals"
            :date="date"
            period="day"
            :tasklist="tasklist"
            :selectedTaskRef="selectedTaskRef"
            @start-quick-goal-task="checkClick"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </container-box>
</template>

<script>
/* eslint-disable no-param-reassign */
import moment from 'moment';
import gql from 'graphql-tag';

import { TIMES_UP_TIME, PROACTIVE_START_TIME } from '../constants/settings';

import GoalList from '../components/GoalList.vue';
import GoalItemList from '../components/GoalItemList.vue';
import ContainerBox from '../components/ContainerBox.vue';
import GoalDisplay from '../components/GoalDisplay.vue';
import QuickGoalCreation from '../components/QuickGoalCreation.vue';

const threshold = {
  weekDays: 5,
  monthWeeks: 3,
  yearMonths: 9,
};

function weekOfMonth(d) {
  const addFirstWeek = moment(d, 'DD-MM-YYYY').startOf('month').weekday() < 2 ? 1 : 0;
  return moment(d, 'DD-MM-YYYY').week() - moment(d, 'DD-MM-YYYY').startOf('month').week() + addFirstWeek;
}

export default {
  components: {
    GoalList,
    GoalItemList,
    ContainerBox,
    GoalDisplay,
    QuickGoalCreation,
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
      error() {
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
              progress
              isComplete
              taskRef
              goalRef
              isMilestone
              contribution,
              reward,
              tags,
              subTasks {
                id
                body
                isComplete
              },
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
      error() {
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
    },
  },
  data() {
    return {
      isLoading: true,
      goalDetailsDialog: false,
      goalDisplayDialog: false,
      quickTaskDialog: false,
      quickTaskTitle: '',
      quickTaskDescription: '',
      selectedGoalItem: {},
      tasklist: [],
      did: '',
      timerId: '',
      skipDay: false,
      currentGoalPeriod: 'day',
      selectedTaskRef: '',
      date: moment().format('DD-MM-YYYY'),
      lastCompleteItemGoalRef: 0,
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
      }).catch(() => {
        clearInterval(this.timerId);
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
        goal.goalItems = goal.goalItems.filter((goalItem) => goalItem.id !== id);
      });
    },
    refreshTaskGoal(taskRef) {
      this.$apollo.queries.tasklist.refetch();
      this.$apollo.queries.goals.refetch();
      this.lastCompleteItemGoalRef = taskRef;
    },
    getWeekProgress(currentGoalPeriod) {
      if (currentGoalPeriod === 'day') {
        if (this.goals && this.goals.length) {
          const weekGoals = this.goals.find((goal) => (goal.period === 'week'));
          const weekGoalItemMilestoneChecked = weekGoals && weekGoals
            .goalItems.find((goalItem) => (goalItem.id === this.lastCompleteItemGoalRef));
          return (weekGoalItemMilestoneChecked && weekGoalItemMilestoneChecked.progress) || 0;
        }
      }
      return 0;
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
    checkDialogClick(e, task) {
      e.stopPropagation();
      if (!task.passed && !task.wait && !task.ticked) {
        this.selectedTaskRef = task.id;
        this.quickTaskTitle = task.name;
        this.quickTaskDescription = task.description;
        this.quickTaskDialog = true;
      }
    },
    checkClick(task) {
      this.quickTaskDialog = false;
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
        })
          .then(() => this.$apollo.queries.tasklist.refetch())
          .catch(() => {
            task.ticked = false;
            clearInterval(this.timerId);
            this.$notify({
              title: 'Error',
              text: 'An unexpected error occured',
              group: 'notify',
              type: 'error',
              duration: 3000,
            });
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
      }).catch(() => {
        setTimeout(() => { this.skipDay = false; }, 1000);
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occured',
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
          }).catch(() => {
            clearInterval(this.timerId);
            item.passed = false;
            this.$notify({
              title: 'Error',
              text: 'An unexpected error occured',
              group: 'notify',
              type: 'error',
              duration: 3000,
            });
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
          }).catch(() => {
            clearInterval(this.timerId);
            item.wait = false;
            this.$notify({
              title: 'Error',
              text: 'An unexpected error occured',
              group: 'notify',
              type: 'error',
              duration: 3000,
            });
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
    countTotal(stimulus = 'D') {
      const aggregatePoints = this.tasklist.reduce((total, num) => {
        const currentStimulus = num.stimuli.find((st) => st.name === stimulus);
        if (currentStimulus && currentStimulus.earned) {
          return total + currentStimulus.earned;
        }
        return total;
      }, 0);

      if (stimulus === 'G') {
        if (moment(this.date, 'DD-MM-YYYY').weekday() >= (threshold.weekDays - 1)) {
          if (weekOfMonth(this.date) >= (threshold.monthWeeks - 1)) {
            // TODO: Enable this later
            if (moment(this.date, 'DD-MM-YYYY').month() >= (threshold.yearMonths - 1)) {
              return aggregatePoints;
            }
            console.log('month', Number((aggregatePoints * 1.334).toFixed(1)));
            return Number((aggregatePoints * 1.334).toFixed(1));
          }
          console.log('week', aggregatePoints * 2);
          return aggregatePoints * 2;
        }

        console.log('week', aggregatePoints * 4);
        return aggregatePoints * 4;
      }
      return aggregatePoints;
    },
    adoptProgress() {
      const count = this.countTotal();
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
    toggleGoalDisplayDialog(bool, selectedGoalItem) {
      if (selectedGoalItem) {
        // this.selectedGoalItem = { ...selectedGoalItem };
        // eslint-disable-next-line prefer-object-spread
        this.selectedGoalItem = Object.assign({}, this.selectedGoalItem, selectedGoalItem);
      }
      this.goalDisplayDialog = bool;
      if (!bool) {
        this.$apollo.queries.goals.refetch();
      }
    },
    countTaskPercentage(task) {
      const stimulus = task.stimuli.find((st) => st.name === 'K');
      const completed = 100 * (stimulus.earned / task.points);
      return isNaN(completed) ? 0 : completed;
    },
    countTaskCompleted(task) {
      const dStimulus = task.stimuli.find((st) => st.name === 'D');
      const stimulus = task.stimuli.find((st) => st.name === 'K');
      const count = Number((dStimulus.splitRate / stimulus.splitRate).toFixed(0));
      const completed = Number(
        (count * (Number(stimulus.earned) / Number(task.points))).toFixed(0),
      );
      return isNaN(completed) ? 0 : completed;
    },
    countTaskTotal(task) {
      const dStimulus = task.stimuli.find((st) => st.name === 'D');
      const stimulus = task.stimuli.find((st) => st.name === 'K');
      const count = Number((dStimulus.splitRate / stimulus.splitRate).toFixed(0));
      return count;
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
    height: 300px;
  }

  .concentrated-view .active .circular-task,
  .concentrated-view .active .v-list__tile__avatar {
    align-self: start;
  }

/* TODO: Fix zoom problem */
  .concentrated-view .active .v-list__tile .circular-task{
    min-width: 48px;
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
    height: 240px;
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

  .circular-task .v-avatar {
    margin: 0 auto;
  }
</style>
