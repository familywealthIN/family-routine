import DkgRingTrio from './DkgRingTrio.vue';

export default {
  title: 'Molecules/DkgRingTrio',
  component: DkgRingTrio,
  argTypes: {
    values: { control: 'object' },
    size: { control: 'number' },
    legend: { control: 'boolean' },
    heading: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { DkgRingTrio },
  template: '<div style="width:360px;background:#fff;padding:16px;border-radius:12px"><DkgRingTrio v-bind="$props" /></div>',
});

export const Default = Template.bind({});
Default.args = {
  values: { D: 92, K: 64, G: 48 },
  heading: 'BALANCE · AVG PER DAY',
};

export const Empty = Template.bind({});
Empty.args = {
  values: { D: 0, K: 0, G: 0 },
  heading: 'BALANCE · AVG PER DAY',
};

export const OverAchieved = Template.bind({});
OverAchieved.args = {
  values: { D: 100, K: 140, G: 100 },
  heading: 'BALANCE · THIS WEEK',
};

export const RingsOnly = Template.bind({});
RingsOnly.args = {
  values: { D: 80, K: 55, G: 30 },
  legend: false,
  size: 96,
};
