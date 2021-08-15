<template>
  <div class="history">
    <ProgressTime/>
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
