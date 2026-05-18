<template>
  <AtomList class="pa-0">
    <AtomListGroup
      prepend-icon="assignment"
      :value="false"
    >
      <template v-slot:activator>
          <AtomListTileTitle class="subheader">Goals</AtomListTileTitle>
      </template>

      <AtomListTile
        v-for="goal in groupedYearGoals"
        :key="goal.id"
        :to="{ name: 'yearGoal', params: { id: goal.id }}"
      >
        <AtomListTileAction>
          <AtomIcon>calendar_today</AtomIcon>
        </AtomListTileAction>
        <AtomListTileContent>
          <AtomListTileTitle>
            {{ goal.title }}
            <span class="goal-count">({{ goal.count }}/{{ goal.total }})</span>
          </AtomListTileTitle>
        </AtomListTileContent>
      </AtomListTile>

      <!-- Show message when no goals exist -->
      <AtomListTile v-if="!yearGoals.length">
        <AtomListTileContent>
          <AtomListTileTitle class="no-goals-message">
            No Year goals created yet
          </AtomListTileTitle>
        </AtomListTileContent>
      </AtomListTile>

      <AtomListTile to="/goals">
          <AtomListTileAction>
            <AtomIcon>list</AtomIcon>
          </AtomListTileAction>
          <AtomListTileContent>
            <AtomListTileTitle>All Goals</AtomListTileTitle>
          </AtomListTileContent>
      </AtomListTile>
    </AtomListGroup>
  </AtomList>
</template>

<script>
import {
  AtomIcon,
  AtomList,
  AtomListGroup,
  AtomListTile,
  AtomListTileAction,
  AtomListTileContent,
  AtomListTileTitle,
} from '../../atoms';

export default {
  name: 'MoleculeYearGoalSidebar',
  components: {
    AtomIcon,
    AtomList,
    AtomListGroup,
    AtomListTile,
    AtomListTileAction,
    AtomListTileContent,
    AtomListTileTitle,
  },
  props: {
    yearGoals: {
      type: Array,
      default: () => [],
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

<style scoped>
>>> .v-list__group__header {
  min-height: 40px;
}
>>> .v-list__group__header .v-list__group__header__prepend-icon {
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
