import CascadeLadder from './CascadeLadder.vue';

export default {
  title: 'Molecules/CascadeLadder',
  component: CascadeLadder,
  argTypes: {
    steps: { control: 'object' },
    rule: { control: 'text' },
    ruleIcon: { control: 'text' },
  },
};

const BLUE = '#288bd5';
const ORANGE = '#FF9800';
const GREEN = '#4CAF50';

const step = (key, label, num, value, color, active, threshold, pop = false) => ({
  key, label, num, value, color, active, threshold, pop,
});

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { CascadeLadder },
  template: '<div style="width:380px;background:#fff;border-radius:16px"><CascadeLadder v-bind="$props" @select="onSelect" /></div>',
  methods: {
    onSelect(key) {
      console.log('ladder step selected', key);
    },
  },
});

export const TodayActive = Template.bind({});
TodayActive.args = {
  steps: [
    step('day', 'Today', '3/5', 60, ORANGE, true, '×5'),
    step('week', 'Week', '1/3', 33, BLUE, false, '×3'),
    step('month', 'Month', '1/2', 50, BLUE, false, '×6'),
    step('year', 'Year', '41%', 41, BLUE, false, ''),
    step('lifetime', 'Life', '0/2', 0, BLUE, false, ''),
  ],
  rule: 'Day goals count toward this week’s goal for the same routine (5 days auto-tick it).',
  ruleIcon: 'today',
};

export const YearActive = Template.bind({});
YearActive.args = {
  steps: [
    step('day', 'Today', '3/5', 60, ORANGE, false, '×5'),
    step('week', 'Week', '1/3', 33, BLUE, false, '×3'),
    step('month', 'Month', '1/2', 50, BLUE, false, '×6'),
    step('year', 'Year', '41%', 41, BLUE, true, ''),
    step('lifetime', 'Life', '0/2', 0, BLUE, false, ''),
  ],
  rule: '2026. A year goal auto-ticks after 6 month goals. Tap one to open it.',
  ruleIcon: 'event_repeat',
};

export const EverythingDone = Template.bind({});
EverythingDone.args = {
  steps: [
    step('day', 'Today', '5/5', 100, GREEN, true, '×5'),
    step('week', 'Week', '3/3', 100, GREEN, false, '×3'),
    step('month', 'Month', '2/2', 100, GREEN, false, '×6'),
    step('year', 'Year', '100%', 100, GREEN, false, ''),
    step('lifetime', 'Life', '2/2', 100, GREEN, false, ''),
  ],
  rule: 'Day goals count toward this week’s goal for the same routine (5 days auto-tick it).',
  ruleIcon: 'today',
};

export const JustAutoTicked = Template.bind({});
JustAutoTicked.args = {
  steps: [
    step('day', 'Today', '5/5', 100, GREEN, true, '×5', true),
    step('week', 'Week', '2/3', 67, BLUE, false, '×3', true),
    step('month', 'Month', '1/2', 50, BLUE, false, '×6'),
    step('year', 'Year', '41%', 41, BLUE, false, ''),
    step('lifetime', 'Life', '0/2', 0, BLUE, false, ''),
  ],
  rule: 'Day goals count toward this week’s goal for the same routine (5 days auto-tick it).',
  ruleIcon: 'today',
};

export const LoadFailed = Template.bind({});
LoadFailed.args = {
  steps: [
    step('day', 'Today', '—', 0, ORANGE, true, '×5'),
    step('week', 'Week', '—', 0, BLUE, false, '×3'),
    step('month', 'Month', '—', 0, BLUE, false, '×6'),
    step('year', 'Year', '—', 0, BLUE, false, ''),
    step('lifetime', 'Life', '—', 0, BLUE, false, ''),
  ],
  rule: '',
  ruleIcon: '',
};
