<template>
  <div class="areas">
    <AreasTime :tag="tag" />
  </div>
</template>

<script>
import AreasTime from '@/pages/AreasTime.vue';

export default {
  name: 'Areas',
  components: {
    AreasTime,
  },
  props: {
    tag: {
      type: String,
      required: true,
    },
  },
};
</script>
