import PeriodToggle from './PeriodToggle.vue';

export default {
  title: 'Organisms/PeriodToggle',
  component: PeriodToggle,
  argTypes: {
    mandatory: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PeriodToggle },
  data() {
    return { selected: 'day' };
  },
  template: `
    <div>
      <PeriodToggle v-model="selected" v-bind="$props" />
      <p style="margin-top: 16px;">Selected: {{ selected }}</p>
    </div>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const WithMandatory = Template.bind({});
WithMandatory.args = {
  mandatory: true,
};

export const CustomPeriods = Template.bind({});
CustomPeriods.args = {
  periods: ['day', 'week', 'month'],
};

export const CustomLabels = Template.bind({});
CustomLabels.args = {
  labels: {
    day: 'Daily',
    week: 'Weekly',
    month: 'Monthly',
    year: 'Yearly',
  },
};

export const AllPeriods = Template.bind({});
AllPeriods.args = {
  periods: ['day', 'week', 'month', 'year', 'lifetime'],
};
