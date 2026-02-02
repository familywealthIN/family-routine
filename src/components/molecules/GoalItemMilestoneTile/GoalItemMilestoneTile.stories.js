// molecules/GoalItemMilestoneTile/GoalItemMilestoneTile.stories.js
import GoalItemMilestoneTile from './GoalItemMilestoneTile.vue';

export default {
  title: 'Molecules/GoalItemMilestoneTile',
  component: GoalItemMilestoneTile,
  argTypes: {
    goalItem: {
      control: { type: 'object' },
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalItemMilestoneTile },
  template: '<GoalItemMilestoneTile v-bind="$props" />',
});

export const Completed = Template.bind({});
Completed.args = {
  goalItem: {
    id: '1',
    body: 'Complete project documentation',
    period: 'week',
    date: '2025-W51',
    isComplete: true,
  },
};

export const Incomplete = Template.bind({});
Incomplete.args = {
  goalItem: {
    id: '2',
    body: 'Review code changes',
    period: 'day',
    date: '2025-12-22',
    isComplete: false,
  },
};

export const MonthGoal = Template.bind({});
MonthGoal.args = {
  goalItem: {
    id: '3',
    body: 'Launch new feature',
    period: 'month',
    date: '2025-12',
    isComplete: false,
  },
};
