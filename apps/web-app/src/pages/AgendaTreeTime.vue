<template>
  <container-box :isLoading="isLoading">
    <pre style="display: none;">
      {{ JSON.stringify(monthTaskGoals, null, 2) }}
    </pre>
    <atom-layout pt-3>
      <atom-flex xs12 sm4 pl-3 pr-2 d-flex>
        <atom-select :items="months" label="Months" v-model="selectedMonth" item-text="label" item-value="value"
          outline></atom-select>
      </atom-flex>
      <atom-flex xs12 sm4 pl-2 pr-2 d-flex>
        <atom-select :items="tasklist" label="Task List" v-model="selectedTaskRef" item-text="name" item-value="id"
          outline></atom-select>
      </atom-flex>
      <atom-flex xs12 sm4 pl-2 pr-3 d-flex>
        <atom-select :items="monthGoals" v-model="monthGoalRef" label="Month Goal" item-text="name" item-value="id"
          outline></atom-select>
      </atom-flex>
    </atom-layout>
    <div class="wrapper">
      <ul class="parent">
        <li v-bind:key="String(goal.date + goal.name +goal.period)" class="long" v-for="goal in agendaTreeGoals">
          <span class="rounded-long" @click="newGoalItem(goal.date, goal.name, goal.period)">
            {{ formatDate(goal.date) }} {{ goal.name }}
          </span>
          <ul class="children first-child">
            <li
              v-bind:key="String(monthMilestone.date + monthMilestone.name + monthMilestone.period)"
              class="long"
              v-for="monthMilestone in goal.milestones"
            >
              <span class="rounded-long"
                @click="newGoalItem(monthMilestone.date, monthMilestone.name, monthMilestone.period)">
                {{ formatDate(monthMilestone.date) }} {{ monthMilestone.name }}
              </span>
              <ul class="children first-child top-child last-child">
                <li
                  v-bind:key="String(weekMilestone.date + weekMilestone.name + weekMilestone.period)"
                  class="long"
                  v-for="weekMilestone in monthMilestone.milestones"
                >
                  <span class="rounded-long"
                    @click="newGoalItem(weekMilestone.date, weekMilestone.name, weekMilestone.period)">
                    {{ formatDate(weekMilestone.date) }} {{ weekMilestone.name }}
                  </span>
                </li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    </div>
    <atom-dialog v-model="goalDetailsDialog" fullscreen hide-overlay transition="dialog-bottom-transition">
      <atom-card>
        <atom-toolbar dark color="primary">
          <atom-button icon dark @click="goalDetailsDialog = false">
            <atom-icon>close</atom-icon>
          </atom-button>
          <atom-toolbar-title>Add Goal</atom-toolbar-title>
          <atom-spacer></atom-spacer>
        </atom-toolbar>
        <goal-list :goals="monthTaskGoals" :date="correctDate(selectedDate)" :period="currentGoalPeriod"
          :selectedBody="selectedBody" :tasklist="tasklist" :selectedTaskRef="selectedTaskRef" :isDefaultMilestone="true"
          @toggle-goal-details-dialog="toggleGoalDetailsDialog" />
        <atom-alert :value="true" color="success" icon="ev_station" outline class="ml-3 mr-3">
          It's better to set Month and Weekly goals first to better guide daily milestones.
        </atom-alert>
      </atom-card>
    </atom-dialog>
  </container-box>
</template>

<script>
/* eslint-disable no-param-reassign */
import moment from 'moment';

import ContainerBox from '@routine-notes/ui/templates/ContainerBox/ContainerBox.vue';
import {
  AtomAlert,
  AtomButton,
  AtomCard,
  AtomDialog,
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomSelect,
  AtomSpacer,
  AtomToolbar,
  AtomToolbarTitle,
} from '@routine-notes/ui/atoms';
import GoalList from '../containers/GoalListContainer.vue';
import { stepupMilestonePeriodDate } from '../utils/getDates';

export default {
  components: {
    GoalList,
    ContainerBox,
    AtomAlert,
    AtomButton,
    AtomCard,
    AtomDialog,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomSelect,
    AtomSpacer,
    AtomToolbar,
    AtomToolbarTitle,
  },
  props: ['selectedTaskRef'],
  data() {
    return {
      isLoading: false,
      agendaTreeGoals: [],
      goalDetailsDialog: false,
      tasklist: [],
      monthGoals: [],
      monthTaskGoals: [],
      did: '',
      skipDay: false,
      currentGoalPeriod: 'day',
      selectedBody: '',
      date: moment().format('DD-MM-YYYY'),
      selectedDate: moment().format('DD-MM-YYYY'),
      selectedMonth: '',
      monthGoalRef: '',
      weekDays: this.buildWeekdays(),
      months: [
        { value: '0', label: 'January' },
        { value: '1', label: 'February' },
        { value: '2', label: 'March' },
        { value: '3', label: 'April' },
        { value: '4', label: 'May' },
        { value: '5', label: 'June' },
        { value: '6', label: 'July' },
        { value: '7', label: 'August' },
        { value: '8', label: 'September' },
        { value: '9', label: 'October' },
        { value: '10', label: 'November' },
        { value: '11', label: 'December' },
      ],
      month: '',
      year: '',
      periods: ['year', 'month', 'week', 'day'],
      isEditable: true,
    };
  },
  watch: {
    date(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.fetchRoutineData();
        const date = moment(this.date, 'DD-MM-YYYY');
        const todayDate = moment(new Date(), 'DD-MM-YYYY');
        this.isEditable = moment(date).isSameOrAfter(todayDate, 'day');
      }
    },
    selectedMonth(newVal, oldVal) {
      if (oldVal && newVal !== oldVal) {
        this.date = moment(Number(newVal) + 1, 'MM').format('DD-MM-YYYY');
      }
    },
    monthGoalRef(newVal, oldVal) {
      if (oldVal && newVal !== oldVal) {
        this.buildAgendaTreeGoals(this.monthTaskGoals);
      }
    },
    selectedTaskRef(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.fetchMonthTaskGoalsData();
      }
    },
  },
  mounted() {
    this.buildCleanAgendaTreeGoals();
    this.fetchRoutineData();
    this.fetchMonthTaskGoalsData();
  },
  methods: {
    /**
     * Fetch routine data using shared composable via plugin
     */
    async fetchRoutineData() {
      this.isLoading = true;
      try {
        const routineData = await this.$routine.fetchRoutine(this.date, {
          useCache: true,
          onNotFound: () => {
            // Routine will be auto-created by the composable
          },
        });

        if (routineData) {
          this.tasklist = routineData.tasklist || [];
          this.did = routineData.id || '';
          this.skipDay = !!routineData.skip;
        }
      } catch (error) {
        console.error('Error fetching routine:', error);
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occurred',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Fetch month task goals using shared composable via plugin
     */
    async fetchMonthTaskGoalsData() {
      if (!this.selectedTaskRef) return;

      this.isLoading = true;
      try {
        const goalsData = await this.$goals.fetchMonthTaskGoals(
          this.date,
          this.selectedTaskRef,
          { useCache: true },
        );

        this.monthTaskGoals = goalsData || [];
        this.buildAgendaTreeGoals(this.monthTaskGoals);
      } catch (error) {
        console.error('Error fetching month task goals:', error);
      } finally {
        this.isLoading = false;
      }
    },

    /**
     * Add new day routine using shared composable
     */
    async addNewDayRoutine() {
      this.isLoading = true;
      try {
        await this.$routine.addRoutine(this.date);
        await this.fetchRoutineData();
      } catch (error) {
        console.error('Error adding routine:', error);
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occurred',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      } finally {
        this.isLoading = false;
      }
    },
    buildCleanAgendaTreeGoals() {
      this.month = moment(this.date, 'DD-MM-YYYY').month();
      this.selectedMonth = String(this.month);
      this.year = moment(this.date, 'DD-MM-YYYY').year();
      const { monthWeekDays, threeFridays } = this.getDaysArray(this.year, this.month);
      const seperatedWeekDays = [];
      seperatedWeekDays.push(monthWeekDays.slice(0, 5));
      seperatedWeekDays.push(monthWeekDays.slice(5, 10));
      seperatedWeekDays.push(monthWeekDays.slice(10, 15));

      this.agendaTreeGoals = [];
      this.monthGoals = [];

      this.agendaTreeGoals[0] = {
        period: 'month',
        // name: moment(this.date, 'DD-MM-YYYY').format('MMMM'),
        name: '',
        date: `01-${this.month + 1}-${this.year}`,
        milestones: threeFridays.map((workWeek, i) => ({
          period: 'week',
          name: '',
          date: workWeek,
          milestones: seperatedWeekDays[i].map((seperatedWeekDay) => ({
            period: 'day',
            name: '',
            date: seperatedWeekDay,
          })),
        })),
      };
    },
    buildAgendaTreeGoals(monthTaskGoals) {
      this.buildCleanAgendaTreeGoals();
      if (monthTaskGoals && monthTaskGoals.length) {
        if (this.monthGoals && this.monthGoals.length === 0) {
          monthTaskGoals
            .forEach((monthTaskGoal) => {
              if (monthTaskGoal && monthTaskGoal.period === 'month') {
                monthTaskGoal.goalItems.forEach((goalItem) => {
                  this.monthGoals.push({
                    id: goalItem.id,
                    name: goalItem.body,
                  });
                });
              }
            });
        }

        const monthGoal = monthTaskGoals
          .find((monthTaskGoal) => monthTaskGoal && monthTaskGoal.period === 'month');
        const weekGoals = monthTaskGoals
          .filter((monthTaskGoal) => monthTaskGoal && monthTaskGoal.period === 'week');
        const dayGoals = monthTaskGoals
          .filter((monthTaskGoal) => monthTaskGoal && monthTaskGoal.period === 'day');

        if (monthGoal && monthGoal.goalItems && monthGoal.goalItems.length) {
          if (!this.monthGoalRef) {
            this.monthGoalRef = monthGoal.goalItems[0].id;
          }
          const monthGoalSelected = this.monthGoals.find((mG) => mG.id === this.monthGoalRef);
          this.agendaTreeGoals[0].name = `${this.agendaTreeGoals[0].name} ${monthGoalSelected ? monthGoalSelected.name : ''}`;
        }

        this.agendaTreeGoals[0].milestones = this.agendaTreeGoals[0].milestones.map((milestone) => {
          const milestoneWeek = weekGoals.find((weekGoal) => weekGoal.date === moment(milestone.date, 'DD-MM-YYYY').format('DD-MM-YYYY'));
          if (milestoneWeek && milestoneWeek.goalItems && milestoneWeek.goalItems.length) {
            const weekGoalSelected = milestoneWeek.goalItems.find((goalItem) => goalItem.goalRef === this.monthGoalRef);
            milestone.name = weekGoalSelected ? weekGoalSelected.body : milestone.name;

            milestone.milestones = milestone.milestones.map((dayMilestone) => {
              const milestoneDay = dayGoals.find((dayGoal) => dayGoal.date === moment(dayMilestone.date, 'DD-MM-YYYY').format('DD-MM-YYYY'));
              const hasMilestoneDayValues = milestoneDay && milestoneDay.goalItems && milestoneDay.goalItems.length;
              const hasWeekGoalSelectedId = weekGoalSelected && weekGoalSelected.id;
              if (hasMilestoneDayValues && hasWeekGoalSelectedId) {
                const dayGoalSelected = milestoneDay.goalItems.find((goalItem) => goalItem.goalRef === weekGoalSelected.id);
                dayMilestone.name = dayGoalSelected ? dayGoalSelected.body : dayMilestone.name;
              }
              return dayMilestone;
            });
          }
          return milestone;
        });
      }
    },
    buildWeekdays() {
      const weekDays = [];
      const dayShort = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const currentDate = moment();

      const weekStart = currentDate.clone().startOf('week');
      // const weekEnd = currentDate.clone().endOf('isoWeek');

      dayShort.forEach((day, i) => {
        weekDays.push({
          dayNumber: moment(weekStart)
            .add(i, 'days')
            .format('DD'),
          isActive: moment().weekday() === i,
          day,
        });
      });

      return weekDays;
    },
    deleteTaskGoal({ id, period, date }) {
      // Apollo cache optimistic update handles instant UI removal
      this.$goals.deleteGoalItem({
        id, period, date, dayDate: this.date,
      })
        .catch(() => {
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
        });
    },
    updateSelectedTaskRef(id) {
      this.selectedTaskRef = id;
    },
    disablePrevious() {
      return this.date === moment().format('DD-MM-YYYY');
    },
    formatDate(date) {
      return moment(date, 'DD-MM-YYYY')
        .format('DD/MM');
    },
    correctDate(date) {
      return moment(date, 'DD-MM-YYYY')
        .format('DD-MM-YYYY');
    },
    previousDate() {
      this.date = moment(this.date, 'DD-MM-YYYY')
        .subtract(1, 'days')
        .format('DD-MM-YYYY');
    },
    nextDate() {
      this.date = moment(this.date, 'DD-MM-YYYY')
        .add(1, 'days')
        .format('DD-MM-YYYY');
    },
    setDate(indx) {
      const currentDate = moment();
      const weekStart = currentDate.clone().startOf('week');

      this.weekDays = this.weekDays.map((weekDay, i) => {
        if (Number(indx) === i) {
          weekDay.isActive = true;
          return weekDay;
        }
        weekDay.isActive = false;
        return weekDay;
      });
      this.date = moment(weekStart)
        .add(indx, 'days')
        .format('DD-MM-YYYY');
    },
    getButtonColor(task) {
      if (task) {
        if (task.ticked) {
          return 'success';
        }
        if (task.passed) {
          return 'error';
        }
      }
      return 'grey';
    },
    getButtonIcon(task) {
      if (task) {
        if (task.ticked) {
          return 'check';
        }
        if (task.passed && !task.ticked) {
          return 'close';
        }
        if (!task.passed && !task.ticked && !task.wait) {
          return 'alarm';
        }
      }
      return 'more_horiz';
    },
    newGoalItem(date, name, period) {
      if (!name) {
        this.selectedDate = date;
        this.currentGoalPeriod = period;
        this.selectedBody = '';
        this.goalDetailsDialog = true;
      }
    },
    clonePeriodGoalItem(task, period) {
      const stepUpPeriod = stepupMilestonePeriodDate(period);
      const filteredPeriodGoals = this.filterTaskGoalsPeriod(task.id, stepUpPeriod.period);
      this.selectedBody = (filteredPeriodGoals
        && filteredPeriodGoals.length
        && filteredPeriodGoals[0].goalItems[0].body)
        || '';
      this.selectedTaskRef = task.id;
      this.currentGoalPeriod = period;
      this.goalDetailsDialog = true;
    },
    filterTaskGoalsPeriod(id, currentGoalPeriod) {
      const taskGoalList = [];
      if (this.goals && this.goals.length) {
        this.goals.forEach((goal) => {
          if (goal && goal.period === currentGoalPeriod) {
            const taskGoalItems = goal && goal.goalItems && goal
              .goalItems.filter((goalItem) => goalItem.taskRef === id);

            if (taskGoalItems && taskGoalItems.length) {
              const newGoal = {
                id: goal.id,
                period: goal.period,
                date: goal.date,
                goalItems: taskGoalItems,
              };
              taskGoalList.push(newGoal);
            }
          }
        });
      }
      return Array.isArray(taskGoalList) ? taskGoalList : [];
    },
    toggleGoalDetailsDialog(bool) {
      this.goalDetailsDialog = bool;
      // Refetch month task goals when dialog closes
      this.fetchMonthTaskGoalsData();
    },
    getDaysArray(year, month) {
      let firstMonday = '';
      const threeFridays = [];
      const monthIndex = month; // 0..11 instead of 1..12
      const names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const date = new Date(year, monthIndex, 1);
      const monthWeekDays = [];

      while (threeFridays.length <= 2) {
        if (!firstMonday && names[date.getDay()] === 'mon') {
          firstMonday = `${date.getDate()}-${month + 1}-${year}`;
        }

        if (firstMonday && !['sun', 'sat'].includes(names[date.getDay()])) {
          monthWeekDays.push(`${date.getDate()}-${month + 1}-${year}`);
        }

        if (firstMonday && names[date.getDay()] === 'fri' && threeFridays.length <= 2) {
          threeFridays.push(`${date.getDate()}-${month + 1}-${year}`);
        }
        date.setDate(date.getDate() + 1);
      }
      return { monthWeekDays, threeFridays };
    },
  },
  computed: {
    today() {
      return moment(this.date, 'DD-MM-YYYY').format('DD MMMM YYYY');
    },
  },
};
</script>

<style scoped>
.wrapper ul {
  margin: 0;
  padding: 0;
  list-style: none;
  position: relative;
}

.wrapper {
  max-width: 800px;
  width: 100%;
  height: 1000px;
  margin: 0 auto;
  padding: 10px;
  display: flex;
  align-items: center;
}

.wrapper li {
  width: 180px;
  position: relative;
}

.wrapper li.long {
  width: 260px;
}

.wrapper li::before {
  position: absolute;
  content: "";
  width: 180px;
  height: 2px;
  background-color: #333333;
  left: 50%;
  transform: translateX(-50%);
  top: 25px;
}

.wrapper li.long::before {
  position: absolute;
  content: "";
  width: 260px;
  height: 2px;
  background-color: #333333;
  left: 50%;
  transform: translateX(-50%);
  top: 25px;
}

.rounded {
  height: 50px;
  width: 100px;
  display: block;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 16px;
  position: relative;
  margin: 0 auto;
  font-size: 12px;
  line-height: 50px;
  cursor: pointer;
  padding: 0 8px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rounded-long {
  height: 50px;
  width: 200px;
  display: block;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 16px;
  position: relative;
  margin: 0 auto;
  font-size: 12px;
  line-height: 50px;
  cursor: pointer;
  padding: 0 8px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.children {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  left: 100%;
  height: 700px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.rounded.hide-childs+ul.children {
  visibility: hidden;
  opacity: 0;
}

.children.first-child.top-child {
  height: 305px;
}

.children.first-child.bottom-child {
  height: 380px;
}

.children::before {
  position: absolute;
  content: "";
  left: 0;
  width: 2px;
  background-color: #333333;
  top: 25px;
  bottom: 25px;
}

.wrapper .last-child li::before,
.wrapper li.hide-node::before {
  width: 50px;
  left: 0;
  transform: translateX(0);
}

.hide-node::after {
  position: absolute;
  content: "+";
  font-size: 12px;
  top: -14px;
  left: 0;
  right: 0;
}

.last-child .hide-node::after {
  content: "";
}

.rounded:active {
  transform: scale(0.9);
}

.add-new >>> .v-btn {
  margin-left: -15px;
  padding-left: 0;
  text-align: left;
}

.date-navigation {
  padding: 32px 32px 0 32px;
}

.date-navigation .date-today {
  height: 40px;
  padding-top: 10px;
  font-weight: bold;
}

.weekdays {
  width: 100%;
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  font-weight: 500;
}

.weekdays .day {
  padding: 16px;
  border-radius: 16px;
  text-align: center;
}

.weekdays .day.active {
  background-color: #288bd5;
  color: #fff;
}

.overlay-icon {
  position: absolute;
  font-size: 14px;
  padding: 2px 0 0 3px;
}
</style>
