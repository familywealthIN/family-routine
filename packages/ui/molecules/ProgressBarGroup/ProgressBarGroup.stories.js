import ProgressBarGroup from './ProgressBarGroup.vue';

export default {
  title: 'Molecules/ProgressBarGroup',
  component: ProgressBarGroup,
  argTypes: {
    heading: { control: 'text' },
    rows: { control: 'object' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ProgressBarGroup },
  template: '<div style="max-width: 380px; padding: 16px; background: #fff;"><ProgressBarGroup v-bind="$props" /></div>',
});

export const Default = Template.bind({});
Default.args = {
  heading: 'COMPLETED · AVG PER DAY',
  rows: [
    {
      key: 'routine-items', label: 'Routine items', icon: 'history', value: 5, total: 7,
    },
    {
      key: 'tasks', label: 'Tasks', icon: 'task_alt', value: 3, total: 6,
    },
    {
      key: 'milestones', label: 'Milestones', icon: 'flag', value: 1, total: 4,
    },
  ],
};

export const Complete = Template.bind({});
Complete.args = {
  heading: 'TODAY',
  rows: [
    {
      key: 'routine-items', label: 'Routine items', icon: 'history', value: 7, total: 7,
    },
    {
      key: 'tasks', label: 'Tasks', icon: 'task_alt', value: 6, total: 6,
    },
    {
      key: 'milestones', label: 'Milestones', icon: 'flag', value: 2, total: 2,
    },
  ],
};

export const Unknown = Template.bind({});
Unknown.args = {
  heading: 'AVG PER DAY · MILESTONES THIS YEAR',
  rows: [
    {
      key: 'routine-items', label: 'Routine items', icon: 'history', value: 5, total: 7,
    },
    {
      key: 'tasks', label: 'Tasks', icon: 'task_alt', value: null, total: null,
    },
    {
      key: 'milestones', label: 'Milestones', icon: 'flag', value: null, total: null,
    },
  ],
};
