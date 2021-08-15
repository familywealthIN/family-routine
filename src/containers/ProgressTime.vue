<template>
    <container-box >
      <h2>Great Going!</h2>
      <v-container fluid grid-list-md>
        <v-layout row wrap>
          <v-flex d-flex xs7>
            <v-card color="purple" dark>
              <v-card-text><radar-chart /></v-card-text>
            </v-card>
          </v-flex>
          <v-flex d-flex xs5>
            <v-layout row wrap>
              <v-flex d-flex>
                <v-card color="indigo" dark>
                  <v-card-text>Some</v-card-text>
                </v-card>
              </v-flex>
              <v-flex d-flex>
                <v-card color="indigo" dark>
                  <v-card-text>Text</v-card-text>
                </v-card>
              </v-flex>
            </v-layout>
          </v-flex>
          <v-flex d-flex xs12>
            <v-card color="green lighten-2" dark>
              <v-card-text>{{ lorem.slice(0, 90) }}</v-card-text>
            </v-card>
          </v-flex>
          <v-flex d-flex xs12 sm6>
            <v-card color="blue lighten-2" dark>
              <v-card-text>{{ lorem.slice(0, 100) }}</v-card-text>
            </v-card>
          </v-flex>
          <v-flex d-flex xs12 sm6>
            <v-card color="blue lighten-2" dark>
              <v-card-text>{{ lorem.slice(0, 100) }}</v-card-text>
            </v-card>
          </v-flex>
          <v-flex d-flex xs12>
            <v-card color="green lighten-2" dark>
              <v-card-text>{{ lorem.slice(0, 90) }}</v-card-text>
            </v-card>
          </v-flex>
        </v-layout>
      </v-container>
    </container-box>
</template>
<script>
import ContainerBox from '../components/ContainerBox.vue';
import RadarChart from '../components/RadarChart.vue';

export default {
  components: {
    ContainerBox,
    RadarChart,
  },
  props: [],
  data() {
    return {
      lorem: 'Lorem ipsum dolor sit amet, mel at clita quando. Te sit oratio vituperatoribus, nam ad ipsum posidonium mediocritatem, explicari dissentiunt cu mea. Repudiare disputationi vim in, mollis iriure nec cu, alienum argumentum ius ad. Pri eu justo aeque torquatos.',
      show: true,
      buttonLoading: false,
      progressMetrics: {

      },
    };
  },
  methods: {
  },
};
</script>

<style lang="stylus" scoped>
</style>
