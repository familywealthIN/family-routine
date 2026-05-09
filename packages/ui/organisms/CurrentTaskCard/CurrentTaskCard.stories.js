import CurrentTaskCard from './CurrentTaskCard.vue';

export default {
  title: 'Organisms/CurrentTaskCard',
  component: CurrentTaskCard,
};

const sampleTask = {
  id: 'task-1',
  name: 'Morning meditation',
  time: '07:00',
  ticked: false,
  passed: false,
  wait: false,
  stimuli: [
    { name: 'K', earned: 6, splitRate: 2 },
    { name: 'D', earned: 10, splitRate: 10 },
  ],
  points: 10,
};

const sampleGoals = [
  {
    id: 'g-day',
    period: 'day',
    date: '28-02-2026',
    goalItems: [
      { id: 'gi-1', body: 'Sit for 10 minutes', taskRef: 'task-1', progress: 40 },
      { id: 'gi-2', body: 'Log what arose', taskRef: 'task-1', progress: 60 },
    ],
  },
  {
    id: 'g-week',
    period: 'week',
    date: '28-02-2026',
    goalItems: [
      { id: 'gi-3', body: 'Meditate 5 of 7 days', taskRef: 'task-1', progress: 72 },
    ],
  },
  {
    id: 'g-month',
    period: 'month',
    date: '28-02-2026',
    goalItems: [
      { id: 'gi-4', body: 'Finish the book', taskRef: 'task-1', progress: 20 },
    ],
  },
];

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { CurrentTaskCard },
  template: `
    <CurrentTaskCard
      v-bind="$props"
      @update:goalPeriod="goalPeriod = $event"
    />
  `,
  data() { return { goalPeriod: args.goalPeriod }; },
});

export const WithAllGoals = Template.bind({});
WithAllGoals.args = {
  task: sampleTask,
  goals: sampleGoals,
  allGoals: sampleGoals,
  goalPeriod: 'day',
  percentage: 60,
  completedCount: 3,
  totalCount: 5,
  timeLabel: '07:00',
  buttonIcon: 'alarm',
  buttonColor: '',
  buttonDisabled: false,
};

export const MissingWeekAndMonth = Template.bind({});
MissingWeekAndMonth.args = {
  task: sampleTask,
  goals: [sampleGoals[0]],
  allGoals: [sampleGoals[0]],
  goalPeriod: 'day',
  percentage: 20,
  completedCount: 1,
  totalCount: 5,
  timeLabel: '07:00',
  buttonIcon: 'alarm',
};

export const EventExecution = Template.bind({});
EventExecution.args = {
  ...WithAllGoals.args,
  eventExecutionInProgress: true,
  eventExecutionTimeLeft: 38,
};

export const LoadingSkeleton = Template.bind({});
LoadingSkeleton.args = {
  task: sampleTask,
  goals: [],
  goalPeriod: 'day',
  timeLabel: '07:00',
  showGoalsSkeleton: true,
};

export const NoTask = Template.bind({});
NoTask.args = {
  task: null,
  goals: [],
  goalPeriod: 'day',
};

export const RoutineLoading = Template.bind({});
RoutineLoading.args = {
  task: null,
  goals: [],
  goalPeriod: 'day',
  showRoutineSkeleton: true,
};
