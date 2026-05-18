import WeekGoalStreak from './WeekGoalStreak.vue';

export default {
  title: 'Organisms/WeekGoalStreak',
  component: WeekGoalStreak,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { WeekGoalStreak },
  template: '<WeekGoalStreak v-bind="$props" />',
});

export const WithGoals = Template.bind({});
WithGoals.args = {
  weekGoals: [
    {
      id: 'wg-1',
      period: 'week',
      date: '28-02-2026',
      goalItems: [
        { id: 'gi-1', body: 'Train for 10k run', progress: 72 },
        { id: 'gi-2', body: 'Read 100 pages of Deep Work', progress: 40 },
      ],
    },
  ],
};

export const SingleGoalItem = Template.bind({});
SingleGoalItem.args = {
  weekGoals: [
    {
      id: 'wg-2',
      period: 'week',
      date: '28-02-2026',
      goalItems: [
        { id: 'gi-3', body: 'Ship v2 release notes', progress: 95 },
      ],
    },
  ],
};

export const EmptyGoalItems = Template.bind({});
EmptyGoalItems.args = {
  weekGoals: [
    {
      id: 'wg-3',
      period: 'week',
      date: '28-02-2026',
      goalItems: [],
    },
  ],
};
