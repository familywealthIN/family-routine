<script>
/* eslint-disable max-len */
</script>
<template>
  <container-box :isLoading="$apollo.queries.goalMilestones.loading">
    <atom-card-text class="py-0 px-0">
      <atom-list subheader>
        <atom-subheader
          class="subheading"
        >
          Goals
        </atom-subheader>
        <template v-for="period in periods">
          <div v-if="goalMilestones && goalMilestones[period.name].length" v-bind:key="period.name">
            <atom-list-group v-model="period.active">
              <template v-slot:activator>
                <atom-list-tile>
                  <atom-list-tile-content>
                    <atom-list-tile-title>{{ period.name }} Goals</atom-list-tile-title>
                  </atom-list-tile-content>
                </atom-list-tile>
              </template>
              <ul><goal-item-milestone-list :goalItems="goalMilestones[period.name]" /></ul>
            </atom-list-group>
          </div>
        </template>
        <!-- <div class="text-xs-center" v-else>
          You Don't have any Goals in life. Poor Fellow.
        </div> -->
      </atom-list>
    </atom-card-text>
    <atom-button
      fixed
      dark
      fab
      bottom
      class="second-right-btn"
      color="info"
      @click="$router.push('/goals')"
    >
      <atom-icon>view_agenda</atom-icon>
    </atom-button>
  </container-box>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';

import { defaultGoalItem, periodsArray } from '../constants/goals';

import GoalItemMilestoneList from '../components/molecules/GoalItemMilestoneList/GoalItemMilestoneList.vue';
import GoalCreation from '../containers/GoalCreationContainer.vue';
import ContainerBox from '../components/templates/ContainerBox/ContainerBox.vue';
import {
  AtomButton,
  AtomCardText,
  AtomIcon,
  AtomList,
  AtomListGroup,
  AtomListTile,
  AtomListTileContent,
  AtomListTileTitle,
  AtomSubheader,
} from '../components/atoms';

export default {
  components: {
    GoalItemMilestoneList,
    GoalCreation,
    ContainerBox,
    AtomButton,
    AtomCardText,
    AtomIcon,
    AtomList,
    AtomListGroup,
    AtomListTile,
    AtomListTileContent,
    AtomListTileTitle,
    AtomSubheader,
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
