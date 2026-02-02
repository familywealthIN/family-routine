<template>
  <v-row class="mb-4">
    <v-col cols="6">
      <v-select
        :value="selectedRoutine"
        @input="$emit('update:selectedRoutine', $event)"
        :items="routines"
        item-text="name"
        item-value="taskId"
        label="Routine Task"
        prepend-icon="schedule"
        filled
        :disabled="disabled"
      ></v-select>
    </v-col>
    <v-col cols="6">
      <v-select
        :value="selectedPeriod"
        @input="$emit('update:selectedPeriod', $event)"
        :items="periodOptions"
        label="Select Goal Period"
        prepend-icon="calendar_today"
        filled
        :disabled="!selectedRoutine || disabled"
      ></v-select>
    </v-col>
  </v-row>
</template>

<script>
export default {
  name: 'MoleculePlanConfigSelector',
  props: {
    routines: {
      type: Array,
      default: () => [],
    },
    selectedRoutine: {
      type: String,
      default: null,
    },
    selectedPeriod: {
      type: String,
      default: null,
    },
    periodOptions: {
      type: Array,
      default: () => [
        { text: 'Week Goals', value: 'week' },
        { text: 'Month Goals', value: 'month' },
        { text: 'Year Goals', value: 'year' },
      ],
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style scoped>
/* Component-specific styles if needed */
</style>
