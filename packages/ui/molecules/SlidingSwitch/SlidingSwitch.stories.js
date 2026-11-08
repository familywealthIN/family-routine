import SlidingSwitch from './SlidingSwitch.vue';

export default {
  title: 'Molecules/SlidingSwitch',
  component: SlidingSwitch,
  argTypes: {
    segments: { control: 'object' },
    value: { control: 'text' },
    variant: { control: { type: 'select', options: ['thumb', 'underline'] } },
    size: { control: { type: 'select', options: ['sm', 'xs'] } },
    height: { control: 'number' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { SlidingSwitch },
  data: () => ({ current: null }),
  created() { this.current = this.value; },
  template: '<div style="width:340px"><SlidingSwitch v-bind="$props" :value="current" @input="current = $event" /></div>',
});

export const Periods = Template.bind({});
Periods.args = {
  segments: ['Day', 'Week', 'Month', 'Year'],
  value: 'Week',
};

export const TwelveTwentyFour = Template.bind({});
TwelveTwentyFour.args = {
  segments: [{ key: '12', label: '12h' }, { key: '24', label: '24h' }],
  value: '24',
};

export const Compact = Template.bind({});
Compact.args = {
  segments: ['Day', 'Week', 'Month', 'Year', 'Lifetime'],
  value: 'Month',
  size: 'xs',
};

export const UnderlineWithIcons = Template.bind({});
UnderlineWithIcons.args = {
  segments: [
    { key: 'routines', label: 'Routines', icon: 'schedule' },
    { key: 'goals', label: 'Goals', icon: 'flag' },
    { key: 'agents', label: 'Agents', icon: 'smart_toy' },
  ],
  value: 'goals',
  variant: 'underline',
  height: 52,
};
