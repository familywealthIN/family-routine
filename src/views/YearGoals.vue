<template>
  <div class="year-goals">
    <YearGoalsTime :tag="tag" />
  </div>
</template>

<script>
import YearGoalsTime from '@/pages/YearGoalsTime.vue';

export default {
  name: 'YearGoals',
  components: {
    YearGoalsTime,
  },
  props: {
    tag: {
      type: String,
      default: '',
    },
  },
};
</script>
