import PointsChip from './PointsChip.vue';

export default {
  title: 'Molecules/PointsChip',
  component: PointsChip,
  argTypes: {
    available: { control: 'number' },
    pendingToday: { control: 'number' },
    entitled: { control: 'boolean' },
    loading: { control: 'boolean' },
    small: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PointsChip },
  template: '<PointsChip v-bind="$props" @click="onClick" />',
  methods: {
    onClick() {
      console.log('points chip clicked');
    },
  },
});

export const Default = Template.bind({});
Default.args = {
  available: 420,
  pendingToday: 0,
};

export const WithPendingToday = Template.bind({});
WithPendingToday.args = {
  available: 420,
  pendingToday: 180,
};

export const Empty = Template.bind({});
Empty.args = {
  available: 0,
  pendingToday: 35,
};

export const Subscribed = Template.bind({});
Subscribed.args = {
  available: 120,
  entitled: true,
};

export const Loading = Template.bind({});
Loading.args = {
  loading: true,
};
