<template>
  <v-container style="max-width: 480px">
    <v-layout text-xs-center wrap>
      <v-flex mb-5>
        <v-card class="mx-auto" color="grey lighten-4" max-width="600">
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
              :value="graphArray"
              auto-draw
              stroke-linecap="round"
            ></v-sparkline>
          </v-sheet>
        </v-card>
        <v-list subheader style="width:100%" v-if="routines.length">
          <v-subheader>History</v-subheader>
          <v-list-tile v-for="routine in routines" :key="routine.date">
            <v-list-tile-content>
              <v-list-tile-title v-html="routine.date"></v-list-tile-title>
            </v-list-tile-content>

            <v-list-tile-action>
              <v-progress-circular
                rotate="-90"
                :value="countTotal(routine.tasklist)"
                color="primary"
              >{{countTotal(routine.tasklist)}}</v-progress-circular>
            </v-list-tile-action>
            <br />
          </v-list-tile>
        </v-list>
        <div v-else text-xs-center style="margin-top:100px;">
          <v-progress-circular :size="50" indeterminate color="primary"></v-progress-circular>
        </div>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
// import moment from 'moment';
import gql from "graphql-tag";
export default {
  apollo: {
    routines: gql`
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
    `
  },
  data() {
    return {
      lid: "gRoutine",
      routines: [],
      graphArray: [],
    };
  },
  computed: {
    avg() {
      const sum = this.routines.reduce((acc, cur) => acc + this.countTotal(cur.tasklist), 0);
      this.graphArray = this.routines.map((routine) => this.countTotal(routine.tasklist));
      const length = this.routines.length;

      if (!sum && !length) return 0;

      return Math.ceil(sum / length);
    }
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
