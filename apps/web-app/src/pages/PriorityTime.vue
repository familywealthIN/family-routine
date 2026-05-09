<template>
  <container-box transparent="true" :isLoading="isLoading">
    <div class="priority-dashboard">
      <atom-layout wrap>
        <!-- Header -->
        <atom-flex xs12 class="mr-2 ml-2 mb-4" cla>
          <atom-layout align-center>
            <atom-flex grow>
              <h2 class="headline pl-2 mb-0">
                {{ formattedDate }}
              </h2>
            </atom-flex>
            <atom-flex shrink>
              <atom-button icon @click="refreshData" :loading="isRefreshing">
                <atom-icon>refresh</atom-icon>
              </atom-button>
            </atom-flex>
          </atom-layout>
        </atom-flex>

        <!-- Priority Matrix -->
        <atom-flex xs12>
          <!-- Summary Stats -->
          <atom-layout row wrap class="mr-2 ml-2 mb-4">
            <atom-flex xs6 sm3 class="pa-2">
              <atom-card class="pa-3" style="border-top: 3px solid #F44336;">
                <h1 class="text-xs-center" style="font-size: 48px; line-height: 1; color: #F44336;">
                  {{ doItems.length }}
                </h1>
                <div class="text-xs-center caption mt-2 grey--text">
                  DO NOW
                </div>
              </atom-card>
            </atom-flex>
            <atom-flex xs6 sm3 class="pa-2">
              <atom-card class="pa-3" style="border-top: 3px solid #1976D2;">
                <h1 class="text-xs-center" style="font-size: 48px; line-height: 1; color: #1976D2;">
                  {{ planItems.length }}
                </h1>
                <div class="text-xs-center caption mt-2 grey--text">
                  PLAN
                </div>
              </atom-card>
            </atom-flex>
            <atom-flex xs6 sm3 class="pa-2">
              <atom-card class="pa-3" style="border-top: 3px solid #FF9800;">
                <h1 class="text-xs-center" style="font-size: 48px; line-height: 1; color: #FF9800;">
                  {{ delegateItems.length }}
                </h1>
                <div class="text-xs-center caption mt-2 grey--text">
                  DELEGATE
                </div>
              </atom-card>
            </atom-flex>
            <atom-flex xs6 sm3 class="pa-2">
              <atom-card class="pa-3" style="border-top: 3px solid #757575;">
                <h1 class="text-xs-center" style="font-size: 48px; line-height: 1; color: #757575;">
                  {{ automateItems.length }}
                </h1>
                <div class="text-xs-center caption mt-2 grey--text">
                  AUTOMATE
                </div>
              </atom-card>
            </atom-flex>
          </atom-layout>

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
        </atom-flex>
      </atom-layout>

      <!-- Edit Goal Dialog -->
      <atom-dialog
        v-model="goalDisplayDialog"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <atom-card>
          <atom-toolbar color="white">
            <atom-spacer></atom-spacer>
            <atom-button icon @click="closeEditDialog">
              <atom-icon>close</atom-icon>
            </atom-button>
          </atom-toolbar>
          <atom-card class="no-shadow">
            <atom-card-text class="pa-0">
              <goal-creation
                :newGoalItem="selectedGoalItem"
                @add-update-goal-entry="handleGoalUpdated"
              />
            </atom-card-text>
          </atom-card>
        </atom-card>
      </atom-dialog>
    </div>
  </container-box>
</template>

<script>
import moment from 'moment';
import ContainerBox from '@routine-notes/ui/templates/ContainerBox/ContainerBox.vue';
import { defaultGoalItem } from '@/constants/goals';
import {
  AtomButton,
  AtomCard,
  AtomCardText,
  AtomDialog,
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomSpacer,
  AtomToolbar,
} from '@routine-notes/ui/atoms';
import PriorityMatrix from '@routine-notes/ui/organisms/PriorityMatrix/PriorityMatrix.vue';
import GoalCreation from '../containers/GoalCreationContainer.vue';

export default {
  name: 'PriorityTime',
  components: {
    PriorityMatrix,
    GoalCreation,
    ContainerBox,
    AtomButton,
    AtomCard,
    AtomCardText,
    AtomDialog,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomSpacer,
    AtomToolbar,
  },
  data() {
    return {
      doGoals: [],
      planGoals: [],
      delegateGoals: [],
      automateGoals: [],
      tasklist: [],
      goalDisplayDialog: false,
      selectedGoalItem: { ...defaultGoalItem }, // Initialize with all default fields
      isFirstLoad: true,
      isRefreshing: false,
      currentDate: moment().format('DD-MM-YYYY'),
    };
  },
  computed: {
    formattedDate() {
      return moment(this.currentDate, 'DD-MM-YYYY').format('MMMM D, YYYY');
    },
    doItems() {
      return this.doGoals;
    },
    planItems() {
      return this.planGoals;
    },
    delegateItems() {
      return this.delegateGoals;
    },
    automateItems() {
      return this.automateGoals;
    },
    isLoading() {
      return this.isFirstLoad && !this.doGoals.length;
    },
  },
  async mounted() {
    if (this.$root.$data.email) {
      await this.loadAllGoals();
    }
  },
  watch: {
    '$root.$data.email': {
      async handler(newVal) {
        if (newVal) {
          await this.loadAllGoals();
        }
      },
    },
  },
  methods: {
    /**
     * Load all priority goals using single priorityGoals query
     */
    async loadAllGoals() {
      this.isFirstLoad = true;
      try {
        // Single query for all priority goals + routine fetch in parallel
        const [priorityData, routineData] = await Promise.all([
          this.$goals.fetchPriorityGoals(this.currentDate, { useCache: true }),
          this.$routine.fetchRoutine(this.currentDate, { useCache: true }),
        ]);

        this.doGoals = priorityData?.do || [];
        this.planGoals = priorityData?.plan || [];
        this.delegateGoals = priorityData?.delegate || [];
        this.automateGoals = priorityData?.automate || [];
        this.tasklist = routineData?.tasklist || [];
      } catch (error) {
        console.error('Error loading goals:', error);
      } finally {
        this.isFirstLoad = false;
      }
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
        await this.$goals.completeGoalItem({
          id: item.id,
          taskRef: item.taskRef || '',
          date: item.date,
          period: item.period,
          isComplete: !item.isComplete,
          isMilestone: item.isMilestone || false,
          dayDate: this.currentDate,
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
        await this.loadAllGoals();
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
