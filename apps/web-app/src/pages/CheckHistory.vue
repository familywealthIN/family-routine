<template>
    <container-box :isLoading="$apollo.queries.routines.loading">
      <atom-card class="image-card">
        <atom-card-title class="grey lighten-4">
          <atom-icon
            :color="'indigo'"
            class="mr-5"
            size="64"
            name="history"
          />
          <atom-layout column align-start>
            <div class="caption grey--text text-uppercase">
              Routine Efficiency
              <v-tooltip v-if="efficiency.description" bottom>
                <template #activator="{ on }">
                  <atom-icon size="14" v-on="on">info_outline</atom-icon>
                </template>
                <span>{{ efficiency.description }}</span>
              </v-tooltip>
            </div>
            <div>
              <span class="display-2 font-weight-black" v-text="efficiency.value || '—'"></span>
            </div>
          </atom-layout>

          <atom-spacer></atom-spacer>

          <atom-button icon class="align-self-start" size="28">
            <atom-icon>mdi-arrow-right-thick</atom-icon>
          </atom-button>
        </atom-card-title>

        <atom-sheet class="grey lighten-4 pb-4">
          <atom-sparkline
            :key="String(efficiency.value)"
            :smooth="16"
            :gradient="['#f72047', '#ffd200', '#1feaea']"
            :line-width="3"
            :value="graphArray || []"
            auto-draw
            stroke-linecap="round"
          ></atom-sparkline>
        </atom-sheet>

        <atom-card-text class="image-card-page">
          <user-history :routines="routines" />
        </atom-card-text>
      </atom-card>
    </container-box>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';

import UserHistory from '@routine-notes/ui/organisms/UserHistory/UserHistory.vue';
import ContainerBox from '@routine-notes/ui/templates/ContainerBox/ContainerBox.vue';
import {
  AtomButton,
  AtomCard,
  AtomCardText,
  AtomCardTitle,
  AtomIcon,
  AtomLayout,
  AtomSheet,
  AtomSpacer,
  AtomSparkline,
} from '@routine-notes/ui/atoms';

// The scope /progress opens on (Progress.vue defaults its period prop to
// 'week'). This screen asks getProgress for the same window so the two
// headline numbers are the same number, not two readings of one name.
const EFFICIENCY_PERIOD = 'week';

export default {
  components: {
    UserHistory,
    ContainerBox,
    AtomButton,
    AtomCard,
    AtomCardText,
    AtomCardTitle,
    AtomIcon,
    AtomLayout,
    AtomSheet,
    AtomSpacer,
    AtomSparkline,
  },
  apollo: {
    routines: {
      query: gql`
        query routines {
          routines {
            id
            date
            tasklist {
              name
              time
              points
              ticked
              passed
              stimuli {
                name
                earned
              }
            }
          }
        }
      `,
    },
    // Routine Efficiency is not worked out here. This screen used to average
    // every routine day ever recorded while /progress averaged only the days
    // that scored, so one account read 6% here and 15% there at the same
    // instant. The server owns the single definition now and both screens read
    // the card it returns.
    progress: {
      query: gql`
        query getProgress($period: String!, $startDate: String!, $endDate: String!) {
          getProgress(period: $period, startDate: $startDate, endDate: $endDate) {
            period
            cards {
              id
              value
              description
            }
          }
        }
      `,
      update(data) {
        return data.getProgress;
      },
      variables() {
        return {
          period: EFFICIENCY_PERIOD,
          startDate: moment().startOf(EFFICIENCY_PERIOD).format('DD-MM-YYYY'),
          endDate: moment().format('DD-MM-YYYY'),
        };
      },
    },
  },
  data() {
    return {
      routines: [],
      progress: null,
    };
  },
  computed: {
    efficiency() {
      const cards = (this.progress && this.progress.cards) || [];
      return cards.find((card) => card && card.id === 'efficiency') || {};
    },
    graphArray() {
      return this.routines.map((routine) => this.countTotal(routine.tasklist));
    },
  },
  methods: {
    countTotal(tasklist) {
      return tasklist.reduce((total, num) => {
        if (num.ticked) {
          return total + num.points;
        }
        return total;
      }, 0);
    },
  },
};
</script>

<style scoped>
</style>
