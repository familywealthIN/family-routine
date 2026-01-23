<template>
  <container-box transparent="true" :isLoading="$apollo.loading && isFirstLoad">
    <div class="priority-dashboard">
      <v-layout wrap>
        <!-- Header -->
        <v-flex xs12 class="mr-2 ml-2 mb-4" cla>
          <v-layout align-center>
            <v-flex grow>
              <h2 class="headline pl-2 mb-0">
                {{ formattedDate }}
              </h2>
            </v-flex>
            <v-flex shrink>
              <v-btn icon @click="refreshData" :loading="isRefreshing">
                <v-icon>refresh</v-icon>
              </v-btn>
            </v-flex>
          </v-layout>
        </v-flex>

        <!-- Priority Matrix -->
        <v-flex xs12>
          <!-- Summary Stats -->
          <v-layout row wrap class="mr-2 ml-2 mb-4">
            <v-flex xs6 sm3 class="pa-2">
              <v-card class="pa-3" color="error" dark>
                <h1 class="text-xs-center" style="font-size: 48px; line-height: 1;">
                  {{ doItems.length }}
                </h1>
                <div class="text-xs-center caption mt-2">
                  DO NOW
                </div>
              </v-card>
            </v-flex>
            <v-flex xs6 sm3 class="pa-2">
              <v-card class="pa-3" color="primary" dark>
                <h1 class="text-xs-center" style="font-size: 48px; line-height: 1;">
                  {{ planItems.length }}
                </h1>
                <div class="text-xs-center caption mt-2">
                  PLAN
                </div>
              </v-card>
            </v-flex>
            <v-flex xs6 sm3 class="pa-2">
              <v-card class="pa-3" color="warning" dark>
                <h1 class="text-xs-center" style="font-size: 48px; line-height: 1;">
                  {{ delegateItems.length }}
                </h1>
                <div class="text-xs-center caption mt-2">
                  DELEGATE
                </div>
              </v-card>
            </v-flex>
            <v-flex xs6 sm3 class="pa-2">
              <v-card class="pa-3" color="grey darken-1" dark>
                <h1 class="text-xs-center" style="font-size: 48px; line-height: 1;">
                  {{ automateItems.length }}
                </h1>
                <div class="text-xs-center caption mt-2">
                  AUTOMATE
                </div>
              </v-card>
            </v-flex>
          </v-layout>

          <!-- Matrix -->
          <priority-matrix
            :do-items="doItems"
            :plan-items="planItems"
            :delegate-items="delegateItems"
            :automate-items="automateItems"
            :tasklist="tasklist"
            @item-click="handleItemClick"
            @toggle-complete="handleToggleComplete"
            @edit-item="handleEditItem"
          />
        </v-flex>
      </v-layout>

      <!-- Edit Goal Dialog -->
      <v-dialog
        v-model="goalDisplayDialog"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <v-card>
          <v-toolbar color="white">
            <v-spacer></v-spacer>
            <v-btn icon @click="closeEditDialog">
              <v-icon>close</v-icon>
            </v-btn>
          </v-toolbar>
          <v-card class="no-shadow">
            <v-card-text class="pa-0">
              <goal-creation
                :newGoalItem="selectedGoalItem"
                @add-update-goal-entry="handleGoalUpdated"
              />
            </v-card-text>
          </v-card>
        </v-card>
      </v-dialog>
    </div>
  </container-box>
</template>

<script>
import moment from 'moment';
import gql from 'graphql-tag';
import ContainerBox from '@/components/templates/ContainerBox/ContainerBox.vue';
import PriorityMatrix from '../components/organisms/PriorityMatrix/PriorityMatrix.vue';
import GoalCreation from '../components/organisms/GoalCreation/GoalCreation.vue';

export default {
  name: 'Priority',
  components: {
    PriorityMatrix,
    GoalCreation,
    ContainerBox,
  },
  data() {
    return {
      doGoals: [],
      planGoals: [],
      delegateGoals: [],
      automateGoals: [],
      tasklist: [],
      goalDisplayDialog: false,
      selectedGoalItem: {},
      isFirstLoad: true,
      isRefreshing: false,
      currentDate: moment().format('DD-MM-YYYY'),
    };
  },
  apollo: {
    doGoals: {
      query: gql`
        query goalsByTag($tag: String!) {
          goalsByTag(tag: $tag) {
            id
            period
            date
            goalItems {
              id
              body
              isComplete
              progress
              tags
              taskRef
              goalRef
              status
              contribution
              reward
              isMilestone
              subTasks {
                id
                body
                isComplete
              }
            }
          }
        }
      `,
      variables() {
        return { tag: 'priority:do' };
      },
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        this.isFirstLoad = false;
        return data.goalsByTag || [];
      },
    },
    planGoals: {
      query: gql`
        query goalsByTag($tag: String!) {
          goalsByTag(tag: $tag) {
            id
            period
            date
            goalItems {
              id
              body
              isComplete
              progress
              tags
              taskRef
              goalRef
              status
              contribution
              reward
              isMilestone
              subTasks {
                id
                body
                isComplete
              }
            }
          }
        }
      `,
      variables() {
        return { tag: 'priority:plan' };
      },
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        return data.goalsByTag || [];
      },
    },
    delegateGoals: {
      query: gql`
        query goalsByTag($tag: String!) {
          goalsByTag(tag: $tag) {
            id
            period
            date
            goalItems {
              id
              body
              isComplete
              progress
              tags
              taskRef
              goalRef
              status
              contribution
              reward
              isMilestone
              subTasks {
                id
                body
                isComplete
              }
            }
          }
        }
      `,
      variables() {
        return { tag: 'priority:delegate' };
      },
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        return data.goalsByTag || [];
      },
    },
    automateGoals: {
      query: gql`
        query goalsByTag($tag: String!) {
          goalsByTag(tag: $tag) {
            id
            period
            date
            goalItems {
              id
              body
              isComplete
              progress
              tags
              taskRef
              goalRef
              status
              contribution
              reward
              isMilestone
              subTasks {
                id
                body
                isComplete
              }
            }
          }
        }
      `,
      variables() {
        return { tag: 'priority:automate' };
      },
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        return data.goalsByTag || [];
      },
    },
    tasklist: {
      query: gql`
        query getRoutineDate($date: String!) {
          routineDate(date: $date) {
            id
            tasklist {
              id
              name
            }
          }
        }
      `,
      variables() {
        return { date: this.currentDate };
      },
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        return data.routineDate && data.routineDate.tasklist
          ? data.routineDate.tasklist
          : [];
      },
    },
  },
  computed: {
    formattedDate() {
      return moment(this.currentDate, 'DD-MM-YYYY').format('MMMM D, YYYY');
    },
    doItems() {
      return this.flattenAndFilterGoals(this.doGoals);
    },
    planItems() {
      return this.flattenAndFilterGoals(this.planGoals);
    },
    delegateItems() {
      return this.flattenAndFilterGoals(this.delegateGoals);
    },
    automateItems() {
      return this.flattenAndFilterGoals(this.automateGoals);
    },
  },
  methods: {
    flattenAndFilterGoals(goals) {
      const today = moment(this.currentDate, 'DD-MM-YYYY');

      return goals
        .filter((goal) => {
          // Filter to current day only
          const goalDate = moment(goal.date, 'DD-MM-YYYY');
          return goalDate.isSame(today, 'day');
        })
        .flatMap((goal) => goal.goalItems.map((item) => ({
          ...item,
          period: goal.period,
          date: goal.date,
          goalId: goal.id,
        })));
    },
    handleItemClick(item) {
      // Open edit dialog
      this.handleEditItem(item);
    },
    handleEditItem(item) {
      this.selectedGoalItem = {
        id: item.id,
        body: item.body,
        progress: item.progress,
        isComplete: item.isComplete,
        taskRef: item.taskRef,
        goalRef: item.goalRef,
        contribution: item.contribution || '',
        reward: item.reward || '',
        tags: item.tags || [],
        status: item.status,
        isMilestone: item.isMilestone,
        subTasks: item.subTasks || [],
        date: item.date,
        period: item.period,
      };
      this.goalDisplayDialog = true;
    },
    async handleToggleComplete(item) {
      try {
        await this.$apollo.mutate({
          mutation: gql`
            mutation completeGoalItem(
              $id: ID!
              $taskRef: String!
              $date: String!
              $period: String!
              $isComplete: Boolean!
              $isMilestone: Boolean!
            ) {
              completeGoalItem(
                id: $id
                taskRef: $taskRef
                date: $date
                period: $period
                isComplete: $isComplete
                isMilestone: $isMilestone
              ) {
                id
                isComplete
                status
                completedAt
              }
            }
          `,
          variables: {
            id: item.id,
            taskRef: item.taskRef || '',
            date: item.date,
            period: item.period,
            isComplete: !item.isComplete,
            isMilestone: item.isMilestone || false,
          },
        });

        // Refetch all goals
        this.refreshData();

        this.$notify({
          title: 'Success',
          text: item.isComplete ? 'Task marked incomplete' : 'Task completed',
          group: 'notify',
          type: 'success',
          duration: 2000,
        });
      } catch (error) {
        console.error('Error toggling task completion:', error);
        this.$notify({
          title: 'Error',
          text: 'Failed to update task',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      }
    },
    handleGoalUpdated() {
      this.closeEditDialog();
      this.refreshData();
    },
    closeEditDialog() {
      this.goalDisplayDialog = false;
      this.selectedGoalItem = {};
    },
    async refreshData() {
      this.isRefreshing = true;
      try {
        await Promise.all([
          this.$apollo.queries.doGoals.refetch(),
          this.$apollo.queries.planGoals.refetch(),
          this.$apollo.queries.delegateGoals.refetch(),
          this.$apollo.queries.automateGoals.refetch(),
          this.$apollo.queries.tasklist.refetch(),
        ]);
      } catch (error) {
        console.error('Error refreshing data:', error);
      } finally {
        this.isRefreshing = false;
      }
    },
  },
};
</script>

<style scoped>

.flex-grow-1 {
  flex-grow: 1;
}

.no-shadow {
  box-shadow: none !important;
}

@media (max-width: 600px) {
  .display-1 {
    font-size: 24px !important;
  }
}
</style>
