// molecules/StreakChecks/StreakChecks.stories.js
import StreakChecks from './StreakChecks.vue';

export default {
  title: 'Molecules/StreakChecks',
  component: StreakChecks,
  argTypes: {
    progress: {
      control: { type: 'number', min: 0, max: 5, step: 1 },
    },
    animate: {
      control: { type: 'boolean' },
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { StreakChecks },
  template: '<StreakChecks v-bind="$props" />',
});

export const NoProgress = Template.bind({});
NoProgress.args = {
  progress: 0,
  animate: false,
};

export const OneComplete = Template.bind({});
OneComplete.args = {
  progress: 1,
  animate: false,
};

export const ThreeComplete = Template.bind({});
ThreeComplete.args = {
  progress: 3,
  animate: false,
};

export const FullStreak = Template.bind({});
FullStreak.args = {
  progress: 5,
  animate: false,
};

export const WithAnimation = Template.bind({});
WithAnimation.args = {
  progress: 3,
  animate: true,
};
