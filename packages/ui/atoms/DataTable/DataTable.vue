<template>
  <v-data-table
    :headers="headers"
    :items="items"
    :hide-actions="hideActions"
    :loading="loading"
    :no-data-text="noDataText"
    :no-results-text="noResultsText"
    :pagination.sync="internalPagination"
    :rows-per-page-items="rowsPerPageItems"
    :search="search"
    :total-items="totalItems"
    :class="$attrs.class"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <template v-for="(_, slot) in $scopedSlots" v-slot:[slot]="scope">
      <slot :name="slot" v-bind="scope"></slot>
    </template>
  </v-data-table>
</template>

<script>
export default {
  name: 'AtomDataTable',
  inheritAttrs: false,
  props: {
    headers: { type: Array, default: () => [] },
    items: { type: Array, default: () => [] },
    hideActions: { type: Boolean, default: false },
    loading: { type: [Boolean, String], default: false },
    noDataText: { type: String, default: 'No data available' },
    noResultsText: { type: String, default: 'No matching records found' },
    pagination: { type: Object, default: () => ({}) },
    rowsPerPageItems: { type: Array, default: () => [5, 10, 25, { text: 'All', value: -1 }] },
    search: { type: String, default: undefined },
    totalItems: { type: Number, default: undefined },
  },
  computed: {
    internalPagination: {
      get() {
        return this.pagination;
      },
      set(val) {
        this.$emit('update:pagination', val);
      },
    },
  },
};
</script>
