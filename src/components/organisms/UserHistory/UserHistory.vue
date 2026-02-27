<template>
  <div>
    <AtomLayout v-if="routines.length">
      <AtomFlex xs12>
        <AtomLayout wrap>
          <AtomFlex
            xs12
            class="mb-3"
          >
            <div class="text-xs-center"><h2 class="pt-3 pb-2 pl-2">{{ currentMonth }}</h2></div>
            <AtomSheet height="250">
              <AtomCalendar
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
                    <AtomProgressCircular
                      :key="routine.id"
                      rotate="-90"
                      :value="countTotal((routine && routine.tasklist) || [])"
                      color="primary"
                    />
                  </template>
                </template>
              </AtomCalendar>
            </AtomSheet>
          </AtomFlex>

          <AtomFlex
            xs4
            class="text-xs-left"
          >
            <AtomButton outline color="primary" @click="$refs.calendar.prev()">
              <AtomIcon
                left
                dark
              >
                keyboard_arrow_left
              </AtomIcon>
              Prev
            </AtomButton>
          </AtomFlex>
          <AtomFlex xs4></AtomFlex>
          <AtomFlex
            xs4
            class="text-xs-right"
          >
            <AtomButton outline color="primary" @click="$refs.calendar.next()">
              Next
              <AtomIcon
                right
                dark
              >
                keyboard_arrow_right
              </AtomIcon>
            </AtomButton>
          </AtomFlex>
        </AtomLayout>
      </AtomFlex>
    </AtomLayout>
    <div v-else class="text-xs-center pt-3 pb-3">
      We do not have history of routine, check back later.
    </div>
    <AtomDialog v-model="taskDialog" fullscreen hide-overlay transition="dialog-bottom-transition">
      <AtomCard>
        <AtomToolbar dark color="primary">
          <AtomButton icon dark @click="taskDialog = false">
            <AtomIcon>close</AtomIcon>
          </AtomButton>
          <AtomToolbarTitle>{{selectedTasklistTitle}}</AtomToolbarTitle>
          <AtomSpacer />
        </AtomToolbar>
        <AtomList subheader style="width:100%">
          <AtomSubheader>Routine</AtomSubheader>
          <AtomListTile
            v-for="task in selectedTasklist"
            :key="task.id"
          >
            <AtomListTileAction>
              <AtomAvatar size="24" :color="getButtonColor(task)">
                <AtomIcon color="white" size="16">{{getButtonIcon(task)}}</AtomIcon>
              </AtomAvatar>
            </AtomListTileAction>
            <AtomListTileContent>
              <AtomListTileTitle>{{ task.name }}</AtomListTileTitle>
            </AtomListTileContent>
          </AtomListTile>
        </AtomList>
      </AtomCard>
    </AtomDialog>
  </div>
</template>

<script>

import moment from 'moment';
import {
  AtomAvatar,
  AtomButton,
  AtomCalendar,
  AtomCard,
  AtomDialog,
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomList,
  AtomListTile,
  AtomListTileAction,
  AtomListTileContent,
  AtomListTileTitle,
  AtomProgressCircular,
  AtomSheet,
  AtomSpacer,
  AtomSubheader,
  AtomToolbar,
  AtomToolbarTitle,
} from '@/components/atoms';

export default {
  name: 'OrganismUserHistory',

  components: {
    AtomAvatar,
    AtomButton,
    AtomCalendar,
    AtomCard,
    AtomDialog,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomList,
    AtomListTile,
    AtomListTileAction,
    AtomListTileContent,
    AtomListTileTitle,
    AtomProgressCircular,
    AtomSheet,
    AtomSpacer,
    AtomSubheader,
    AtomToolbar,
    AtomToolbarTitle,
  },

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
