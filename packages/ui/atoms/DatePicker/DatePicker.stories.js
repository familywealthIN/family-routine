import DatePicker from './DatePicker.vue';

export default {
  title: 'Atoms/DatePicker',
  component: DatePicker,
  argTypes: {
    value: { control: 'text' },
    noTitle: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    landscape: { control: 'boolean' },
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    firstDayOfWeek: { control: 'number' },
    min: { control: 'text' },
    max: { control: 'text' },
    events: { control: 'array' },
    pickerDate: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { DatePicker },
  template: '<DatePicker v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  value: '2026-10-25',
  pickerDate: '2026-10',
  firstDayOfWeek: 1,
};

export const WithoutTitle = Template.bind({});
WithoutTitle.args = {
  value: '2026-10-25',
  pickerDate: '2026-10',
  noTitle: true,
  firstDayOfWeek: 1,
};

export const WithGoalDates = Template.bind({});
WithGoalDates.args = {
  value: '2026-10-25',
  pickerDate: '2026-10',
  noTitle: true,
  firstDayOfWeek: 1,
  events: ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-25'],
};

export const Bounded = Template.bind({});
Bounded.args = {
  value: '2026-10-25',
  pickerDate: '2026-10',
  noTitle: true,
  firstDayOfWeek: 1,
  min: '2026-10-19',
  max: '2026-10-31',
};

export const Disabled = Template.bind({});
Disabled.args = {
  value: '2026-10-25',
  pickerDate: '2026-10',
  noTitle: true,
  disabled: true,
};
