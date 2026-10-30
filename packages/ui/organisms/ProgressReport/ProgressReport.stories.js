import ProgressReport from './ProgressReport.vue';
import TimingReportCard from '../../molecules/TimingReportCard/TimingReportCard.vue';

export default {
  title: 'Organisms/ProgressReport',
  component: ProgressReport,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    shell: { control: { type: 'select' }, options: ['phone', 'tablet', 'desktop'] },
    period: { control: { type: 'select' }, options: ['day', 'week', 'month', 'year'] },
    loading: { control: 'boolean' },
    loadError: { control: 'boolean' },
    retrying: { control: 'boolean' },
    statement: { control: 'text' },
    efficiency: { control: 'number' },
    formula: { control: 'text' },
    previousEfficiency: { control: 'number' },
    previousLabel: { control: 'text' },
    series: { control: 'object' },
    seriesLabels: { control: 'object' },
    pointNames: { control: 'object' },
    selectedIndex: { control: 'number' },
    trendNote: { control: 'text' },
    balance: { control: 'object' },
    balanceHeading: { control: 'text' },
    completedHeading: { control: 'text' },
    completed: { control: 'object' },
    good: { control: 'object' },
    bad: { control: 'object' },
    rankEmptyText: { control: 'text' },
  },
};

const timingProps = {
  totals: {
    onTime: 24, late: 8, missed: 4, pending: 0,
  },
  rate: 67,
  period: 'week',
  buckets: [
    ['M', 'Mon 19', 4, 1, 1], ['T', 'Tue 20', 5, 1, 0], ['W', 'Wed 21', 3, 2, 1],
    ['T', 'Thu 22', 3, 1, 2], ['F', 'Fri 23', 5, 1, 0], ['S', 'Sat 24', 4, 2, 0],
  ].map(([label, title, onTime, late, missed], i) => ({
    key: String(i), label, title, onTime, late, missed, pending: 0, skip: false,
  })).concat([{
    key: '6', label: 'S', title: 'Sun 25', onTime: 0, late: 0, missed: 0, pending: 0, skip: true,
  }]),
  weekdays: [67, 83, 50, 50, 83, 67, null].map((rate, index) => ({
    index, label: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index], rate,
  })),
  routines: [
    {
      id: 'r4', name: 'Workout', time: '19:30', onTime: 2, late: 2, missed: 2, rate: 33,
    },
    {
      id: 'r2', name: 'Jogging', time: '07:15', onTime: 6, late: 0, missed: 0, rate: 100,
    },
  ],
};

// A scoped slot keeps the `wide` flag the organism passes on tablet / desktop.
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ProgressReport, TimingReportCard },
  data() {
    return { timingProps };
  },
  template: `
    <div style="padding: 12px;">
      <ProgressReport v-bind="$props" @change-period="onEvent('change-period', $event)" @select-point="onEvent('select-point', $event)" @open-routine="onEvent('open-routine', $event)" @open-history="onEvent('open-history')" @retry="onEvent('retry')">
        <template v-slot:timing="slotProps">
          <TimingReportCard v-bind="timingProps" :wide="!!(slotProps && slotProps.wide)" />
        </template>
      </ProgressReport>
    </div>`,
  methods: {
    onEvent(name, payload) {
      console.log(name, payload);
    },
  },
});

const FORMULA = "Routine points earned ÷ routine points available, across this week's days. Skipped days do not count.";

const report = {
  period: 'week',
  statement: 'Great going! Your week is ahead of last week.',
  efficiency: 78,
  formula: FORMULA,
  previousEfficiency: 71,
  previousLabel: 'last week',
  series: [62, 70, 55, 80, 74, 88, 91],
  seriesLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  pointNames: ['Mon 19', 'Tue 20', 'Wed 21', 'Thu 22', 'Fri 23', 'Sat 24', 'Sun 25'],
  selectedIndex: 6,
  balance: { D: 80, K: 46, G: 64 },
  balanceHeading: 'BALANCE · AVG PER DAY',
  completedHeading: 'COMPLETED · AVG PER DAY',
  completed: [
    {
      key: 'routine-items', label: 'Routine items', icon: 'history', value: 5, total: 7,
    },
    {
      key: 'tasks', label: 'Tasks', icon: 'task_alt', value: 3, total: 6,
    },
    {
      key: 'milestones', label: 'Milestones', icon: 'flag', value: 1, total: 4,
    },
  ],
  good: [
    {
      id: 'r1', name: 'Wake up · brush · invest', score: 96, time: '05:30', pattern: [1, 1, 1, 1, 1, 1, 0],
    },
    {
      id: 'r2', name: 'Jogging', score: 90, time: '07:15', pattern: [1, 1, 0, 1, 1, 1, 1],
    },
    {
      id: 'r3', name: 'Family time', score: 84, time: '21:00', pattern: [1, 0, 1, 1, 1, 0, 1],
    },
  ],
  bad: [
    {
      id: 'r4', name: 'Workout', score: 31, time: '19:30', why: 'Missed 4 of the last 7 days',
    },
    {
      id: 'r5', name: 'Deep Work', score: 44, time: '09:00', why: 'Usually checked in late',
    },
  ],
  rankEmptyText: 'No routines scored yet.',
};

export const Phone = Template.bind({});
Phone.args = { ...report, shell: 'phone' };

export const Desktop = Template.bind({});
Desktop.args = { ...report, shell: 'desktop' };

export const Tablet = Template.bind({});
Tablet.args = { ...report, shell: 'tablet' };

export const Loading = Template.bind({});
Loading.args = { shell: 'phone', period: 'month', loading: true };

export const LoadFailed = Template.bind({});
LoadFailed.args = { shell: 'phone', period: 'week', loadError: true };

export const NoDataYet = Template.bind({});
NoDataYet.args = {
  shell: 'phone',
  period: 'day',
  statement: 'Nothing to show yet.',
  efficiency: null,
  previousLabel: 'yesterday',
  trendNote: 'No trend yet. Check in on a routine to start one.',
  completedHeading: 'COMPLETED · TODAY',
  completed: [
    {
      key: 'routine-items', label: 'Routine items', icon: 'history', value: null, total: null,
    },
  ],
  rankEmptyText: 'No routines scored yet.',
};
