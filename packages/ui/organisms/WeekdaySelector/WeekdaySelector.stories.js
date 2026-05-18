import moment from 'moment';
import WeekdaySelector from './WeekdaySelector.vue';

export default {
  title: 'Organisms/WeekdaySelector',
  component: WeekdaySelector,
  parameters: {
    layout: 'padded',
  },
};

/**
 * Default story - current week with today selected
 */
export const Default = () => ({
  components: { WeekdaySelector },
  template: `
    <div>
      <weekday-selector @date-selected="handleDateSelected" />
      <p style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
        Selected: {{ selectedDate || 'None' }}
      </p>
    </div>
  `,
  data() {
    return {
      selectedDate: null,
    };
  },
  methods: {
    handleDateSelected(date) {
      this.selectedDate = date;
      console.log('Date selected:', date);
    },
  },
});

/**
 * With specific date selected
 */
export const WithSelectedDate = () => ({
  components: { WeekdaySelector },
  template: `
    <div>
      <weekday-selector 
        :selectedDate="selectedDate"
        @date-selected="handleDateSelected" 
      />
      <p style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
        Selected: {{ selectedDate }}
      </p>
    </div>
  `,
  data() {
    return {
      selectedDate: moment().add(2, 'days').format('DD-MM-YYYY'),
    };
  },
  methods: {
    handleDateSelected(date) {
      this.selectedDate = date;
      console.log('Date selected:', date);
    },
  },
});

/**
 * Previous week selected
 */
export const PreviousWeek = () => ({
  components: { WeekdaySelector },
  template: `
    <div>
      <weekday-selector 
        :selectedDate="selectedDate"
        @date-selected="handleDateSelected" 
      />
      <p style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
        Selected: {{ selectedDate }}
      </p>
      <button 
        @click="goToPreviousWeek" 
        style="margin-top: 12px; padding: 8px 16px; cursor: pointer;"
      >
        Previous Week
      </button>
      <button 
        @click="goToNextWeek" 
        style="margin-left: 8px; padding: 8px 16px; cursor: pointer;"
      >
        Next Week
      </button>
      <button 
        @click="goToToday" 
        style="margin-left: 8px; padding: 8px 16px; cursor: pointer;"
      >
        Today
      </button>
    </div>
  `,
  data() {
    return {
      selectedDate: moment().subtract(7, 'days').format('DD-MM-YYYY'),
    };
  },
  methods: {
    handleDateSelected(date) {
      this.selectedDate = date;
      console.log('Date selected:', date);
    },
    goToPreviousWeek() {
      this.selectedDate = moment(this.selectedDate, 'DD-MM-YYYY')
        .subtract(7, 'days')
        .format('DD-MM-YYYY');
    },
    goToNextWeek() {
      this.selectedDate = moment(this.selectedDate, 'DD-MM-YYYY')
        .add(7, 'days')
        .format('DD-MM-YYYY');
    },
    goToToday() {
      this.selectedDate = moment().format('DD-MM-YYYY');
    },
  },
});

/**
 * Interactive example - simulate real usage
 */
export const Interactive = () => ({
  components: { WeekdaySelector },
  template: `
    <div style="max-width: 600px; margin: 0 auto;">
      <h3 style="margin-bottom: 16px;">Select a Day</h3>
      <weekday-selector 
        :selectedDate="selectedDate"
        @date-selected="handleDateSelected" 
      />
      
      <div style="margin-top: 24px; padding: 16px; background: #f5f5f5; border-radius: 4px;">
        <h4 style="margin-top: 0;">Selected Date Info</h4>
        <p><strong>Date:</strong> {{ selectedDate }}</p>
        <p><strong>Day of Week:</strong> {{ dayOfWeek }}</p>
        <p><strong>Is Today:</strong> {{ isToday ? 'Yes' : 'No' }}</p>
      </div>

      <div style="margin-top: 16px; display: flex; gap: 8px;">
        <button 
          @click="goToPreviousDay" 
          style="padding: 8px 16px; cursor: pointer; flex: 1;"
        >
          ← Previous Day
        </button>
        <button 
          @click="goToToday" 
          style="padding: 8px 16px; cursor: pointer; flex: 1;"
        >
          Today
        </button>
        <button 
          @click="goToNextDay" 
          style="padding: 8px 16px; cursor: pointer; flex: 1;"
        >
          Next Day →
        </button>
      </div>
    </div>
  `,
  data() {
    return {
      selectedDate: moment().format('DD-MM-YYYY'),
    };
  },
  computed: {
    dayOfWeek() {
      return moment(this.selectedDate, 'DD-MM-YYYY').format('dddd');
    },
    isToday() {
      return this.selectedDate === moment().format('DD-MM-YYYY');
    },
  },
  methods: {
    handleDateSelected(date) {
      this.selectedDate = date;
      console.log('Date selected:', date);
    },
    goToPreviousDay() {
      this.selectedDate = moment(this.selectedDate, 'DD-MM-YYYY')
        .subtract(1, 'day')
        .format('DD-MM-YYYY');
    },
    goToNextDay() {
      this.selectedDate = moment(this.selectedDate, 'DD-MM-YYYY')
        .add(1, 'day')
        .format('DD-MM-YYYY');
    },
    goToToday() {
      this.selectedDate = moment().format('DD-MM-YYYY');
    },
  },
});

/**
 * Mobile layout example
 */
export const MobileLayout = () => ({
  components: { WeekdaySelector },
  template: `
    <div style="max-width: 375px; margin: 0 auto; border: 1px solid #ccc; border-radius: 8px; overflow: hidden;">
      <div style="background: #1976d2; color: white; padding: 16px;">
        <h3 style="margin: 0;">My Dashboard</h3>
      </div>
      <weekday-selector 
        :selectedDate="selectedDate"
        @date-selected="handleDateSelected" 
      />
      <div style="padding: 16px;">
        <p style="margin: 0; color: #666;">Selected: {{ selectedDate }}</p>
      </div>
    </div>
  `,
  data() {
    return {
      selectedDate: moment().format('DD-MM-YYYY'),
    };
  },
  methods: {
    handleDateSelected(date) {
      this.selectedDate = date;
      console.log('Date selected:', date);
    },
  },
});
