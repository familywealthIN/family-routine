<template>
  <div>
    <v-card class="tableCard">
      <v-card-title class="pb-0">
        <h3 class="headline full-width">{{ details.name || 'Title' }}</h3>
        <span class="grey--text">{{ details.value }}</span>
      </v-card-title>
      <v-data-table
        :headers="headers"
        :items="details.values"
        class="full-width progress-table"
        :pagination.sync="pagination"
        hide-actions
      >
        <template v-slot:items="props">
          <td>{{ props.item.name }}</td>
          <td class="text-xs-right">{{ props.item.value }}</td>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script>
export default {
  props: ['details'],
  data() {
    return {
      pagination: {
        sortBy: 'value',
        descending: true,
      },
      headers: [
        {
          text: 'Name',
          align: 'left',
          sortable: false,
          value: 'name',
        },
        {
          text: 'Score',
          value: 'value',
          align: 'right',
        },
      ],
    };
  },
};
</script>

<style>
  .full-width {
    width: 100%;
  }

  .progress-table table.v-table thead td:not(:nth-child(1)),
  .progress-table table.v-table tbody td:not(:nth-child(1)),
  .progress-table table.v-table thead th:not(:nth-child(1)),
  .progress-table table.v-table tbody th:not(:nth-child(1)),
  .progress-table table.v-table thead td:first-child,
  .progress-table table.v-table tbody td:first-child,
  .progress-table table.v-table thead th:first-child,
  .progress-table table.v-table tbody th:first-child {
    padding: 0 12px;
  }

  #mobileLayout .tableCard {
    padding-bottom: 16px;
  }
</style>
