<template>
  <v-container style="max-width: 480px">
    <v-layout
      
      text-xs-center
      wrap
    >
      <v-flex mb-5>
        <v-list subheader style="width:100%" v-if="tasklist.length">
          <v-subheader>Today</v-subheader>
          <template v-for="(task, index) in tasklist">

            <v-divider
              v-if="index != 0"
              :key="index"
              :inset="task.inset"
            ></v-divider>

            <v-list-tile
              :key="task.name"
              avatar
            >
              <v-list-tile-avatar>
                <v-btn fab small :disabled="getButtonDisabled(task)" :color="getButtonColor(task)" @click="checkClick($event, index)">
                  <v-icon>{{getButtonIcon(task)}}</v-icon>
                </v-btn>
              </v-list-tile-avatar>

              <v-list-tile-content>
                <v-list-tile-title v-html="task.name"></v-list-tile-title>
                <v-list-tile-sub-title v-html="task.time"></v-list-tile-sub-title>
              </v-list-tile-content>
            </v-list-tile>
          </template>
        </v-list>
        <div v-else text-xs-center style="margin-top:100px;">
           <v-progress-circular
              indeterminate
              color="primary"
            ></v-progress-circular>
        </div>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
  import moment from 'moment';
  import axios from 'axios';
  export default {
    data () {
      return {
        lid: 'gRoutine',
        tasklist: []
      }
    },
    methods:{
      getButtonColor(task) {
        if(task.ticked) {
          return 'success';
        } else if(task.passed) {
          return 'error';
        } else {
          return '';
        }
      },
      getButtonDisabled(task) {
        if(task.passed || task.wait ) {
          return true;
        } else {
          return false;
        }
      },
      getButtonIcon(task) {
        if(task.ticked) {
          return 'check';
        } else if(task.passed && !task.ticked) {
          return 'close';
        } else if(!task.passed && !task.ticked && !task.wait) {
          return 'alarm';
        } else {
          return 'more_horiz';
        }
      },
      checkClick: function (e, i) {
          var taskId = i
          if (!this.tasklist[taskId].passed && !this.tasklist[taskId].wait) {
              this.tasklist[taskId].ticked = true;
              this.updateRoutine();
          }
      },
      passedTime: function (item) {
          if (!item.ticked) {
              var timestamp = moment(item.time, 'HH:mm');
              var exp = timestamp.diff(moment());
              if (moment.duration(exp).asMinutes() < -30) {
                  item.passed = true;
              }
          }
      },
      waitTime: function (item) {
          if (!item.ticked) {
              var timestamp = moment(item.time, 'HH:mm');
              var exp = timestamp.diff(moment());
              if (moment.duration(exp).asMinutes() < 60) {
                  item.wait = false;
              } else {
                  item.wait = true;
              }
          }
      },
      updateRoutine: function () {
          var lastEntry = this.routineData.length - 1;
          this.routineData[lastEntry].tasklist = this.tasklist;
          this.setData();
      },
      initialRoutineSet: function () {
          return new Promise((resolve) => {
              this.getData()
                  .then((rData) => {
                      this.routineData = rData.data;
                      var lastEntry = this.routineData.length - 1;
                      if (!this.routineData.length) {
                          axios.get('/default.json')
                                  .then((rData) => {
                                      this.routineData.push({
                                          day: moment().format('DD-MM-YYYY'),
                                          tasklist: rData.data
                                      });
                                  })
                                  .then(() => this.setData())
                                  .then(() => resolve());
                          
                      } else {
                          if (typeof this.routineData[lastEntry].day !== 'undefined' && this.routineData[lastEntry].day !== moment().format('DD-MM-YYYY')) {
                              axios.get('/default.json')
                                  .then((rData) => {
                                      this.routineData.push({
                                          day: moment().format('DD-MM-YYYY'),
                                          tasklist: rData.data
                                      });
                                  })
                                  .then(() => this.setData())
                                  .then(() => resolve());
                          } else {
                              this.tasklist = this.routineData[lastEntry].tasklist;
                              resolve();
                          }
                      }
                  });
          });
      },
      getData: function () {
          return axios.get('/api.php?name=' + this.lid);
      },
      setData: function () {
          return axios.post('/api.php',
              new URLSearchParams({
                  name: this.lid,
                  rData: JSON.stringify(this.routineData)
              }));
      }
    },
    mounted() {
      this.initialRoutineSet()
        .then(() => {
            var lastEntry = this.routineData.length - 1;
            this.tasklist = this.routineData[lastEntry].tasklist;

            Array.prototype.forEach.call(this.tasklist, task => {
                this.passedTime(task);
                this.waitTime(task);
            });

            this.updateRoutine();
        });

    //     setInterval(function () {
    //         // Invoke function every 10 minutes
    //         this.updateRoutine();
    //     }
    }
  }
</script>

<style>

</style>
