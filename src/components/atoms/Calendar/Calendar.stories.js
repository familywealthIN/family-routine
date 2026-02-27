import AtomCalendar from './Calendar.vue';

export default {
  title: 'Atoms/Calendar',
  component: AtomCalendar,
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['month', 'week', 'day', '4day'],
    },
    color: { control: 'text' },
    dark: { control: 'boolean' },
    showMonthOnFirst: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AtomCalendar },
  data() {
    return {
      value: new Date().toISOString().substr(0, 10),
    };
  },
  template: '<atom-calendar v-model="value" v-bind="$props" />',
});

export const Month = Template.bind({});
Month.args = {
  type: 'month',
  color: 'primary',
};

export const Week = Template.bind({});
Week.args = {
  type: 'week',
  color: 'primary',
};

export const Day = Template.bind({});
Day.args = {
  type: 'day',
  color: 'primary',
};

export const WithDaySlot = () => ({
  components: { AtomCalendar },
  data() {
    return {
      value: new Date().toISOString().substr(0, 10),
      events: [
        { date: new Date().toISOString().substr(0, 10), count: 3 },
      ],
    };
  },
  computed: {
    eventsMap() {
      const map = {};
      this.events.forEach((e) => {
        map[e.date] = e;
      });
      return map;
    },
  },
  template: `
    <atom-calendar v-model="value" type="month" color="primary">
      <template v-slot:day="{ date }">
        <div v-if="eventsMap[date]" class="text-center">
          {{ eventsMap[date].count }} events
        </div>
      </template>
    </atom-calendar>
  `,
});
