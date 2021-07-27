<template>
  <div class="goals">
    <GoalsTime />
  </div>
</template>

<script>
import GoalsTime from '@/containers/GoalsTime.vue';

export default {
  name: 'Goals',
  components: {
    GoalsTime,
  },
};
</script>
