<template>
  <div class="agenda">
    <AgendaTime/>
  </div>
</template>

<script>
// @ is an alias to /src
import AgendaTime from '@/containers/AgendaTime.vue';

export default {
  name: 'agenda',
  components: {
    AgendaTime,
  },
};
</script>
