import Avatar from './Avatar.vue';

export default {
  title: 'Atoms/Avatar',
  component: Avatar,
  argTypes: {
    size: {
      control: { type: 'number' },
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'accent', 'grey'],
    },
    tile: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Avatar },
  template: '<Avatar v-bind="$props" />',
});

export const WithImage = Template.bind({});
WithImage.args = {
  src: 'https://randomuser.me/api/portraits/men/1.jpg',
  alt: 'User avatar',
  size: 48,
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  icon: 'mdi-account',
  color: 'primary',
  size: 48,
};

export const WithText = Template.bind({});
WithText.args = {
  text: 'JD',
  color: 'primary',
  size: 48,
};

export const Small = Template.bind({});
Small.args = {
  icon: 'mdi-account',
  color: 'primary',
  size: 32,
};

export const Large = Template.bind({});
Large.args = {
  icon: 'mdi-account',
  color: 'primary',
  size: 64,
};

export const Tile = Template.bind({});
Tile.args = {
  icon: 'mdi-account',
  color: 'primary',
  size: 48,
  tile: true,
};

export const Sizes = () => ({
  components: { Avatar },
  template: `
    <div style="display: flex; gap: 16px; align-items: center;">
      <Avatar icon="mdi-account" color="primary" :size="24" />
      <Avatar icon="mdi-account" color="primary" :size="32" />
      <Avatar icon="mdi-account" color="primary" :size="48" />
      <Avatar icon="mdi-account" color="primary" :size="64" />
      <Avatar icon="mdi-account" color="primary" :size="96" />
    </div>
  `,
});

export const Colors = () => ({
  components: { Avatar },
  template: `
    <div style="display: flex; gap: 16px; align-items: center;">
      <Avatar text="A" color="primary" />
      <Avatar text="B" color="secondary" />
      <Avatar text="C" color="success" />
      <Avatar text="D" color="error" />
      <Avatar text="E" color="warning" />
      <Avatar text="F" color="info" />
    </div>
  `,
});
