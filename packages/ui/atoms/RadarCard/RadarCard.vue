<template>
  <v-card id="radar-card">
    <v-card-title class="headline">
      {{ title || 'title' }}
      <v-tooltip v-if="description" bottom>
        <template #activator="{ on }">
          <v-icon small class="ml-2" v-on="on">info_outline</v-icon>
        </template>
        <span>{{ description }}</span>
      </v-tooltip>
    </v-card-title>
    <v-card-text class="pa-0 text-xs-center" v-if="show">
      <radar-chart :stats="details" :size="String(size)" />
    </v-card-text>
    <v-card-text class="pt-2">
      <div
        class="radar-legend-item"
        v-for="stat in details || []"
        :key="stat.name"
      >
        <span class="radar-legend-key">{{ stat.name }}</span>
        <span class="radar-legend-name">{{ stat.description || stat.name }}</span>
        <span>{{ stat.value }}</span>
      </div>
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
  // vue-radar can only label an axis with the first two characters of a stat
  // name, so the axes stay initials and the legend below spells them out.
  props: ['title', 'description', 'details'],
};
</script>

<style scoped>
  .radar-legend-item {
    display: flex;
    align-items: center;
    font-size: 13px;
  }
  .radar-legend-key {
    width: 20px;
    font-weight: 700;
  }
  .radar-legend-name {
    flex: 1;
    color: #777;
  }
</style>
