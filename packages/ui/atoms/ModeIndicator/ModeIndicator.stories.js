// atoms/ModeIndicator/ModeIndicator.stories.js
import ModeIndicator from './ModeIndicator.vue';

export default {
  title: 'Atoms/ModeIndicator',
  component: ModeIndicator,
  argTypes: {
    mode: {
      control: { type: 'select' },
      options: ['task', 'goals'],
    },
    showLabel: {
      control: 'boolean',
    },
    size: {
      control: { type: 'number', min: 16, max: 48 },
    },
  },
  parameters: {
    layout: 'centered',
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ModeIndicator },
  template: '<ModeIndicator v-bind="$props" />',
});

export const TaskMode = Template.bind({});
TaskMode.args = {
  mode: 'task',
  showLabel: false,
  size: 24,
};

export const TaskModeWithLabel = Template.bind({});
TaskModeWithLabel.args = {
  mode: 'task',
  showLabel: true,
  size: 24,
};

export const GoalsMode = Template.bind({});
GoalsMode.args = {
  mode: 'goals',
  showLabel: false,
  size: 24,
};

export const GoalsModeWithLabel = Template.bind({});
GoalsModeWithLabel.args = {
  mode: 'goals',
  showLabel: true,
  size: 24,
};

export const Large = Template.bind({});
Large.args = {
  mode: 'task',
  showLabel: true,
  size: 36,
};

export const Small = Template.bind({});
Small.args = {
  mode: 'goals',
  showLabel: false,
  size: 16,
};
