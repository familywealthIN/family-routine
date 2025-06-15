<template>
  <v-container fluid>
    <v-layout wrap>
      <v-flex xs12>
        <h1 class="display-1">{{ projectTitle }}</h1>
      </v-flex>

      <!-- Project Overview Cards -->
      <v-flex xs12 sm6 md3 v-for="period in periods" :key="period.name">
        <v-card class="ma-2">
          <v-card-title>{{ period.label }} Goals</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item v-for="goal in period.goals" :key="goal.id">
                <v-list-item-content>
                  <v-list-item-title>{{ goal.body }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-progress-linear
                      :value="goal.progress"
                      height="10"
                      :color="period.color"
                    ></v-progress-linear>
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-flex>

      <!-- Recent Activity Timeline -->
      <v-flex xs12>
        <v-card class="ma-2">
          <v-card-title>Recent Activity</v-card-title>
          <v-card-text>
            <v-timeline dense>
              <v-timeline-item
                v-for="activity in recentActivity"
                :key="activity.date"
                :color="activity.completedGoals.length ? 'green' : 'grey'"
                small
              >
                <v-card>
                  <v-card-title class="subtitle-2">{{ activity.date }}</v-card-title>
                  <v-card-text>
                    <div v-for="goal in activity.completedGoals" :key="goal.id">
                      {{ goal.body }}
                    </div>
                    <div v-if="!activity.completedGoals.length" class="grey--text">
                      No activity
                    </div>
                  </v-card-text>
                </v-card>
              </v-timeline-item>
            </v-timeline>
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
        { name: 'year', label: 'Year', color: 'primary', goals: [] },
        { name: 'month', label: 'Month', color: 'info', goals: [] },
        { name: 'week', label: 'Week', color: 'warning', goals: [] },
        { name: 'day', label: 'Day', color: 'success', goals: [] },
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
        this.updatePeriodGoals(data.goalsByTag);
        return data.goalsByTag;
      },
    },
  },
  computed: {
    projectTitle() {
      return this.tag.replace(/^project:/, '').split(':').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    },
    recentActivity() {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = moment().subtract(i, 'days');
        const dateStr = date.format('DD-MM-YYYY');
        const dayGoals = this.goals
          .flatMap(goal => goal.goalItems)
          .filter(item => 
            item.period === 'day' && 
            item.date === dateStr
          );
        
        return {
          date: date.format('MMM DD'),
          completedGoals: dayGoals.filter(goal => goal.isComplete),
        };
      });

      return last7Days.reverse();
    },
  },
  methods: {
    updatePeriodGoals(goals) {
      this.periods.forEach(period => {
        period.goals = goals
          .flatMap(goal => goal.goalItems)
          .filter(item => item.period === period.name);
      });
    },
  },
};
</script>

<style scoped>
.display-1 {
  margin-bottom: 20px;
}
</style>