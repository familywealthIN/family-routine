import MiniSparkline from './MiniSparkline.vue';

export default {
  title: 'Molecules/MiniSparkline',
  component: MiniSparkline,
  argTypes: {
    values: { control: 'object' },
    previous: { control: 'number' },
    labels: { control: 'object' },
    selectedIndex: { control: 'number' },
    color: { control: 'color' },
    areaFill: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { MiniSparkline },
  template: '<div style="max-width: 360px; padding: 16px; background: #fff;"><MiniSparkline v-bind="$props" @select="onSelect" /></div>',
  methods: {
    onSelect(index) {
      console.log('select', index);
    },
  },
});

export const Week = Template.bind({});
Week.args = {
  values: [62, 70, 55, 80, 74, 88, 91],
  previous: 66,
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};

export const WithGapAndSelection = Template.bind({});
WithGapAndSelection.args = {
  values: [60, 72, null, 80, 55, null, 90],
  previous: 70,
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  selectedIndex: 3,
};

export const SinglePoint = Template.bind({});
SinglePoint.args = {
  values: [72],
  labels: ['Today'],
};

export const Falling = Template.bind({});
Falling.args = {
  values: [90, 84, 77, 60, 52, 41],
  previous: 75,
  labels: ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  color: '#e53935',
  areaFill: 'rgba(229,57,53,.1)',
};
