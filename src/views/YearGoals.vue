<template>
  <v-container fluid>
    <v-layout wrap>
      <v-flex xs12>
        <h1 class="display-1">{{ yearGoalTitle }}</h1>
      </v-flex>

      <!-- Summary Cards -->
      <v-flex xs12 md6 class="d-flex">
        <summary-cards
          :goal-items="transformedGoalItems"
          class="mb-4 flex-grow-1"
        />
      </v-flex>
      <v-flex xs12 md6 class="d-flex">
        <v-layout row wrap class="flex-grow-1">
          <v-flex xs12 md6 v-for="period in periods" :key="period.name" class="d-flex">
            <v-card class="ma-2 modern-card d-flex flex-column" style="width: 100%;">
              <v-card-title class="pb-1">
                <div class="d-flex justify-space-between align-center" style="width: 100%">
                  <span>{{ period.label }} Goals</span>
                </div>
              </v-card-title>
              <v-card-text class="flex-grow-1 d-flex align-center justify-center">
                <v-list v-if="!loading" class="w-100">
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
                <div v-else class="text-xs-center w-100">
                  <v-progress-circular indeterminate></v-progress-circular>
                </div>
              </v-card-text>
            </v-card>
          </v-flex>
        </v-layout>
      </v-flex>

      <!-- Year Goals Progress and Next Steps -->
      <v-flex xs12 md6>
        <v-card class="ma-2 modern-card-elevated">
          <v-card-title>Year Goals Progress</v-card-title>
          <v-card-text>
            <v-timeline v-if="!loading" dense>
              <template v-if="yearGoals.length">
                <v-timeline-item v-for="goal in yearGoals" :key="goal.id"
                  :color="isGoalComplete(goal) ? 'success' : 'primary'" small>
                  <v-card flat>
                    <v-card-title class="py-2">{{ formatGoalDate(goal.date) }}</v-card-title>
                    <v-card-text class="py-2">
                      <div :class="{ 'completed-goal': isGoalComplete(goal), 'pending-goal': !isGoalComplete(goal) }">
                        <v-icon small :color="isGoalComplete(goal) ? 'success' : 'grey'">
                          {{ isGoalComplete(goal) ? 'check' : 'schedule' }}
                        </v-icon>
                        {{ goal.body }}
                      </div>
                      <div v-if="goal.milestones && goal.milestones.length" class="ml-4 mt-2">
                        <div v-for="milestone in goal.milestones" :key="milestone.id"
                          class="milestone-item"
                          :class="{ 'completed-milestone': milestone.isComplete }">
                          <v-icon small :color="milestone.isComplete ? 'success' : 'grey'">
                            {{ milestone.isComplete ? 'check_circle_outline' : 'radio_button_unchecked' }}
                          </v-icon>
                          {{ milestone.body }}
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-timeline-item>
              </template>
              <v-timeline-item v-else color="grey" small>
                <v-card flat>
                  <v-card-text class="text-xs-center grey--text">
                    No year goals to show
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
      <v-flex xs12 md6>
        <next-steps
          :goal-items="transformedGoalItems"
          class="ma-2"
        />
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';
import SummaryCards from '@/components/DashboardCards/SummaryCards.vue';
import NextSteps from '@/components/DashboardCards/NextSteps.vue';

export default {
  name: 'YearGoals',
  components: {
    SummaryCards,
    NextSteps,
  },
  props: {
    tag: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      loading: false,
      goals: [],
      yearGoals: [],
      periods: [
        {
          name: 'Q1',
          label: 'Q1',
          goals: [],
          completedCount: 0,
        },
        {
          name: 'Q2',
          label: 'Q2',
          goals: [],
          completedCount: 0,
        },
        {
          name: 'Q3',
          label: 'Q3',
          goals: [],
          completedCount: 0,
        },
        {
          name: 'Q4',
          label: 'Q4',
          goals: [],
          completedCount: 0,
        },
      ],
    };
  },
  computed: {
    yearGoalTitle() {
      return this.tag
        ? this.formatYearGoalName(this.tag)
        : 'Year Goals';
    },
    transformedGoalItems() {
      return this.goals.flatMap((goal) => (Array.isArray(goal.goalItems)
        ? goal.goalItems.map((goalItem) => ({
          ...goalItem,
          period: goal.period,
          date: goal.date,
        }))
        : []));
    },
  },
  apollo: {
    goals: {
      query: gql`
        query yearGoals($period: String!) {
          yearGoals(period: $period) {
            id
            date
            period
            goalItems {
              id
              body
              isComplete
              isMilestone
              deadline
              milestones {
                id
                body
                isComplete
                deadline
              }
            }
          }
        }
      `,
      variables() {
        return {
          period: 'year',
        };
      },
      update(data) {
        this.yearGoals = data.yearGoals;
        this.updatePeriodGoals(data.yearGoals);
        return data.yearGoals;
      },
    },
  },
  methods: {
    formatYearGoalName(tag) {
      return tag
        .replace(/^year:/, '')
        .split(':')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    },
    formatGoalDate(date) {
      return moment(date).format('MMMM YYYY');
    },
    isGoalComplete(goal) {
      return goal.isComplete || (
        goal.milestones
        && goal.milestones.every((milestone) => milestone.isComplete)
      );
    },
    getQuarter(date) {
      const month = moment(date).month();
      if (month < 3) return 'Q1';
      if (month < 6) return 'Q2';
      if (month < 9) return 'Q3';
      return 'Q4';
    },
    updatePeriodGoals(goals) {
      // Reset period goals
      this.periods = this.periods.map((period) => ({
        ...period,
        goals: [],
        completedCount: 0,
      }));

      // Group goals by quarter
      goals.forEach((goal) => {
        const quarter = this.getQuarter(goal.date);
        const periodIndex = this.periods.findIndex((period) => period.name === quarter);

        if (periodIndex !== -1) {
          const periodCopy = { ...this.periods[periodIndex] };
          periodCopy.goals.push(goal);
          if (this.isGoalComplete(goal)) {
            periodCopy.completedCount += 1;
          }
          this.$set(this.periods, periodIndex, periodCopy);
        }
      });
    },
  },
};
</script>

<style scoped>
.completed-goal {
  color: rgba(0, 0, 0, 0.54);
  text-decoration: line-through;
}

.milestone-item {
  font-size: 0.9em;
  margin-top: 4px;
}

.completed-milestone {
  color: rgba(0, 0, 0, 0.54);
  text-decoration: line-through;
}

.v-timeline-item__body {
  max-width: 100%;
}
</style>
