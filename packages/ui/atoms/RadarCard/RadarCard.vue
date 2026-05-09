<template>
  <v-card id="radar-card">
    <v-card-title class="headline">{{ title || 'title' }}</v-card-title>
    <v-card-text class="pa-0 text-xs-center" v-if="show">
      <radar-chart :stats="details" :size="String(size)" />
    </v-card-text>
  </v-card>
</template>

<script>
import RadarChart from '../../molecules/RadarChart/RadarChart.vue';

export default {
  components: {
    RadarChart,
  },
  data() {
    return {
      show: false,
    };
  },
  mounted() {
    const elmnt = document.getElementById('radar-card');
    if (elmnt && elmnt.offsetWidth) {
      this.show = true;
    }
  },
  computed: {
    size() {
      let size = '150';
      const elmnt = document.getElementById('radar-card');
      if (elmnt && elmnt.offsetWidth) {
        size = elmnt.offsetWidth * 0.85;
        return String(size);
      }
      return size;
    },
  },
  props: ['title', 'details'],
};
</script>
