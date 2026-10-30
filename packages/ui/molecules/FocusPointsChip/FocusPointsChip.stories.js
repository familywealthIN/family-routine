import FocusPointsChip from './FocusPointsChip.vue';

export default {
  title: 'Molecules/FocusPointsChip',
  component: FocusPointsChip,
  argTypes: {
    available: { control: 'number' },
    pendingToday: { control: 'number' },
    entitled: { control: 'boolean' },
    loading: { control: 'boolean' },
    error: { control: 'boolean' },
    size: { control: 'number' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { FocusPointsChip },
  template: '<div style="padding:8px"><FocusPointsChip v-bind="$props" /></div>',
});

export const Default = Template.bind({});
Default.args = { available: 1420, pendingToday: 0 };

export const WithPendingToday = Template.bind({});
WithPendingToday.args = { available: 1420, pendingToday: 180 };

export const Empty = Template.bind({});
Empty.args = { available: 0 };

export const Subscribed = Template.bind({});
Subscribed.args = { entitled: true };

export const Loading = Template.bind({});
Loading.args = { loading: true };

export const Unavailable = Template.bind({});
Unavailable.args = { error: true };

export const Large = Template.bind({});
Large.args = { available: 1420, size: 28 };
