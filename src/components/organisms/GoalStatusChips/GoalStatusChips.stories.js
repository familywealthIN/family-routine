import GoalStatusChips from './GoalStatusChips.vue';

export default {
  title: 'Organisms/GoalStatusChips',
  component: GoalStatusChips,
  argTypes: {
    hasMonthGoal: { control: 'boolean' },
    hasWeekGoal: { control: 'boolean' },
    showMonthChip: { control: 'boolean' },
    showWeekChip: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalStatusChips },
  template: `
    <GoalStatusChips
      v-bind="$props"
      @set-goal="handleSetGoal"
    />
  `,
  methods: {
    handleSetGoal(period) {
      console.log('Set goal for:', period);
    },
  },
});

export const NoGoalsSet = Template.bind({});
NoGoalsSet.args = {
  hasMonthGoal: false,
  hasWeekGoal: false,
};

export const WeekGoalOnly = Template.bind({});
WeekGoalOnly.args = {
  hasMonthGoal: false,
  hasWeekGoal: true,
};

export const MonthGoalOnly = Template.bind({});
MonthGoalOnly.args = {
  hasMonthGoal: true,
  hasWeekGoal: false,
};

export const AllGoalsSet = Template.bind({});
AllGoalsSet.args = {
  hasMonthGoal: true,
  hasWeekGoal: true,
};

export const CustomMessage = () => ({
  components: { GoalStatusChips },
  template: `
    <GoalStatusChips :hasMonthGoal="true" :hasWeekGoal="true">
      <template #all-set-message>
        Great job! All your goals are configured. Keep up the momentum!
      </template>
    </GoalStatusChips>
  `,
});
