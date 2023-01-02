<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box :isLoading="$apollo.queries.goalMilestones.loading">
    <v-card-text class="py-0 px-0">
      <v-list subheader>
        <v-subheader
          class="subheading"
        >
          Goals
        </v-subheader>
        <template v-for="period in periods">
          <div v-if="goalMilestones && goalMilestones[period.name].length" v-bind:key="period.name">
            <v-list-group v-model="period.active">
              <template v-slot:activator>
                <v-list-tile>
                  <v-list-tile-content>
                    <v-list-tile-title>{{ period.name }} Goals</v-list-tile-title>
                  </v-list-tile-content>
                </v-list-tile>
              </template>
              <ul><goal-item-milestone-list :goalItems="goalMilestones[period.name]" /></ul>
            </v-list-group>
          </div>
        </template>
        <!-- <div class="text-xs-center" v-else>
          You Don't have any Goals in life. Poor Fellow.
        </div> -->
      </v-list>
    </v-card-text>
    <v-btn
      fixed
      dark
      fab
      bottom
      class="second-right-btn"
      color="info"
      @click="$router.push('/goals')"
    >
      <v-icon>view_agenda</v-icon>
    </v-btn>
  </container-box>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';

import { defaultGoalItem, periodsArray } from '../constants/goals';

import GoalItemMilestoneList from '../components/GoalItemMilestoneList.vue';
import GoalCreation from '../components/GoalCreation.vue';
import ContainerBox from '../components/ContainerBox.vue';

export default {
  components: {
    GoalItemMilestoneList,
    GoalCreation,
    ContainerBox,
  },
  apollo: {
    goalMilestones: gql`
      query {
        goalMilestones {
          day {
            id
            body
            period
            date
            deadline
            contribution
            reward
            isComplete
            isMilestone
            taskRef
            goalRef
          }
          week {
            id
            body
            period
            date
            deadline
            contribution
            reward
            isComplete
            isMilestone
            taskRef
            goalRef
            milestones {
              id
              body
              period
              date
              deadline
              contribution
              reward
              isComplete
              isMilestone
              taskRef
              goalRef
            }
          }
          month {
            id
            body
            period
            date
            deadline
            contribution
            reward
            isComplete
            isMilestone
            taskRef
            goalRef
            milestones {
              id
              body
              period
              date
              deadline
              contribution
              reward
              isComplete
              isMilestone
              taskRef
              goalRef
              milestones {
                id
                body
                period
                date
                deadline
                contribution
                reward
                isComplete
                isMilestone
                taskRef
                goalRef
              }
            }
          }
          year {
            id
            body
            period
            date
            deadline
            contribution
            reward
            isComplete
            isMilestone
            taskRef
            goalRef
          }
          lifetime {
            id
            body
            period
            date
            deadline
            contribution
            reward
            isComplete
            isMilestone
            taskRef
            goalRef
            milestones {
              id
              body
              period
              date
              deadline
              contribution
              reward
              isComplete
              isMilestone
              taskRef
              goalRef
              milestones {
                id
                body
                period
                date
                deadline
                contribution
                reward
                isComplete
                isMilestone
                taskRef
                goalRef
                milestones {
                  id
                  body
                  period
                  date
                  deadline
                  contribution
                  reward
                  isComplete
                  isMilestone
                  milestones {
                    id
                    body
                    period
                    date
                    deadline
                    contribution
                    reward
                    isComplete
                    isMilestone
                    taskRef
                    goalRef
                  }
                  taskRef
                  goalRef
                }
              }
            }
          }
        }
      }
    `,
  },
  computed: {
    date() {
      return moment().format('DD-MM-YYYY');
    },
  },
  data: () => ({
    valid: true,
    addGoalItemDialog: false,
    buttonLoading: false,
    goalActionText: 'Add Goal',
    groupId: '',
    periods: periodsArray
  }),
  methods: {
  },
  methods: {
    getGoal(period, date) {
      const goal = this.goalMilestones.find((aGoal) => aGoal.period === period && aGoal.date === date);
      if (!goal) {
        const newGoal = {
          id: `${Math.random()}`,
          period,
          date,
          goalItems: [],
        };
        this.goalMilestones.push(newGoal);
        return newGoal;
      }

      return goal;
    },
  },
};
</script>

<style>
  .second-right-btn {
   right: 84px;
  }
  .custom-loader {
    animation: loader 1s infinite;
    display: flex;
  }
  @-moz-keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @-webkit-keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @-o-keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
  @keyframes loader {
    from {
      transform: rotate(0);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
