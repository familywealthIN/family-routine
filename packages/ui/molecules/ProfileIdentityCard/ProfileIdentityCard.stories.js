import ProfileIdentityCard from './ProfileIdentityCard.vue';

// An obviously fake initials avatar; storybook serves no /img folder.
const AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="#7b5ea7"/><text x="64" y="82" font-family="Roboto, Arial, sans-serif" font-size="52" font-weight="500" fill="#fff" text-anchor="middle">AR</text></svg>',
)}`;

export default {
  title: 'Molecules/ProfileIdentityCard',
  component: ProfileIdentityCard,
  argTypes: {
    name: { control: 'text' },
    email: { control: 'text' },
    picture: { control: 'text' },
    points: { control: 'number' },
    streakDays: { control: 'number' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ProfileIdentityCard },
  template: '<div style="max-width: 412px"><ProfileIdentityCard v-bind="$props" @sign-out="onSignOut" /></div>',
  methods: {
    onSignOut() {
      console.log('sign out');
    },
  },
});

export const Default = Template.bind({});
Default.args = {
  name: 'Alex Rivera',
  email: 'alex@example.com',
  picture: AVATAR,
  points: 1240,
  streakDays: 12,
};

// Points and streak not read yet: no chips rather than a confident 0.
export const NoStats = Template.bind({});
NoStats.args = {
  name: 'Alex Rivera',
  email: 'alex@example.com',
  picture: AVATAR,
};

export const PointsOnly = Template.bind({});
PointsOnly.args = {
  name: 'Alex Rivera',
  email: 'alex@example.com',
  picture: AVATAR,
  points: 85,
};
