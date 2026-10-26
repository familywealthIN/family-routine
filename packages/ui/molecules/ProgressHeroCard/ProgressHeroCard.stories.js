import ProgressHeroCard from './ProgressHeroCard.vue';

export default {
  title: 'Molecules/ProgressHeroCard',
  component: ProgressHeroCard,
  argTypes: {
    statement: { control: 'text' },
    efficiency: { control: 'number' },
    formula: { control: 'text' },
    previous: { control: 'number' },
    previousLabel: { control: 'text' },
    series: { control: 'object' },
    seriesLabels: { control: 'object' },
    pointNames: { control: 'object' },
    selectedIndex: { control: 'number' },
    trendNote: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ProgressHeroCard },
  template: '<div style="max-width: 400px; padding: 16px; background: #fff; border-radius: 16px;"><ProgressHeroCard v-bind="$props" @select-point="onSelect" /></div>',
  methods: {
    onSelect(index) {
      console.log('select-point', index);
    },
  },
});

const FORMULA = "Routine points earned ÷ routine points available, across this week's days. Skipped days do not count.";

export const Up = Template.bind({});
Up.args = {
  statement: 'Great going! Your week is ahead of last week.',
  efficiency: 78,
  formula: FORMULA,
  previous: 71,
  previousLabel: 'last week',
  series: [62, 70, 55, 80, 74, 88, 91],
  seriesLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  pointNames: ['Mon 19', 'Tue 20', 'Wed 21', 'Thu 22', 'Fri 23', 'Sat 24', 'Sun 25'],
  selectedIndex: 6,
};

export const Down = Template.bind({});
Down.args = {
  statement: 'A slower week. Two routines slipped on Thursday.',
  efficiency: 54,
  formula: FORMULA,
  previous: 68,
  previousLabel: 'last week',
  series: [70, 64, 58, 30, 52, null, 60],
  seriesLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  pointNames: ['Mon 19', 'Tue 20', 'Wed 21', 'Thu 22', 'Fri 23', 'Sat 24', 'Sun 25'],
  selectedIndex: 3,
};

export const NoPreviousPeriod = Template.bind({});
NoPreviousPeriod.args = {
  statement: 'Your first week. Keep checking in.',
  efficiency: 63,
  formula: FORMULA,
  previousLabel: 'last week',
  series: [40, 55, 63],
  seriesLabels: ['Fri', 'Sat', 'Sun'],
  pointNames: ['Fri 23', 'Sat 24', 'Sun 25'],
};

export const NoData = Template.bind({});
NoData.args = {
  statement: 'Nothing to show yet.',
  efficiency: null,
  previousLabel: 'last week',
  series: [],
  trendNote: 'No trend yet. Check in on a routine to start one.',
};
