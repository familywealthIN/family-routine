<template>
  <div class="history">
    <CheckHistory/>
  </div>
</template>

<script>
// @ is an alias to /src
import CheckHistory from '@/containers/CheckHistory.vue';

export default {
  name: 'history',
  components: {
    CheckHistory,
  },
};
</script>
