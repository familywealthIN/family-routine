<template>
  <div class="home">
    <RoutineTime/>
  </div>
</template>

<script>
// @ is an alias to /src
import RoutineTime from '@/components/RoutineTime.vue';

export default {
  name: 'home',
  components: {
    RoutineTime,
  },
};
</script>
