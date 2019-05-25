<template>
  <v-container style="max-width: 480px">
    <v-layout
      text-xs-center
      wrap
    >
      <v-flex mb-5>
        <v-list subheader style="width:100%" v-if="routineData.length">
          <v-subheader>History</v-subheader>
          <v-list-tile v-for="routine in routineData" :key="routine.day">
            
            <v-list-tile-content>
              <v-list-tile-title v-html="routine.day"></v-list-tile-title>
            </v-list-tile-content>

            <v-list-tile-action>
              <v-progress-circular
                rotate="-90"
                :value="countTotal(routine.tasklist)"
                color="primary"
              >{{countTotal(routine.tasklist)}}</v-progress-circular>
            </v-list-tile-action>
           <br>
          </v-list-tile>
        </v-list>
        <div v-else text-xs-center style="margin-top:100px;">
           <v-progress-circular
              :size="50"
              indeterminate
              color="primary"
            ></v-progress-circular>
        </div>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
  // import moment from 'moment';
  import axios from 'axios';
  export default {
    data () {
      return {
        lid: 'gRoutine',
        routineData: []
      }
    },
    methods:{
      countTotal(tasklist){
        return tasklist.reduce((total, num) => {
          if(num.ticked) {
            return total + num.points;
          }
          return total;
        }, 0);
      },
      initialRoutineSet: function () {
        return new Promise((resolve) => {
          this.getData()
            .then((rData) => {
              this.routineData = rData.data;
              resolve();
            });
        });
      },
      getData: function () {
          return axios.get('/api.php?name=' + this.lid);
      }
    },
    mounted() {
      this.initialRoutineSet();
    }
  }
</script>

<style>

</style>
