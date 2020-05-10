<template>
  <v-container style="max-width: 480px">
    <v-layout wrap>
      <v-card>
        <v-card-text>
          <p>This app tracks the daily activity and measures the puntuality efficiency in points</p>
        </v-card-text>
      </v-card>
    </v-layout>
  </v-container>
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
