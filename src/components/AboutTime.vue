<template>
  <v-container style="max-width: 480px">
    <v-layout wrap>
      <h1>About</h1>
      <p>This app tracks the daily activity and measures the puntuality efficiency in points</p>
      <v-data-table :headers="headers" :items="routine" class="elevation-1" hide-actions>
        <template v-slot:items="props">
          <td>{{ props.item.name }}</td>
          <td class="text-xs-right">{{ props.item.points }}</td>
        </template>
      </v-data-table>
    </v-layout>
  </v-container>
</template>

<script>
import axios from "axios";

export default {
  data() {
    return {
      headers: [
        {
          text: "Task",
          align: "left",
          sortable: false,
          value: "name"
        },
        {
          text: "Points",
          align: "right",
          value: "points",
          sortable: false
        }
      ],
      routine: []
    };
  },
  mounted() {
    axios.get("/default.json").then(rData => {
      this.routine = rData.data;
    });
  }
};
</script>

<style>
.elevation-1 {
  width: 100%;
}
</style>
