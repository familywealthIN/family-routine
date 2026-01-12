<template>
  <v-card class="ma-3">
    <div class="weekdays pt-2 pb-2">
      <div
        v-for="(weekDay, i) in weekDays"
        :key="weekDay.day"
        @click="handleDateSelect(i)"
        :class="`day ${weekDay.isActive ? 'active' : ''}`"
      >
        <div>{{ weekDay.day }}</div>
        <div>{{ weekDay.dayNumber }}</div>
      </div>
    </div>
  </v-card>
</template>

<script>
import moment from 'moment';

export default {
  name: 'OrganismWeekdaySelector',
  props: {
    selectedDate: {
      type: String,
      default: () => moment().format('DD-MM-YYYY'),
    },
  },
  data() {
    return {
      weekDays: [],
    };
  },
  watch: {
    selectedDate: {
      handler() {
        this.updateWeekdays();
      },
      immediate: true,
    },
  },
  methods: {
    buildWeekdays() {
      const weekDays = [];
      const dayShort = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const currentDate = moment(this.selectedDate, 'DD-MM-YYYY');
      const selectedWeekday = currentDate.weekday();

      const weekStart = currentDate.clone().startOf('week');

      dayShort.forEach((day, i) => {
        weekDays.push({
          dayNumber: moment(weekStart).add(i, 'days').format('DD'),
          isActive: selectedWeekday === i,
          day,
        });
      });

      return weekDays;
    },
    updateWeekdays() {
      this.weekDays = this.buildWeekdays();
    },
    handleDateSelect(index) {
      const currentDate = moment(this.selectedDate, 'DD-MM-YYYY');
      const weekStart = currentDate.clone().startOf('week');
      const newDate = moment(weekStart).add(index, 'days').format('DD-MM-YYYY');

      // Update local state
      this.weekDays = this.weekDays.map((weekDay, i) => ({
        ...weekDay,
        isActive: Number(index) === i,
      }));

      // Emit the new date to parent
      this.$emit('date-selected', newDate);
    },
  },
};
</script>

<style scoped>
.weekdays {
  width: 100%;
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  font-weight: 500;
}

.weekdays .day {
  padding: 16px;
  border-radius: 4px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.weekdays .day:hover {
  background-color: rgba(40, 139, 213, 0.1);
}

#mobileLayout .weekdays .day {
  border-radius: 16px;
}

.weekdays .day.active {
  background-color: #288bd5;
  color: #fff;
}
</style>
