<template>
  <div>
    <AtomCard class="tableCard">
      <AtomCardTitle class="pb-0">
        <h3 class="headline full-width">{{ details.name || 'Title' }}</h3>
        <span class="grey--text">{{ details.value }}</span>
      </AtomCardTitle>
      <AtomDataTable
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
      </AtomDataTable>
    </AtomCard>
  </div>
</template>

<script>
import {
  AtomCard,
  AtomCardTitle,
  AtomDataTable,
} from '../../atoms';

export default {
  name: 'MoleculeTableCard',
  components: {
    AtomCard,
    AtomCardTitle,
    AtomDataTable,
  },
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

<style scoped>
.tableCard {
  border-radius: 12px;
  overflow: hidden;
}

.tableCard >>> .v-datatable,
.tableCard >>> .v-datatable__wrapper {
  border-radius: 0 0 12px 12px;
  overflow: hidden;
}

.tableCard >>> table {
  border-collapse: separate;
  border-spacing: 0;
}
</style>
