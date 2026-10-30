import ProfileRatesCard from './ProfileRatesCard.vue';

export default {
  title: 'Molecules/ProfileRatesCard',
  component: ProfileRatesCard,
  argTypes: {
    settings: { control: 'object' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ProfileRatesCard },
  template: '<div style="max-width: 412px"><ProfileRatesCard v-bind="$props" /></div>',
});

// The shipped PROFILE_SETTINGS.
export const Default = Template.bind({});
Default.args = {};

export const CustomRates = Template.bind({});
CustomRates.args = {
  settings: {
    startOfWeek: 'mon',
    routineDiscipline: 12,
    taskKinetics: 1,
    goalGeniuses: 40,
    autoCheckThreshold: { month: 4, week: 2, day: 4 },
    defaultTimezone: 'Europe/London',
    timeFormat: '24h',
  },
};
