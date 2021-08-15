<template>
  <v-radar
    :stats="stats"
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
  data() {
    return {
      radar: {
        size: '150',
      }, // empty object is mandatory
      scale: {}, // empty object is mandatory
      stats: [ // at least 3 stats are required here
        {
          name: 'G', // string
          value: 12, // int
        },
        {
          name: 'K',
          value: 77,
        },
        {
          name: 'D',
          value: 44,
        },
      ],
      polycolor: 'rgba(250, 100, 50, .5)', // any css format is usable (hexa, rgb, rgba...)
    };
  },
};
</script>
