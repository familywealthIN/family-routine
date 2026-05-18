// molecules/GoalItemMilestoneList/GoalItemMilestoneList.stories.js
import GoalItemMilestoneList from './GoalItemMilestoneList.vue';

export default {
  title: 'Molecules/GoalItemMilestoneList',
  component: GoalItemMilestoneList,
  argTypes: {
    goalItems: {
      control: { type: 'object' },
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalItemMilestoneList },
  template: '<ul><GoalItemMilestoneList v-bind="$props" /></ul>',
});

export const FlatList = Template.bind({});
FlatList.args = {
  goalItems: [
    {
      id: '1',
      body: 'Complete documentation',
      period: 'week',
      date: '2025-W51',
      isComplete: true,
    },
    {
      id: '2',
      body: 'Review PRs',
      period: 'day',
      date: '2025-12-22',
      isComplete: false,
    },
  ],
};

export const WithNested = Template.bind({});
WithNested.args = {
  goalItems: [
    {
      id: '1',
      body: 'Q4 Goals',
      period: 'month',
      date: '2025-12',
      isComplete: false,
      milestones: [
        {
          id: '1-1',
          body: 'Complete feature A',
          period: 'week',
          date: '2025-W50',
          isComplete: true,
        },
        {
          id: '1-2',
          body: 'Complete feature B',
          period: 'week',
          date: '2025-W51',
          isComplete: false,
        },
      ],
    },
    {
      id: '2',
      body: 'Documentation',
      period: 'week',
      date: '2025-W51',
      isComplete: false,
    },
  ],
};
