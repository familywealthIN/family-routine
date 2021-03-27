<template>
    <container-box :isLoading="$apollo.queries.routines.loading">
      <v-card color="grey lighten-4">
        <v-card-title>
          <v-icon
            :color="'indigo'"
            class="mr-5"
            size="64"
          >history</v-icon>
          <v-layout column align-start>
            <div class="caption grey--text text-uppercase">Routine Efficiency</div>
            <div>
              <span class="display-2 font-weight-black" v-text="avg || '—'"></span>
              <strong v-if="avg">%</strong>
            </div>
          </v-layout>

          <v-spacer></v-spacer>

          <v-btn icon class="align-self-start" size="28">
            <v-icon>mdi-arrow-right-thick</v-icon>
          </v-btn>
        </v-card-title>

        <v-sheet color="transparent">
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
      </v-card>
      <user-history :routines="routines" />
    </container-box>
</template>

<script>
import gql from 'graphql-tag';

import redirectOnError from '../utils/redirectOnError';
import UserHistory from './UserHistory.vue';
import ContainerBox from './ContainerBox.vue';

export default {
  components: {
    UserHistory,
    ContainerBox,
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
            }
          }
        }
      `,
      error(error) {
        redirectOnError(this.$router, error);
      },
    },
  },
  data() {
    return {
      routines: [],
      graphArray: [],
    };
  },
  computed: {
    avg() {
      const sum = this.routines.reduce((acc, cur) => acc + this.countTotal(cur.tasklist), 0);
      // eslint-disable-next-line vue/no-side-effects-in-computed-properties
      this.graphArray = this.routines.map((routine) => this.countTotal(routine.tasklist));
      const { length } = this.routines;

      if (!sum && !length) return 0;

      return Math.ceil(sum / length);
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

<style>
</style>
