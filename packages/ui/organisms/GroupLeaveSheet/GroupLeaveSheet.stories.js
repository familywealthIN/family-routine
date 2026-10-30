import GroupLeaveSheet from './GroupLeaveSheet.vue';

export default {
  title: 'Organisms/GroupLeaveSheet',
  component: GroupLeaveSheet,
  argTypes: {
    open: { control: 'boolean' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    othersNames: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GroupLeaveSheet },
  template: '<GroupLeaveSheet v-bind="$props" @close="onEvent(\'close\')" @confirm="onEvent(\'confirm\')" />',
  methods: {
    onEvent(name) {
      console.log(name);
    },
  },
});

export const Phone = Template.bind({});
Phone.args = {
  open: true,
  shell: 'phone',
  othersNames: 'Jordan, Sam and Priya',
};

export const Tablet = Template.bind({});
Tablet.args = {
  open: true,
  shell: 'tablet',
  othersNames: 'Jordan, Sam and Priya',
};

export const OnePersonLeft = Template.bind({});
OnePersonLeft.args = {
  open: true,
  shell: 'phone',
  othersNames: 'Jordan',
};
