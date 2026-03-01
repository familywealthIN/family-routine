<template>
  <molecule-button-toggle
    :value="value"
    :options="periodOptions"
    :mandatory="mandatory"
    v-bind="$attrs"
    @input="$emit('input', $event)"
    v-on="$listeners"
  />
</template>

<script>
import MoleculeButtonToggle from '../../molecules/ButtonToggle/ButtonToggle.vue';

export default {
  name: 'OrganismPeriodToggle',
  components: {
    MoleculeButtonToggle,
  },
  inheritAttrs: false,
  props: {
    value: {
      type: String,
      default: 'day',
    },
    periods: {
      type: Array,
      default: () => ['day', 'week', 'month', 'year'],
    },
    labels: {
      type: Object,
      default: () => ({
        day: 'Today',
        week: 'Week',
        month: 'Month',
        year: 'Year',
        lifetime: 'Lifetime',
      }),
    },
    mandatory: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    periodOptions() {
      return this.periods.map((period) => ({
        text: this.labels[period] || period,
        value: period,
      }));
    },
  },
};
</script>
