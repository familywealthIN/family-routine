<template>
  <div>
    <v-list-group
      v-if="yearGoals.length"
      prepend-icon="assignment"
      :value="false"
    >
      <template v-slot:activator>

          <v-list-tile-title class="subheader">Goals</v-list-tile-title>
      </template>

      <v-list-tile
        v-for="goal in groupedYearGoals"
        :key="goal.category"
        :to="{ name: 'yearGoals', params: { category: goal.category }}"
      >
        <v-list-tile-action>
          <v-icon>calendar_today</v-icon>
        </v-list-tile-action>
        <v-list-tile-content>
          <v-list-tile-title>
            {{ goal.category }}
            <span class="goal-count">({{ goal.count }}/{{ goal.total }})</span>
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
  </div>
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
              isComplete
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
      const goalsMap = new Map();
      this.yearGoals.forEach((goal) => {
        goal.goalItems.forEach((item) => {
          // Use body as category
          if (!goalsMap.has(item.body)) {
            goalsMap.set(item.body, {
              category: item.body,
              completed: item.isComplete ? 1 : 0,
              total: 1,
            });
          } else {
            const goalStat = goalsMap.get(item.body);
            goalStat.total += 1;
            if (item.isComplete) {
              goalStat.completed += 1;
            }
          }
        });
      });

      return Array.from(goalsMap.values()).map((goal) => ({
        category: goal.category,
        count: goal.completed,
        total: goal.total,
      }));
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
</style>
