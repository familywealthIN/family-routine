<template>
  <v-container fluid>
    <v-layout wrap>
      <v-flex xs12>
        <h1 class="display-1">{{ projectTitle }}</h1>
      </v-flex>
      <v-flex xs12 sm6 md3 v-for="period in periods" :key="period.name">
        <v-card class="ma-2">
          <v-card-title class="pb-1">
            <div class="d-flex justify-space-between align-center" style="width: 100%">
              <span>{{ period.label }} Goals</span>
            </div>
          </v-card-title>
          <v-card-text>
            <v-list v-if="!loading">
              <template v-if="period.goals.length">
                <h2>{{ period.completedCount }}/{{ period.goals.length }}</h2>
              </template>
              <v-list-tile v-else>
                <v-list-tile-content>
                  <v-list-tile-title class="grey--text">
                    No {{ period.label.toLowerCase() }} goals yet
                  </v-list-tile-title>
                </v-list-tile-content>
              </v-list-tile>
            </v-list>
            <div v-else class="text-xs-center">
              <v-progress-circular indeterminate></v-progress-circular>
            </div>
          </v-card-text>
        </v-card>
      </v-flex>

      <!-- Recent Activity Timeline -->
      <v-flex xs12>
        <v-card class="ma-2">
          <v-card-title>Recent Activity</v-card-title>
          <v-card-text>
            <v-timeline v-if="!loading" dense>
              <template v-if="recentActivity.length">
                <v-timeline-item v-for="activity in recentActivity" :key="activity.date"
                  :color="activity.goals.length ? 'primary' : 'grey'" small>
                  <v-card flat>
                    <v-card-title class="py-2">{{ activity.date }}</v-card-title>
                    <v-card-text class="py-2">
                      <template v-if="activity.goals.length">
                        <div v-for="goal in activity.goals" :key="goal.id"
                          :class="{ 'completed-goal': goal.isComplete, 'pending-goal': !goal.isComplete }">
                          <v-icon small :color="goal.isComplete ? 'success' : 'grey'">{{ goal.isComplete ? 'check' :
                            'schedule' }}</v-icon>
                          {{ goal.body }}
                        </div>
                      </template>
                      <div v-else class="grey--text">
                        No goals for this day
                      </div>
                    </v-card-text>
                  </v-card>
                </v-timeline-item>
              </template>
              <v-timeline-item v-else color="grey" small>
                <v-card flat>
                  <v-card-text class="text-xs-center grey--text">
                    No recent activity to show
                  </v-card-text>
                </v-card>
              </v-timeline-item>
            </v-timeline>
            <div v-else class="text-xs-center">
              <v-progress-circular indeterminate></v-progress-circular>
            </div>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';

export default {
  name: 'Projects',
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
  apollo: {
    goals: {
      query: gql`
        query goalsByTag($tag: String!) {
          goalsByTag(tag: $tag) {
            id
            period
            date
            goalItems {
              id
              body
              period
              date
              isComplete
              progress
              tags
              taskRef
              isMilestone
              __typename
            }
          }
        }
      `,
      variables() {
        return {
          tag: this.tag,
        };
      },
      update(data) {
        this.loading = false;
        const goals = data.goalsByTag || [];
        console.log('Apollo update - received goals:', goals);
        this.updatePeriodGoals(goals);
        return goals;
      },
      error(error) {
        console.error('Error fetching goals:', error);
        this.loading = false;
      },
    },
  },
  computed: {
    projectTitle() {
      return this.tag.replace(/^project:/, '').split(':').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    },
    recentActivity() {
      if (!Array.isArray(this.goals)) return [];

      console.log('Goals data:', this.goals);

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = moment().subtract(i, 'days');
        const dateStr = date.format('DD-MM-YYYY');

        const dayGoals = this.goals.map((item) => {
          if (item.date === dateStr && item.period === 'day') {
            console.log(`Processing goals for date: ${dateStr}`, item.goalItems);
            return item.goalItems.map((goal) => ({
              ...goal,
              date: item.date,
              isComplete: goal.isComplete || false,
              progress: goal.progress || 0,
            }));
          }
          return null;
        }).filter(Boolean).flat();

        console.log(`Goals for ${dateStr}:`, dayGoals);

        return {
          date: date.format('MMM DD'),
          goals: dayGoals,
        };
      });

      return last7Days;
    },
  },
  methods: {
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
</style>
