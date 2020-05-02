<template>
  <v-container style="max-width: 480px">
    <v-layout text-xs-center wrap>
      <v-flex mb-5>
        <div v-if="loading" text-xs-center style="margin-top:100px;">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
        <div v-else>
          <v-list subheader style="width:100%" v-if="tasklist && tasklist.length > 0">
            <v-subheader>Today</v-subheader>
            <template v-for="(task, index) in tasklist">
              <v-divider v-if="index != 0" :key="index" :inset="task.inset"></v-divider>

              <v-list-tile :key="task.name" avatar>
                <v-list-tile-avatar>
                  <v-btn
                    fab
                    small
                    :disabled="getButtonDisabled(task)"
                    :color="getButtonColor(task)"
                    @click="checkClick($event, index)"
                  >
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
          <div v-if="tasklist.length === 0">
            <span>No items to display. Please go to settings and add routine items.</span>
          </div>
        </div>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import moment from "moment";
import gql from "graphql-tag";

export default {
  apollo: {
    tasklist: {
      query: gql`
        query getRoutineDate($date: String!) {
          routineDate(date: $date) {
            id
            date
            tasklist {
              id
              name
              time
              points
              ticked
              passed
              wait
            }
          }
        }
      `,
      update: function(data, errors) {
        this.loading = false;
        this.tasklist =
          data.routineDate && data.routineDate.date
            ? data.routineDate.tasklist
            : [];
        if (data.routineDate === null && !errors) {
          this.addNewDayRoutine();
          return this.tasklist;
        } else {
          this.did = data.routineDate.id;
          this.setPassedWait();
          return data.routineDate.tasklist;
        }
      },
      variables: function() {
        return {
          date: this.date,
        };
      },
      error: function(error) {
        this.loading = false;
        if(error.message === 'A valid authorization token is required') {
          this.$router.push("login");
        }
      }
    }
  },
  data() {
    return {
      lid: "gRoutine",
      loading: true,
      tasklist: [],
      did: "",
      date: moment().format("DD-MM-YYYY")
    };
  },
  methods: {
    addNewDayRoutine() {
      this.loading = true;
      this.$apollo.mutate({
        mutation: gql`
          mutation addRoutine($date: String!) {
            addRoutine(date: $date) {
              id
              date
              tasklist {
                id
                name
                time
                points
                ticked
                passed
                wait
              }
            }
          }
        `,
        variables: {
          date: this.date
        },
        update: (store, { data: { addRoutine } }) => {
          this.tasklist =
            addRoutine && addRoutine.date ? addRoutine.tasklist : [];
          this.did = addRoutine.id;
          this.setPassedWait();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    },
    getButtonColor(task) {
      if (task.ticked) {
        return "success";
      } else if (task.passed) {
        return "error";
      } else {
        return "";
      }
    },
    getButtonDisabled(task) {
      if (task.passed || task.wait) {
        return true;
      } else {
        return false;
      }
    },
    getButtonIcon(task) {
      if (task.ticked) {
        return "check";
      } else if (task.passed && !task.ticked) {
        return "close";
      } else if (!task.passed && !task.ticked && !task.wait) {
        return "alarm";
      } else {
        return "more_horiz";
      }
    },
    checkClick: function(e, i) {
      const taskId = i;
      const task = this.tasklist[taskId];
      if (!task.passed && !task.wait) {
        task.ticked = true;
        this.$apollo.mutate({
          mutation: gql`
            mutation tickRoutineItem(
              $id: ID!
              $name: String!
              $ticked: Boolean!
            ) {
              tickRoutineItem(id: $id, name: $name, ticked: $ticked) {
                id
                tasklist {
                  name
                  ticked
                }
              }
            }
          `,
          variables: {
            id: this.did,
            name: task.name,
            ticked: task.ticked
          }
        });
      }
    },
    passedTime: function(item) {
      if (!item.ticked) {
        var timestamp = moment(item.time, "HH:mm");
        var exp = timestamp.diff(moment());
        if (moment.duration(exp).asMinutes() < -30 && !item.passed) {
          item.passed = true;
          this.$apollo.mutate({
            mutation: gql`
              mutation passRoutineItem(
                $id: ID!
                $name: String!
                $passed: Boolean!
              ) {
                passRoutineItem(id: $id, name: $name, passed: $passed) {
                  id
                  tasklist {
                    name
                    ticked
                  }
                }
              }
            `,
            variables: {
              id: this.did,
              name: item.name,
              passed: item.passed
            },
            error: () => {
              item.passed = false;
            }
          });
        }
      }
    },
    waitTime: function(item) {
      if (!item.ticked) {
        var timestamp = moment(item.time, "HH:mm");
        var exp = timestamp.diff(moment());
        if (moment.duration(exp).asMinutes() < 60 && item.wait) {
          item.wait = false;
          this.$apollo.mutate({
            mutation: gql`
              mutation waitRoutineItem(
                $id: ID!
                $name: String!
                $wait: Boolean!
              ) {
                waitRoutineItem(id: $id, name: $name, wait: $wait) {
                  id
                  tasklist {
                    name
                    wait
                  }
                }
              }
            `,
            variables: {
              id: this.did,
              name: item.name,
              wait: item.wait
            },
            error: () => {
              item.wait = false;
            }
          });
        }
      }
    },
    setPassedWait: function() {
      Array.prototype.forEach.call(this.tasklist, task => {
        this.passedTime(task);
        this.waitTime(task);
      });
    },
    countTotal() {
      return this.tasklist.reduce((total, num) => {
        if (num.ticked) {
          return total + num.points;
        }
        return total;
      }, 0);
    },
  },
  mounted() {
    // this.setPassedWait();
    //   this.updateRoutine();
    // });
    //     setInterval(function () {
    //         // Invoke function every 10 minutes
    //         this.updateRoutine();
    //     }
  }
};
</script>

<style>
</style>
