import TaskTimingBar from './TaskTimingBar.vue';

export default {
  title: 'Atoms/TaskTimingBar',
  component: TaskTimingBar,
  argTypes: {
    inTimeCount: { control: 'number' },
    outOfTimeCount: { control: 'number' },
    vertical: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TaskTimingBar },
  template: '<div style="width:360px"><TaskTimingBar v-bind="$props" /></div>',
});

export const Default = Template.bind({});
Default.args = { inTimeCount: 5, outOfTimeCount: 2 };

export const NoneYet = Template.bind({});
NoneYet.args = { inTimeCount: 0, outOfTimeCount: 0 };

export const AllInTime = Template.bind({});
AllInTime.args = { inTimeCount: 7, outOfTimeCount: 0 };

export const Vertical = Template.bind({});
Vertical.args = { inTimeCount: 5, outOfTimeCount: 2, vertical: true };
