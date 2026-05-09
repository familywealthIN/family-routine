<template>
  <container-box transparent="true" :isLoading="loading">
    <div class="dashboard-content">
      <atom-layout wrap>
        <atom-flex xs12 class="pa-2">
          <h1 class="display-1">{{ projectTitle }}</h1>
        </atom-flex>

        <!-- Summary Cards -->
        <atom-flex xs12 md6 class="d-flex pa-2">
          <summary-cards
            :goal-items="getFlattenedGoalItems()"
            :tag="tag"
            class="flex-grow-1"
          />
        </atom-flex>
        <atom-flex xs12 md6 class="d-flex pa-2 hidden-xs-only">
          <atom-layout row wrap class="flex-grow-1 w-100">
          <atom-flex xs12 sm6 v-for="period in periods" :key="period.name" class="d-flex pa-2">
          <atom-card class="flex-column" style="width: 100%;">
            <atom-card-title class="pb-1">
              <div class="d-flex justify-space-between align-center" style="width: 100%">
                <span>{{ period.label }} Goals</span>
              </div>
            </atom-card-title>
            <atom-card-text class="flex-grow-1 d-flex align-center justify-center">
              <atom-list class="w-100">
                <template v-if="period.goals.length">
                  <h2>{{ period.completedCount }}/{{ period.goals.length }}</h2>
                </template>
                <atom-list-tile v-else>
                  <atom-list-tile-content>
                    <atom-list-tile-title class="grey--text">
                      No {{ period.label.toLowerCase() }} goals yet
                    </atom-list-tile-title>
                  </atom-list-tile-content>
                </atom-list-tile>
              </atom-list>
            </atom-card-text>
          </atom-card>
        </atom-flex>
        </atom-layout>
        </atom-flex>

        <!-- Recent Activity Timeline -->
        <atom-flex xs12 md6 class="hidden-xs-only">
          <atom-card class="ma-2">
            <atom-card-title>Recent Activity</atom-card-title>
            <atom-card-text>
              <atom-timeline dense>
                <template v-if="recentActivity.length">
                  <atom-timeline-item v-for="activity in recentActivity" :key="activity.date"
                    :color="activity.goals.length ? 'primary' : 'grey'" small>
                    <atom-card flat>
                      <atom-card-title class="py-2">{{ activity.date }}</atom-card-title>
                      <atom-card-text class="py-2">
                        <template v-if="activity.goals.length">
                          <div v-for="goal in activity.goals" :key="goal.id"
                            :class="{ 'completed-goal': goal.isComplete, 'pending-goal': !goal.isComplete }">
                            <atom-icon small :color="goal.isComplete ? 'success' : 'grey'">{{ goal.isComplete ? 'check' :
                              'schedule' }}</atom-icon>
                            {{ goal.body }}
                          </div>
                        </template>
                        <div v-else class="grey--text">
                          No goals for this day
                        </div>
                      </atom-card-text>
                    </atom-card>
                  </atom-timeline-item>
                </template>
                <atom-timeline-item v-else color="grey" small>
                  <atom-card flat>
                    <atom-card-text class="text-xs-center grey--text">
                      No recent activity to show
                    </atom-card-text>
                  </atom-card>
                </atom-timeline-item>
              </atom-timeline>
            </atom-card-text>
          </atom-card>
        </atom-flex>
        <atom-flex xs12 md6 class="pa-2">
          <next-steps
            :goal-items="getFlattenedGoalItems()"
            :tag="tag"
            class="flex-grow-1"
          />
        </atom-flex>
      </atom-layout>
    </div>
  </container-box>
</template>

<script>
import moment from 'moment';
import SummaryCards from '@/containers/SummaryCardsContainer.vue';
import NextSteps from '@/containers/NextStepsContainer.vue';
import ContainerBox from '@routine-notes/ui/templates/ContainerBox/ContainerBox.vue';
import {
  AtomCard,
  AtomCardText,
  AtomCardTitle,
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomList,
  AtomListTile,
  AtomListTileContent,
  AtomListTileTitle,
  AtomTimeline,
  AtomTimelineItem,
} from '@routine-notes/ui/atoms';

export default {
  name: 'ProjectsTime',
  components: {
    SummaryCards,
    NextSteps,
    ContainerBox,
    AtomCard,
    AtomCardText,
    AtomCardTitle,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomList,
    AtomListTile,
    AtomListTileContent,
    AtomListTileTitle,
    AtomTimeline,
    AtomTimelineItem,
  },
  props: {
    tag: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      goals: [],
      loading: true,
      periods: [
        {
          name: 'year', label: 'Year', color: 'primary', goals: [],
        },
        {
          name: 'month', label: 'Month', color: 'info', goals: [],
        },
        {
          name: 'week', label: 'Week', color: 'warning', goals: [],
        },
        {
          name: 'day', label: 'Day', color: 'success', goals: [],
        },
      ],
    };
  },
  watch: {
    tag: {
      immediate: true,
      async handler(newTag) {
        if (newTag) {
          await this.fetchGoalsByTag();
        }
      },
    },
  },
  computed: {
    projectTitle() {
      return this.tag.replace(/^project:/, '').split(':').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    },
    recentActivity() {
      if (!Array.isArray(this.goals)) return [];

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = moment().subtract(i, 'days');
        const dateStr = date.format('DD-MM-YYYY');

        const dayGoals = this.goals.map((item) => {
          if (item.date === dateStr && item.period === 'day') {
            return item.goalItems.map((goal) => ({
              ...goal,
              date: item.date,
              isComplete: goal.isComplete || false,
              progress: goal.progress || 0,
            }));
          }
          return null;
        }).filter(Boolean).flat();

        return {
          date: date.format('MMM DD'),
          goals: dayGoals,
        };
      });

      return last7Days;
    },
  },
  methods: {
    /**
     * Fetch goals by tag using shared composable
     */
    async fetchGoalsByTag() {
      this.loading = true;
      try {
        const goals = await this.$goals.fetchGoalsByTag(this.tag, { useCache: false });
        console.log('Fetch goals - received goals:', goals);
        this.goals = goals || [];
        this.updatePeriodGoals(this.goals);
      } catch (error) {
        console.error('Error fetching goals:', error);
        this.goals = [];
      } finally {
        this.loading = false;
      }
    },
    getFlattenedGoalItems() {
      if (!Array.isArray(this.goals)) return [];
      return this.goals.flatMap((goal) => (
        Array.isArray(goal.goalItems)
          ? goal.goalItems.map((goalItem) => ({
            ...goalItem,
            period: goal.period,
            date: goal.date,
          }))
          : []
      ));
    },

    updatePeriodGoals(goals) {
      if (!Array.isArray(goals)) {
        console.warn('Goals is not an array:', goals);
        return;
      }
      this.periods = this.periods.map((period) => {
        const periodGoals = goals.map((item) => {
          if (item.period === period.name) {
            return item.goalItems.map((goal) => ({
              ...goal,
              date: item.date,
              isComplete: goal.isComplete || false,
              progress: goal.progress || 0,
            }));
          }
          return null;
        }).filter(Boolean).flat();
        const completedCount = periodGoals.filter((goal) => goal.isComplete).length;
        return {
          ...period,
          goals: periodGoals,
          completedCount,
        };
      });
    },
  },
};
</script>

<style scoped>
.display-1 {
  margin-bottom: 20px;
}

.completed-goal,
.pending-goal {
  display: flex;
  align-items: center;
  margin: 4px 0;
}

.completed-goal .v-icon,
.pending-goal .v-icon {
  margin-right: 8px;
}

.completed-goal {
  color: var(--v-success-base);
}

.pending-goal {
  color: var(--v-grey-darken1);
}

.v-timeline-item .v-card {
  margin-bottom: 0;
}

.v-timeline-item .v-card__title {
  padding: 8px 16px;
}

.v-timeline-item .v-card__text {
  padding: 8px 16px;
}

.v-progress-circular {
  margin: 16px;
}

@media (max-width: 599px) {
  .display-1 {
    font-size: 1.5rem !important;
    margin-bottom: 8px;
  }

  .dashboard-content {
    padding-left: 12px;
    padding-right: 12px;
  }
}
</style>
