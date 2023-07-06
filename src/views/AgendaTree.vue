<template>
  <div class="agenda">
    <AgendaTreeTime :selectedTaskRef="$route.params.selectedTaskRef"/>
  </div>
</template>

<script>
import AgendaTreeTime from '@/containers/AgendaTreeTime.vue';

export default {
  name: 'agendaTree',
  components: {
    AgendaTreeTime,
  },
};
</script>
