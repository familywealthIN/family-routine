// atoms/TaskStatusTag/TaskStatusTag.stories.js
import TaskStatusTag from './TaskStatusTag.vue';

export default {
  title: 'Atoms/TaskStatusTag',
  component: TaskStatusTag,
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['todo', 'progress', 'done', 'missed', 'rescheduled'],
    },
    showStatus: {
      control: { type: 'boolean' },
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TaskStatusTag },
  template: '<TaskStatusTag v-bind="$props" />',
});

export const Todo = Template.bind({});
Todo.args = {
  status: 'todo',
  showStatus: true,
};

export const InProgress = Template.bind({});
InProgress.args = {
  status: 'progress',
  showStatus: true,
};

export const Done = Template.bind({});
Done.args = {
  status: 'done',
  showStatus: true,
};

export const Missed = Template.bind({});
Missed.args = {
  status: 'missed',
  showStatus: true,
};

export const Rescheduled = Template.bind({});
Rescheduled.args = {
  status: 'rescheduled',
  showStatus: true,
};

export const Hidden = Template.bind({});
Hidden.args = {
  status: 'todo',
  showStatus: false,
};
