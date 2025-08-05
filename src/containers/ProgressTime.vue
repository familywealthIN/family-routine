<template>
    <container-box transparent="true" :isLoading="isLoading" >
      <v-container fluid grid-list-lg>
        <v-layout row wrap class="mb-4">
          <v-flex d-flex xs7>
            <h1>{{ progress && progress.progressStatement }}</h1>
          </v-flex>
          <v-flex d-flex xs5>
            <div class="text-xs-right">
              <v-menu right offset-y>
                <template v-slot:activator="{ on }">
                  <v-btn small round color="primary" v-on="on" dark>{{ period }}</v-btn>
                </template>
                <v-list>
                  <v-list-tile
                    v-for="(item, index) in items"
                    :key="index"
                    @click="() => $router.push(`/progress/${item.title}`)"
                  >
                    <v-list-tile-title>{{ item.title }}</v-list-tile-title>
                  </v-list-tile>
                </v-list>
              </v-menu>
            </div>
          </v-flex>
        </v-layout>
         <v-sheet class="transparent">
            <v-sparkline
              :key="String(avg)"
              :smooth="16"
              :gradient="['#f72047', '#ffd200', '#1feaea']"
              :line-width="3"
              :value="graphArray || []"
              auto-draw
              stroke-linecap="round"
            ></v-sparkline>
          </v-sheet>
        <v-layout row wrap>
          <v-flex d-flex xs7>
            <radar-card
              :title="getCard('radar-chart').name"
              :details="getCard('radar-chart').values"
            ></radar-card>
          </v-flex>
          <v-flex d-flex xs5>
            <v-layout row wrap>
              <v-flex xs12 d-flex>
                <numeric-card :details="getCard('efficiency')" ></numeric-card>
              </v-flex>
              <v-flex xs12 d-flex>
                <numeric-card :details="getCard('on-track')"></numeric-card>
              </v-flex>
            </v-layout>
          </v-flex>
          <v-flex d-flex xs12>
            <tasks-completed-card :details="getCard('task-activities')"></tasks-completed-card>
          </v-flex>
          <v-flex d-flex xs6>
            <table-card :details="getCard('good')"></table-card>
          </v-flex>
          <v-flex d-flex xs6>
            <table-card :details="getCard('bad')"></table-card>
          </v-flex>
          <v-flex d-flex xs12>
            <v-card>
              <v-list>
                <v-list-tile
                  avatar
                  @click="$router.push('/history')"
                >
                  <v-list-tile-content>
                    <v-list-tile-title>
                      View your routine history
                    </v-list-tile-title>
                  </v-list-tile-content>

                  <v-list-tile-action>
                    <v-icon>chevron_right</v-icon>
                  </v-list-tile-action>
                </v-list-tile>
              </v-list>
            </v-card>
          </v-flex>
        </v-layout>
      </v-container>
    </container-box>
</template>
<script>
import moment from 'moment';
import gql from 'graphql-tag';

import ContainerBox from '../components/ContainerBox.vue';
import NumericCard from '../components/DashboardCards/NumericCard.vue';
import RadarCard from '../components/DashboardCards/RadarCard.vue';
import TableCard from '../components/DashboardCards/TableCard.vue';
import TasksCompletedCard from '../components/DashboardCards/TasksCompletedCard.vue';

export default {
  components: {
    ContainerBox,
    RadarCard,
    NumericCard,
    TasksCompletedCard,
    TableCard,
  },
  props: ['period'],
  apollo: {
    routineSevenDays: {
      query: gql`
        query routineSevenDays {
          routineSevenDays {
            id
            date
            tasklist {
              name
              time
              points
              ticked
              passed
            }
          }
        }
      `,
    },
    progress: {
      query: gql`
        query getProgress($period: String!, $startDate: String!, $endDate: String!) {
          getProgress(period: $period, startDate: $startDate, endDate: $endDate) {
            progressStatement
            period
            startDate
            endDate
            cards {
              id
              name
              value
              values {
                name
                value
                total
              }
            }
          }
        }
      `,
      update(data) {
        this.isLoading = false;
        return data.getProgress;
      },
      variables() {
        return {
          period: this.period,
          startDate: this.getStartOf(this.period),
          endDate: this.date,
        };
      },
    },
  },
  data() {
    return {
      isLoading: true,
      show: true,
      buttonLoading: false,
      date: moment().format('DD-MM-YYYY'),
      items: [
        { title: 'day' },
        { title: 'week' },
        { title: 'month' },
        { title: 'year' },
      ],
      graphArray: [],
      routineSevenDays: [],
    };
  },
  methods: {
    getCard(cardId) {
      if (!this.progress || !this.progress.cards) {
        return {
          id: cardId,
          name: 'Loading...',
          value: 0,
        };
      }

      const foundCard = this.progress.cards.find((card) => card && card.id === cardId);
      return foundCard || {
        id: cardId,
        name: 'No Data',
        value: 0,
      };
    },
    getStartOf(p) {
      return moment(this.date, 'DD-MM-YYYY').startOf(p).format('DD-MM-YYYY');
    },
    countTotal(tasklist) {
      return tasklist.reduce((total, num) => {
        if (num.ticked) {
          return total + num.points;
        }
        return total;
      }, 0);
    },
  },
  computed: {
    avg() {
      const sum = this.routineSevenDays.reduce(
        (acc, cur) => acc + this.countTotal(cur.tasklist), 0,
      );
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      this.graphArray = this.routineSevenDays.map((routine) => this.countTotal(routine.tasklist));
      const { length } = this.routineSevenDays;

      if (!sum && !length) return 0;

      return Math.ceil(sum / length);
    },
  },
};
</script>

<style scoped>
.v-list__tile__title {
  text-transform: capitalize;
}
</style>
