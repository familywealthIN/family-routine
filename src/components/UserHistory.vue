<template>
  <div>
    <v-layout v-if="routines.length">
      <v-flex xs12>
        <v-layout wrap>
          <v-flex
            xs12
            class="mb-3"
          >
            <div class="text-xs-center"><h2 class="pt-3 pb-2 pl-2">{{ currentMonth }}</h2></div>
            <v-sheet height="250">
              <v-calendar
                ref="calendar"
                v-model="start"
                :type="type"
                :end="end"
                color="primary"
                @change="updateRange"
                @click:date="showTaskDialog"
              >
                <template v-slot:day="{ date }">
                  <template v-for="routine in routinesMap[date]">
                    <v-progress-circular
                      :key="routine.id"
                      rotate="-90"
                      :value="countTotal((routine && routine.tasklist) || [])"
                      color="primary"
                    ></v-progress-circular>
                  </template>
                </template>
              </v-calendar>
            </v-sheet>
          </v-flex>

          <v-flex
            xs4
            class="text-xs-left"
          >
            <v-btn outline color="primary" @click="$refs.calendar.prev()">
              <v-icon
                left
                dark
              >
                keyboard_arrow_left
              </v-icon>
              Prev
            </v-btn>
          </v-flex>
          <v-flex xs4></v-flex>
          <v-flex
            xs4
            class="text-xs-right"
          >
            <v-btn outline color="primary" @click="$refs.calendar.next()">
              Next
              <v-icon
                right
                dark
              >
                keyboard_arrow_right
              </v-icon>
            </v-btn>
          </v-flex>
        </v-layout>
      </v-flex>
    </v-layout>
    <div v-else class="text-xs-center pt-3 pb-3">
      We do not have history of routine, check back later.
    </div>
     <v-dialog v-model="taskDialog" fullscreen hide-overlay transition="dialog-bottom-transition">
      <v-card>
        <v-toolbar dark color="primary">
          <v-btn icon dark @click="taskDialog = false">
            <v-icon>close</v-icon>
          </v-btn>
          <v-toolbar-title>{{selectedTasklistTitle}}</v-toolbar-title>
          <v-spacer></v-spacer>
        </v-toolbar>
        <v-list subheader style="width:100%">
          <v-subheader>Routine</v-subheader>
          <v-list-tile
            v-for="task in selectedTasklist"
            :key="task.id"
          >
            <v-list-tile-action>
              <v-avatar size="24" :color="getButtonColor(task)">
                <v-icon color="white" size="16">{{getButtonIcon(task)}}</v-icon>
              </v-avatar>
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title>{{ task.name }}</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
        </v-list>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>

import moment from 'moment';

export default {
  props: ['routines'],
  data: () => ({
    taskDialog: false,
    type: 'month',
    start: moment().format('YYYY-MM-DD'),
    end: '2021-12-01',
    selectedTasklist: [],
    selectedTasklistTitle: '',
    currentMonth: moment().format('MMMM YYYY'),
  }),

  computed: {
    // convert the list of events into a map of lists keyed by date
    routinesMap() {
      const map = {};
      this.routines.forEach((routine) => {
        const date = this.formatCalendarDate(routine.date);
        (map[date] = map[date] || []).push(routine);
      });
      return map;
    },
  },
  methods: {
    updateRange({ start }) {
      this.currentMonth = moment(start.date, 'YYYY-MM-DD').format('MMMM YYYY');
    },
    formatCalendarDate(date) {
      return moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD');
    },
    countTotal(tasklist) {
      return tasklist.reduce((total, num) => {
        if (num.ticked) {
          return total + num.points;
        }
        return total;
      }, 0);
    },
    getButtonIcon(task) {
      if (task.ticked) {
        return 'check';
      } if (task.passed && !task.ticked) {
        return 'close';
      } if (!task.passed && !task.ticked && !task.wait) {
        return 'alarm';
      }
      return 'more_horiz';
    },
    getButtonColor(task) {
      if (task.ticked) {
        return 'success';
      } if ((task.passed && !task.ticked)) {
        return 'error';
      } if (!task.passed && !task.ticked && !task.wait) {
        return 'warning';
      }
      return 'grey';
    },
    showTaskDialog({ date }) {
      if (date in this.routinesMap) {
        const { tasklist, date: currentDate } = this.routinesMap[date][0];
        this.selectedTasklist = tasklist || [];
        this.selectedTasklistTitle = moment(currentDate, 'DD-MM-YYYY').format('DD MMMM YYYY');
        this.taskDialog = true;
      }
    },
  },
};
</script>

<style>
  .history .theme--light.v-calendar-weekly .v-calendar-weekly__day {
    border-right: 1px solid #fff;
    border-bottom: 1px solid #fff;
    color: #000;
  }
  .history .v-calendar-weekly__day-label {
    transform: translateX(calc(50% - 16px));
    left: 50%;
        margin-left: -16px;
    top: 3px;
    z-index: 5;
  }

  .history .v-calendar-weekly__day-label:hover {
    text-decoration: none;
  }

  .history .v-calendar-weekly__day-month {
    right: 0;
    top: 0px;
    font-size: 8px;
    line-height: 1;
  }

  .history .v-calendar-weekly__day .v-progress-circular {
    position: absolute;
    top: 3px;
    left: 50%;
    margin-left: -16px;
  }

  .history .v-outside .v-progress-circular {
    color: #ccc !important;
  }
</style>
