<template>
  <v-tooltip bottom :disabled="!tooltipText">
    <template #activator="{ on }">
      <atom-chip
        color="primary"
        text-color="white"
        :small="small"
        chip-class="points-chip"
        v-on="on"
        @click="$emit('click')"
      >
        <v-icon small left>diamond</v-icon>
        <span class="points-chip__value">{{ displayValue }}</span>
      </atom-chip>
    </template>
    <span>{{ tooltipText }}</span>
  </v-tooltip>
</template>

<script>
import AtomChip from '../../atoms/Chip/Chip.vue';

export default {
  name: 'PointsChip',
  components: { AtomChip },
  props: {
    available: {
      type: Number,
      default: 0,
    },
    pendingToday: {
      type: Number,
      default: 0,
    },
    entitled: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    small: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    displayValue() {
      if (this.loading) return '…';
      if (this.entitled) return '∞';
      return Math.round(this.available).toLocaleString();
    },
    tooltipText() {
      if (this.loading) return '';
      if (this.entitled) return 'Subscribed — unlimited redeems';
      const pending = Math.round(this.pendingToday);
      const base = `${Math.round(this.available).toLocaleString()} points available`;
      return pending > 0
        ? `${base} · ${pending.toLocaleString()} pending today`
        : base;
    },
  },
};
</script>

<style scoped>
.points-chip {
  cursor: pointer;
  font-weight: 600;
}

.points-chip__value {
  font-variant-numeric: tabular-nums;
}
</style>
