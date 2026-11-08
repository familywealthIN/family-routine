import GroupInviteSheet from './GroupInviteSheet.vue';

export default {
  title: 'Organisms/GroupInviteSheet',
  component: GroupInviteSheet,
  argTypes: {
    open: { control: 'boolean' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    email: { control: 'text' },
    tried: { control: 'boolean' },
    taken: { control: 'object' },
    slotsLeft: { control: 'number' },
    sending: { control: 'boolean' },
  },
};

// `email` is v-model-ish on the real page (`update:email`), so the story keeps a
// local copy and the field stays typeable in the canvas.
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GroupInviteSheet },
  template: '<GroupInviteSheet v-bind="$props" :email="draft" @update:email="draft = $event" @send="onEvent(\'send\')" @close="onEvent(\'close\')" />',
  data() {
    return { draft: this.email };
  },
  watch: {
    email(value) {
      this.draft = value;
    },
  },
  methods: {
    onEvent(name) {
      console.log(name);
    },
  },
});

const TAKEN = ['jordan@example.com', 'sam@example.com'];

export const Empty = Template.bind({});
Empty.args = {
  open: true,
  shell: 'phone',
  email: '',
  taken: TAKEN,
  slotsLeft: 7,
};

export const ValidEmail = Template.bind({});
ValidEmail.args = {
  open: true,
  shell: 'phone',
  email: 'priya@example.com',
  taken: TAKEN,
  slotsLeft: 7,
};

export const InvalidAfterSend = Template.bind({});
InvalidAfterSend.args = {
  open: true,
  shell: 'phone',
  email: 'priya@example',
  tried: true,
  taken: TAKEN,
  slotsLeft: 7,
};

export const AlreadyInGroup = Template.bind({});
AlreadyInGroup.args = {
  open: true,
  shell: 'phone',
  email: 'jordan@example.com',
  taken: TAKEN,
  slotsLeft: 7,
};

export const Sending = Template.bind({});
Sending.args = {
  open: true,
  shell: 'phone',
  email: 'priya@example.com',
  taken: TAKEN,
  slotsLeft: 7,
  sending: true,
};

export const TabletModal = Template.bind({});
TabletModal.args = {
  open: true,
  shell: 'tablet',
  email: 'priya@example.com',
  taken: TAKEN,
  slotsLeft: 1,
};
