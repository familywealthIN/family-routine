import ProgressLinear from './ProgressLinear.vue';

export default {
  title: 'Atoms/ProgressLinear',
  component: ProgressLinear,
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
    color: { control: 'color' },
    height: { control: 'number' },
    indeterminate: { control: 'boolean' },
    rounded: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ProgressLinear },
  template: '<div style="width:320px"><ProgressLinear v-bind="$props" /></div>',
});

export const Default = Template.bind({});
Default.args = { value: 40, color: '#288bd5', height: 6, rounded: true };

export const Empty = Template.bind({});
Empty.args = { value: 0, color: '#288bd5', height: 6, rounded: true };

export const Done = Template.bind({});
Done.args = { value: 100, color: '#4CAF50', height: 6, rounded: true };

export const Loading = Template.bind({});
Loading.args = { indeterminate: true, color: '#288bd5', height: 4 };
