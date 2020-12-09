<script>
/* eslint-disable max-len */
</script>
<template>
    <v-layout row>
      <v-flex xs12 sm6 offset-sm3>
        <v-card>
          <v-card-text>
            <h2>Introduction</h2>
            <p>This app tracks the daily activity and measures
              the puntuality efficiency in points</p>
            <h2>Routine</h2>
            <p>Routine is designed to be followed on daily basis. Whenever a
            routine is closer to an hour, the routine item would be enabled
            to checked. this fundamentaly influences the user to perform the
            task as early as possible. The routine task would be disable after
            30 miutes if remained unchecked.</p>
            <h2>Goals</h2>
            <p>The app allows you to set goals as per day, week, month, year and
              lifetime. The goals can be converted to a milestone towards the
              one step above period (i.e. day's milestone for a week and week's
              milestone for a month), such that achievable small stepping goals
              can be designed. Furthermore, the goal can be associated with a
              routine to further build quantifiable analytics for your day time
              efficiency.</p>
          </v-card-text>
        </v-card>
      </v-flex>
    </v-layout>
</template>

<script>
import gql from 'graphql-tag';

export default {
  apollo: {
    routineItems: gql`
      query routineItems {
        routineItems {
          id
          name
          time
          points
          ticked
          passed
        }
      }
    `,
  },
  data() {
    return {};
  },
};
</script>

<style>
.elevation-1 {
  width: 100%;
}
</style>
