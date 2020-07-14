<template>
  <span>
    <span>
      <v-icon>{{getButtonIcon(goalItem.isComplete)}}</v-icon>
    </span>
    <span>
    <h4 style="display:inline" :class="{ completed: goalItem.isComplete}">
      {{goalItem.body}}
    </h4>
    </span>
  </span>
</template>
<script>
export default {
  props: ['goalItem'],
  data() {
    return {
      show: true,
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
</style>
