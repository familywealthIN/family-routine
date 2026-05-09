import QuickGoalCreation from './QuickGoalCreation.vue';

export default {
  title: 'Organisms/QuickGoalCreation',
  component: QuickGoalCreation,
  argTypes: {
    placeholder: {
      control: 'text',
    },
    defaultPeriod: {
      control: { type: 'select' },
      options: ['day', 'week', 'month', 'year', 'lifetime'],
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { QuickGoalCreation },
  methods: {
    handleCreate(goal) {
      console.log('Goal created:', goal);
    },
  },
  template: '<QuickGoalCreation v-bind="$props" @create="handleCreate" />',
});

export const Default = Template.bind({});
Default.args = {};

export const CustomPlaceholder = Template.bind({});
CustomPlaceholder.args = {
  placeholder: 'What do you want to achieve today?',
};

export const DailyGoal = Template.bind({});
DailyGoal.args = {
  placeholder: 'Add a daily goal...',
  defaultPeriod: 'day',
};

export const WeeklyGoal = Template.bind({});
WeeklyGoal.args = {
  placeholder: 'Add a weekly goal...',
  defaultPeriod: 'week',
};

export const InDashboard = () => ({
  components: { QuickGoalCreation },
  data() {
    return {
      recentGoals: [
        { id: 1, text: 'Complete project documentation', period: 'week' },
        { id: 2, text: 'Exercise 30 minutes', period: 'day' },
        { id: 3, text: 'Read one chapter', period: 'day' },
      ],
    };
  },
  methods: {
    handleCreate(goal) {
      this.recentGoals.unshift({
        id: Date.now(),
        text: goal.text,
        period: goal.period,
      });
    },
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>Quick Add Goal</v-card-title>
      <v-card-text>
        <QuickGoalCreation @create="handleCreate" placeholder="What's your next goal?" />
        <div v-if="recentGoals.length" class="mt-4">
          <div class="subtitle-1 mb-2">Recently Added:</div>
          <v-chip 
            v-for="goal in recentGoals.slice(0, 3)" 
            :key="goal.id" 
            class="mr-2 mb-2"
            small
          >
            {{ goal.text }} ({{ goal.period }})
          </v-chip>
        </div>
      </v-card-text>
    </v-card>
  `,
});

export const FloatingAction = () => ({
  components: { QuickGoalCreation },
  data() {
    return {
      showDialog: false,
    };
  },
  template: `
    <div>
      <v-btn fab color="primary" fixed bottom right @click="showDialog = true">
        <v-icon>add</v-icon>
      </v-btn>
      <v-dialog v-model="showDialog" max-width="500">
        <v-card>
          <v-card-title>Add New Goal</v-card-title>
          <v-card-text>
            <QuickGoalCreation @create="showDialog = false" />
          </v-card-text>
        </v-card>
      </v-dialog>
    </div>
  `,
});
