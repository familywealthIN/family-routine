<template>
  <li>
    <template v-for="goalItem in goalItems">
      <details
        v-if="goalItem.milestones && goalItem.milestones.length"
        v-bind:key="goalItem.id"
        class="pl-2"
      >
        <summary><goal-item-milestone-tile :goalItem="goalItem" /></summary>
        <ul><goal-item-milestone-list :goalItems="goalItem.milestones" /></ul>
      </details>
      <div class="pl-4" v-else v-bind:key="goalItem.id">
        <goal-item-milestone-tile :goalItem="goalItem" />
      </div>
    </template>
  </li>
</template>
<script>
import GoalItemMilestoneTile from '../GoalItemMilestoneTile/GoalItemMilestoneTile.vue';

export default {
  name: 'goal-item-milestone-list',
  components: {
    GoalItemMilestoneTile,
  },
  props: ['goalItems'],
  data() {
    return {
      show: true,
      goalItem: [],
    };
  },
  methods: {
    getButtonIcon(isMilestone) {
      if (isMilestone) {
        return 'check';
      }
      return 'close';
    },
  },
};
</script>

<style>
  .completed {
    text-decoration: line-through;
  }
  .v-list__group__items--no-action .v-list__tile {
    padding-left: 16px;
  }

  ul {
    list-style: none;
    padding-left: 2px;
  }

  summary {
    padding: 8px 0;
    outline: none;
  }
</style>
