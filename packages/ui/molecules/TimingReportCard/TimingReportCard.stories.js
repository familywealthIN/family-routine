import TimingReportCard from './TimingReportCard.vue';

export default {
  title: 'Molecules/TimingReportCard',
  component: TimingReportCard,
  argTypes: {
    totals: { control: 'object' },
    rate: { control: 'number' },
    buckets: { control: 'object' },
    weekdays: { control: 'object' },
    routines: { control: 'object' },
    period: { control: { type: 'select' }, options: ['day', 'week', 'month', 'year'] },
    loading: { control: 'boolean' },
    error: { control: 'boolean' },
    wide: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TimingReportCard },
  template: '<div :style="{ maxWidth: wide ? \'1000px\' : \'400px\', padding: \'16px\', background: \'#fff\', borderRadius: \'16px\' }"><TimingReportCard v-bind="$props" @open-routine="onOpen" /></div>',
  methods: {
    onOpen(id) {
      console.log('open-routine', id);
    },
  },
});

const bucket = (key, label, title, onTime, late, missed, pending = 0, skip = false) => ({
  key, label, title, onTime, late, missed, pending, skip,
});

const week = {
  totals: {
    onTime: 24, late: 8, missed: 4, pending: 0,
  },
  rate: 67,
  period: 'week',
  buckets: [
    bucket('1', 'M', 'Mon 19', 4, 1, 1),
    bucket('2', 'T', 'Tue 20', 5, 1, 0),
    bucket('3', 'W', 'Wed 21', 3, 2, 1),
    bucket('4', 'T', 'Thu 22', 3, 1, 2),
    bucket('5', 'F', 'Fri 23', 5, 1, 0),
    bucket('6', 'S', 'Sat 24', 4, 2, 0),
    bucket('7', 'S', 'Sun 25', 0, 0, 0, 0, true),
  ],
  weekdays: [
    { index: 0, label: 'Mon', rate: 67 },
    { index: 1, label: 'Tue', rate: 83 },
    { index: 2, label: 'Wed', rate: 50 },
    { index: 3, label: 'Thu', rate: 50 },
    { index: 4, label: 'Fri', rate: 83 },
    { index: 5, label: 'Sat', rate: 67 },
    { index: 6, label: 'Sun', rate: null },
  ],
  routines: [
    {
      id: 'r4', name: 'Workout', time: '19:30', onTime: 2, late: 2, missed: 2, rate: 33,
    },
    {
      id: 'r5', name: 'Deep Work', time: '09:00', onTime: 3, late: 3, missed: 0, rate: 50,
    },
    {
      id: 'r3', name: 'Start office work', time: '08:30', onTime: 5, late: 1, missed: 0, rate: 83,
    },
    {
      id: 'r2', name: 'Jogging', time: '07:15', onTime: 6, late: 0, missed: 0, rate: 100,
    },
    {
      id: 'r1', name: 'Wake up · brush · invest', time: '05:30', onTime: 6, late: 0, missed: 0, rate: 100,
    },
    {
      id: 'r6', name: 'Family time', time: '21:00', onTime: 2, late: 2, missed: 2, rate: 33,
    },
  ],
};

export const Week = Template.bind({});
Week.args = { ...week };

export const Wide = Template.bind({});
Wide.args = { ...week, wide: true };

export const Day = Template.bind({});
Day.args = {
  period: 'day',
  rate: 50,
  totals: {
    onTime: 2, late: 1, missed: 1, pending: 2,
  },
  buckets: [
    bucket('a', 'Wake', 'Wake up · brush · invest', 1, 0, 0),
    bucket('b', 'Jog', 'Jogging', 1, 0, 0),
    bucket('c', 'Office', 'Start office work', 0, 1, 0),
    bucket('d', 'Deep', 'Deep Work', 0, 0, 1),
    bucket('e', 'Work', 'Workout', 0, 0, 0, 1),
    bucket('f', 'Family', 'Family time', 0, 0, 0, 1),
  ],
  weekdays: [],
  routines: [],
};

export const Empty = Template.bind({});
Empty.args = {
  period: 'week',
  totals: {},
  rate: null,
  buckets: [],
  weekdays: [],
  routines: [],
};

export const Loading = Template.bind({});
Loading.args = { ...Empty.args, loading: true };

export const LoadError = Template.bind({});
LoadError.args = { ...Empty.args, error: true };
