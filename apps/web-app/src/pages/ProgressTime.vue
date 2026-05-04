<template>
    <container-box transparent="true" :isLoading="isLoading" >
      <atom-container fluid grid-list-lg>
        <atom-layout row wrap class="mb-4">
          <atom-flex d-flex xs7>
            <h1>{{ progress && progress.progressStatement }}</h1>
          </atom-flex>
          <atom-flex d-flex xs5>
            <div class="text-xs-right">
              <atom-menu right offset-y>
                <template v-slot:activator="{ on }">
                  <atom-button small round color="primary" v-on="on" dark>{{ period }}</atom-button>
                </template>
                <atom-list>
                  <atom-list-tile
                    v-for="(item, index) in items"
                    :key="index"
                    @click="() => $router.push(`/progress/${item.title}`)"
                  >
                    <atom-list-tile-title>{{ item.title }}</atom-list-tile-title>
                  </atom-list-tile>
                </atom-list>
              </atom-menu>
            </div>
          </atom-flex>
        </atom-layout>
         <atom-sheet class="transparent">
            <atom-sparkline
              :key="String(avg)"
              :smooth="16"
              :gradient="['#f72047', '#ffd200', '#1feaea']"
              :line-width="3"
              :value="graphArray || []"
              auto-draw
              stroke-linecap="round"
            ></atom-sparkline>
          </atom-sheet>
        <atom-layout row wrap>
          <atom-flex d-flex xs7>
            <radar-card
              :title="getCard('radar-chart').name"
              :details="getCard('radar-chart').values"
            ></radar-card>
          </atom-flex>
          <atom-flex d-flex xs5>
            <atom-layout row wrap>
              <atom-flex xs12 d-flex>
                <numeric-card :details="getCard('efficiency')" ></numeric-card>
              </atom-flex>
              <atom-flex xs12 d-flex>
                <numeric-card :details="getCard('on-track')"></numeric-card>
              </atom-flex>
            </atom-layout>
          </atom-flex>
          <atom-flex d-flex xs12>
            <tasks-completed-card :details="getCard('task-activities')"></tasks-completed-card>
          </atom-flex>
          <atom-flex d-flex xs12 sm6>
            <table-card :details="getCard('good')"></table-card>
          </atom-flex>
          <atom-flex d-flex xs12 sm6>
            <table-card :details="getCard('bad')"></table-card>
          </atom-flex>
          <atom-flex d-flex xs12>
            <atom-card>
              <atom-list>
                <atom-list-tile
                  avatar
                  @click="$router.push('/history')"
                >
                  <atom-list-tile-content>
                    <atom-list-tile-title>
                      View your routine history
                    </atom-list-tile-title>
                  </atom-list-tile-content>

                  <atom-list-tile-action>
                    <atom-icon>chevron_right</atom-icon>
                  </atom-list-tile-action>
                </atom-list-tile>
              </atom-list>
            </atom-card>
          </atom-flex>
        </atom-layout>
      </atom-container>
    </container-box>
</template>
<script>
import moment from 'moment';
import gql from 'graphql-tag';

import ContainerBox from '@family-routine/ui/templates/ContainerBox/ContainerBox.vue';
import NumericCard from '@family-routine/ui/atoms/NumericCard/NumericCard.vue';
import RadarCard from '@family-routine/ui/atoms/RadarCard/RadarCard.vue';
import TableCard from '@family-routine/ui/molecules/TableCard/TableCard.vue';
import TasksCompletedCard from '@family-routine/ui/atoms/TasksCompletedCard/TasksCompletedCard.vue';
import {
  AtomButton,
  AtomCard,
  AtomContainer,
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomList,
  AtomListTile,
  AtomListTileAction,
  AtomListTileContent,
  AtomListTileTitle,
  AtomMenu,
  AtomSheet,
  AtomSparkline,
} from '@family-routine/ui/atoms';

export default {
  components: {
    ContainerBox,
    RadarCard,
    NumericCard,
    TasksCompletedCard,
    TableCard,
    AtomButton,
    AtomCard,
    AtomContainer,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomList,
    AtomListTile,
    AtomListTileAction,
    AtomListTileContent,
    AtomListTileTitle,
    AtomMenu,
    AtomSheet,
    AtomSparkline,
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
    capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
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
  watch: {
    period() {
      this.isLoading = true;
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
