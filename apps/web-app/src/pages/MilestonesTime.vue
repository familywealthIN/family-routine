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
        <load-error-state
          v-if="loadError"
          message="We couldn't load your goals."
          :retrying="$apollo.queries.goalMilestones.loading"
          @retry="retryMilestones"
        />
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

import GoalItemMilestoneList from '@routine-notes/ui/molecules/GoalItemMilestoneList/GoalItemMilestoneList.vue';
import LoadErrorState from '@routine-notes/ui/molecules/LoadErrorState/LoadErrorState.vue';
import GoalCreation from '../containers/GoalCreationContainer.vue';
import ContainerBox from '@routine-notes/ui/templates/ContainerBox/ContainerBox.vue';
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
} from '@routine-notes/ui/atoms';

export default {
  components: {
    GoalItemMilestoneList,
    LoadErrorState,
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
    goalMilestones: {
      query: gql`
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
                  taskRef
                  goalRef
                }
              }
            }
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
      result({ data }) {
        if (data) this.loadError = false;
      },
      // A failed load leaves goalMilestones undefined, which renders as a blank
      // "Goals" card — indistinguishable from having no milestones at all.
      error(error) {
        console.error('[MilestonesTime] goalMilestones query failed:', error);
        this.loadError = true;
      },
    },
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
    periods: periodsArray,
    loadError: false,
  }),
  methods: {
  },
  methods: {
    retryMilestones() {
      this.$apollo.queries.goalMilestones.refetch().catch(() => {});
    },
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

<style scoped>
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
