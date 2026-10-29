import TasksCompletedCard from './TasksCompletedCard.vue';

// TasksCompletedCard takes one `details` object: a title and a ring per value.
export default {
  title: 'Atoms/TasksCompletedCard',
  component: TasksCompletedCard,
  argTypes: {
    details: { control: 'object' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TasksCompletedCard },
  template: '<TasksCompletedCard v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  details: {
    name: 'Tasks',
    values: [
      { name: 'Today', value: 8, total: 12 },
      { name: 'Week', value: 31, total: 48 },
      { name: 'Month', value: 102, total: 180 },
    ],
  },
};

export const AllCompleted = Template.bind({});
AllCompleted.args = {
  details: {
    name: 'Tasks',
    values: [
      { name: 'Today', value: 10, total: 10 },
      { name: 'Week', value: 42, total: 42 },
    ],
  },
};

export const NoneCompleted = Template.bind({});
NoneCompleted.args = {
  details: {
    name: 'Tasks',
    values: [
      { name: 'Today', value: 0, total: 15 },
    ],
  },
};
