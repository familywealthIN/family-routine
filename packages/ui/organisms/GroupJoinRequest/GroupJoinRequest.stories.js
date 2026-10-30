import GroupJoinRequest from './GroupJoinRequest.vue';

export default {
  title: 'Organisms/GroupJoinRequest',
  component: GroupJoinRequest,
  argTypes: {
    inviterEmail: { control: 'text' },
    inGroup: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GroupJoinRequest },
  template: '<div style="max-width: 412px"><GroupJoinRequest v-bind="$props" @accept="onEvent(\'accept\')" @decline="onEvent(\'decline\')" /></div>',
  methods: {
    onEvent(name) {
      console.log(name);
    },
  },
});

// Accepting leaves the group you are in now, and the card says so.
export const AlreadyInAGroup = Template.bind({});
AlreadyInAGroup.args = {
  inviterEmail: 'jordan@example.com',
  inGroup: true,
};

export const NotInAGroup = Template.bind({});
NotInAGroup.args = {
  inviterEmail: 'jordan@example.com',
  inGroup: false,
};
