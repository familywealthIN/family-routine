import NewGoalSheet from './NewGoalSheet.vue';

// The Goals page's new-goal sheet: a phone bottom sheet, a centred dialog on
// tablet and desktop. Pick the level, type the goal, pick the routine.
export default {
  title: 'Organisms/NewGoalSheet',
  component: NewGoalSheet,
  argTypes: {
    open: { control: 'boolean' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    period: { control: { type: 'select', options: ['day', 'week', 'month', 'year', 'lifetime'] } },
    taskRef: { control: 'text' },
    routines: { control: 'object' },
    hint: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { NewGoalSheet },
  template: '<NewGoalSheet v-bind="$props" />',
});

const routines = [
  { id: 'mp', name: 'Morning Pages', time: '06:30' },
  { id: 'sw', name: 'Start Work', time: '09:00' },
  { id: 'dw', name: 'Deep Work', time: '10:00' },
  { id: 'jg', name: 'Jogging', time: '18:00' },
];

export const Phone = Template.bind({});
Phone.args = {
  open: true, shell: 'phone', period: 'day', taskRef: 'sw', routines, hint: 'For today · counts toward the week',
};

export const PhoneWeek = Template.bind({});
PhoneWeek.args = {
  open: true, shell: 'phone', period: 'week', taskRef: 'dw', routines, hint: 'For week 44 · counts toward October',
};

export const Desktop = Template.bind({});
Desktop.args = {
  open: true, shell: 'desktop', period: 'day', taskRef: 'sw', routines, hint: 'For today · counts toward the week',
};
