<template>
  <v-radar
    :stats="stats || []"
    :polycolor="polycolor"
    :radar="radar"
    :scale="scale">
  </v-radar>
</template>

<script>
import Radar from 'vue-radar';

export default {
  components: {
    'v-radar': Radar,
  },
  props: ['size', 'stats'],
  data() {
    return {
      radar: {
        size: this.size || '300',
        structure: {
          external: {
            strokeColor: 'rgba(0, 0, 0, 0.5)',
            strokeWidth: '4',
          },
          internals: {
            strokeColor: 'rgba(0, 0, 0, 0)',
            strokeWidth: '0',
          },
          average: {
            strokeColor: 'rgba(0, 0, 0, 1)',
            strokeWidth: '0',
            fillColor: 'rgba(0, 0, 0, 0)',
          },
        },
      }, // empty object is mandatory
      scale: {
        stat1: 100,
        stat2: 100,
        stat3: 100,
      }, // empty object is mandatory
      polycolor: 'rgba(40, 139, 213, .8)', // any css format is usable (hexa, rgb, rgba...)
    };
  },
};
</script>
