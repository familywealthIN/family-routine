<template>
  <v-container style="max-width: 480px">
    <v-layout text-xs-center wrap>
      <v-flex mb-5>
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
      routines: []
    };
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
