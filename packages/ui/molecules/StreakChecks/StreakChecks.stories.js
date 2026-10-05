// molecules/StreakChecks/StreakChecks.stories.js
import StreakChecks from './StreakChecks.vue';

export default {
  title: 'Molecules/StreakChecks',
  component: StreakChecks,
  argTypes: {
    days: {
      control: { type: 'object' },
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

// 16-22 Aug 2026, the beta week: completed 16, 17, 18; missed 19; completed 20, 21.
const week = (statuses) => statuses.map((status, i) => ({
  date: `${String(16 + i).padStart(2, '0')}-08-2026`,
  status,
}));

export const NoProgress = Template.bind({});
NoProgress.args = {
  days: week(['upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming']),
  animate: false,
};

export const ThreeComplete = Template.bind({});
ThreeComplete.args = {
  days: week(['complete', 'complete', 'complete', 'upcoming', 'upcoming', 'upcoming', 'upcoming']),
  animate: false,
};

export const BrokenStreak = Template.bind({});
BrokenStreak.args = {
  days: week(['complete', 'complete', 'complete', 'missed', 'complete', 'complete', 'upcoming']),
  animate: false,
};

export const NoMilestoneOnSomeDays = Template.bind({});
NoMilestoneOnSomeDays.args = {
  days: week(['complete', 'none', 'complete', 'missed', 'none', 'complete', 'upcoming']),
  animate: false,
};

export const FullStreak = Template.bind({});
FullStreak.args = {
  days: week(['complete', 'complete', 'complete', 'complete', 'complete', 'complete', 'complete']),
  animate: false,
};

export const WithAnimation = Template.bind({});
WithAnimation.args = {
  days: week(['complete', 'complete', 'complete', 'upcoming', 'upcoming', 'upcoming', 'upcoming']),
  animate: true,
};
