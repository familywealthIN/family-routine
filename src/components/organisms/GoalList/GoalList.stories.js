import GoalList from './GoalList.vue';

export default {
  title: 'Organisms/GoalList',
  component: GoalList,
  argTypes: {
    period: {
      control: { type: 'select' },
      options: ['day', 'week', 'month', 'year', 'lifetime'],
    },
    showProgress: {
      control: 'boolean',
    },
    collapsible: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalList },
  data() {
    return {
      goals: [
        {
          id: 1, title: 'Complete project documentation', status: 'progress', progress: 60, tags: ['work'],
        },
        {
          id: 2, title: 'Exercise 30 minutes', status: 'done', progress: 100, tags: ['health'],
        },
        {
          id: 3, title: 'Read one chapter', status: 'todo', progress: 0, tags: ['personal'],
        },
        {
          id: 4, title: 'Review weekly goals', status: 'progress', progress: 30, tags: ['planning'],
        },
      ],
    };
  },
  template: '<GoalList :goals="goals" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {};

export const DailyGoals = Template.bind({});
DailyGoals.args = {
  period: 'day',
  showProgress: true,
};

export const WeeklyGoals = Template.bind({});
WeeklyGoals.args = {
  period: 'week',
  showProgress: true,
};

export const Collapsible = Template.bind({});
Collapsible.args = {
  collapsible: true,
};

export const EmptyState = () => ({
  components: { GoalList },
  template: '<GoalList :goals="[]" period="day" />',
});

export const YearlyGoals = () => ({
  components: { GoalList },
  data() {
    return {
      goals: [
        {
          id: 1, title: 'Learn a new programming language', status: 'progress', progress: 45, tags: ['career', 'learning'],
        },
        {
          id: 2, title: 'Run a marathon', status: 'progress', progress: 30, tags: ['health', 'fitness'],
        },
        {
          id: 3, title: 'Save $10,000', status: 'progress', progress: 60, tags: ['finance'],
        },
        {
          id: 4, title: 'Read 24 books', status: 'progress', progress: 20, tags: ['personal', 'learning'],
        },
        {
          id: 5, title: 'Travel to 3 new countries', status: 'todo', progress: 0, tags: ['travel', 'personal'],
        },
      ],
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>
        <v-icon left>emoji_events</v-icon>
        2025 Goals
      </v-card-title>
      <GoalList :goals="goals" period="year" showProgress collapsible />
    </v-card>
  `,
});

export const LifetimeGoals = () => ({
  components: { GoalList },
  data() {
    return {
      goals: [
        {
          id: 1, title: 'Write a book', status: 'todo', progress: 0,
        },
        {
          id: 2, title: 'Start a business', status: 'progress', progress: 15,
        },
        {
          id: 3, title: 'Visit all continents', status: 'progress', progress: 40,
        },
        {
          id: 4, title: 'Learn to play an instrument', status: 'done', progress: 100,
        },
      ],
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>
        <v-icon left>star</v-icon>
        Lifetime Goals
      </v-card-title>
      <GoalList :goals="goals" period="lifetime" showProgress />
    </v-card>
  `,
});
