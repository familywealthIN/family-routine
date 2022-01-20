<template>
  <div class="progress">
    <ProgressTime :period="$route.params.period || 'week'" />
  </div>
</template>

<script>
// @ is an alias to /src
import ProgressTime from '@/containers/ProgressTime.vue';

export default {
  name: 'history',
  components: {
    ProgressTime,
  },
};
</script>
