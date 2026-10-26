import TimingRibbon from './TimingRibbon.vue';

export default {
  title: 'Molecules/TimingRibbon',
  component: TimingRibbon,
  argTypes: {
    slots: { control: 'object' },
    counts: { control: 'object' },
    nextIndex: { control: 'number' },
    skip: { control: 'boolean' },
    rate: { control: 'number' },
    delta: { control: 'number' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TimingRibbon },
  template: '<div style="max-width: 380px; padding: 16px; background: #fff; border-radius: 16px;"><TimingRibbon v-bind="$props" /></div>',
});

const slots = [
  {
    id: 'a', name: 'Wake up · brush · invest', time: '05:30', state: 'onTime',
  },
  {
    id: 'b', name: 'Jogging', time: '07:15', state: 'onTime',
  },
  {
    id: 'c', name: 'Start office work', time: '08:30', state: 'late',
  },
  {
    id: 'd', name: 'Deep Work', time: '09:00', state: 'missed',
  },
  {
    id: 'e', name: 'Workout', time: '19:30', state: 'pending',
  },
  {
    id: 'f', name: 'Family time', time: '21:00', state: 'pending',
  },
];

export const Default = Template.bind({});
Default.args = {
  slots,
  counts: {
    onTime: 2, late: 1, missed: 1, pending: 2,
  },
  nextIndex: 4,
  rate: 74,
  delta: 6,
};

export const Slipping = Template.bind({});
Slipping.args = {
  slots,
  counts: {
    onTime: 2, late: 1, missed: 1, pending: 2,
  },
  nextIndex: 4,
  rate: 58,
  delta: -9,
};

export const RestDay = Template.bind({});
RestDay.args = {
  slots: [],
  counts: {},
  skip: true,
  rate: 74,
  delta: 0,
};

export const NoRoutines = Template.bind({});
NoRoutines.args = {
  slots: [],
  counts: {},
};
