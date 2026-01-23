<template>
  <v-list class="pa-0">
    <v-list-group
      prepend-icon="assignment"
      :value="false"
    >
      <template v-slot:activator>

          <v-list-tile-title class="subheader">Goals</v-list-tile-title>
      </template>

      <v-list-tile
        v-for="goal in groupedYearGoals"
        :key="goal.id"
        :to="{ name: 'yearGoal', params: { id: goal.id }}"
      >
        <v-list-tile-action>
          <v-icon>calendar_today</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          <v-list-tile-title>
            {{ goal.title }}
            <span class="goal-count">({{ goal.count }}/{{ goal.total }})</span>
          </v-list-tile-title>
        </v-list-tile-content>
      </v-list-tile>

      <!-- Show message when no goals exist -->
      <v-list-tile v-if="!yearGoals.length">
        <v-list-tile-content>
          <v-list-tile-title class="no-goals-message">
            No goals created yet
          </v-list-tile-title>
        </v-list-tile-content>
      </v-list-tile>

      <v-list-tile to="/goals">
          <v-list-tile-action>
            <v-icon>list</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>All Goals</v-list-tile-title>
          </v-list-tile-content>
      </v-list-tile>
    </v-list-group>
  </v-list>
</template>

<script>
import gql from 'graphql-tag';

export default {
  name: 'YearGoalSidebar',
  data() {
    return {
      yearGoals: [],
    };
  },
  apollo: {
    yearGoals: {
      query: gql`
        query currentYearGoals {
          currentYearGoals {
            id
            date
            goalItems {
              id
              body
              status
              milestones {
                id
                status
              }
            }
          }
        }
      `,
      update(data) {
        return data.currentYearGoals || [];
      },
    },
  },
  computed: {
    groupedYearGoals() {
      const goalsArray = [];

      this.yearGoals.forEach((goalGroup) => {
        goalGroup.goalItems.forEach((goalItem) => {
          // Calculate completion stats
          const milestones = goalItem.milestones || [];
          const completedMilestones = milestones.filter((m) => m.status === 'done').length;
          const totalMilestones = milestones.length;

          goalsArray.push({
            id: goalItem.id,
            title: goalItem.body,
            count: completedMilestones,
            total: totalMilestones,
            isComplete: goalItem.status === 'done',
          });
        });
      });

      return goalsArray;
    },
  },
};
</script>

<style>
.v-list__group__header  {
  min-height: 40px;
}
.v-list__group__header .v-list__group__header__prepend-icon {
  color: var(--v-primary-base);
  min-width: 70px;
}
.subheader {
  font-size: 14px;
  font-weight: bold;
  color: rgba(0, 0, 0, 0.54) !important;
}
.goal-count {
  font-size: 0.85em;
  color: rgba(0, 0, 0, 0.6);
  margin-left: 8px;
}
.no-goals-message {
  font-size: 0.9em;
  color: rgba(0, 0, 0, 0.5) !important;
  font-style: italic;
}
</style>
