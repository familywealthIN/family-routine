import UpcomingPastTasks from './UpcomingPastTasks.vue';

export default {
  title: 'Organisms/UpcomingPastTasks',
  component: UpcomingPastTasks,
};

const sampleUpcoming = [
  {
    id: 'task-10',
    name: 'Lunch',
    time: '12:30',
    ticked: false,
    passed: false,
    percentage: 0,
    completedCount: 0,
    totalCount: 2,
    timeLabel: '12:30',
    buttonIcon: 'alarm',
    buttonColor: '',
    buttonDisabled: false,
  },
  {
    id: 'task-11',
    name: 'Evening walk',
    time: '18:30',
    ticked: false,
    passed: false,
    percentage: 0,
    completedCount: 0,
    totalCount: 3,
    timeLabel: '18:30',
    buttonIcon: 'alarm',
    buttonColor: '',
    buttonDisabled: false,
  },
];

const samplePast = [
  {
    id: 'task-1',
    name: 'Morning meditation',
    time: '07:00',
    ticked: true,
    passed: true,
    percentage: 100,
    completedCount: 5,
    totalCount: 5,
    timeLabel: '07:00',
    buttonIcon: 'check',
    buttonColor: 'success',
    buttonDisabled: false,
  },
  {
    id: 'task-2',
    name: 'Standup',
    time: '09:30',
    ticked: false,
    passed: true,
    percentage: 40,
    completedCount: 1,
    totalCount: 3,
    timeLabel: '09:30',
    buttonIcon: 'close',
    buttonColor: 'error',
    buttonDisabled: false,
  },
];

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { UpcomingPastTasks },
  template: `
    <UpcomingPastTasks
      v-bind="$props"
      @update:tabs="tabs = $event"
      @update:goalPeriod="goalPeriod = $event"
      @task-click="selectedTaskRef = $event.id"
    />
  `,
  data() { return { tabs: args.tabs, goalPeriod: args.goalPeriod, selectedTaskRef: args.selectedTaskRef }; },
});

export const UpcomingDefault = Template.bind({});
UpcomingDefault.args = {
  upcomingTasks: sampleUpcoming,
  pastTasks: samplePast,
  tabs: 0,
  selectedTaskRef: '',
  goalPeriod: 'day',
  goals: [],
};

export const PastWithSelection = Template.bind({});
PastWithSelection.args = {
  upcomingTasks: sampleUpcoming,
  pastTasks: samplePast,
  tabs: 1,
  selectedTaskRef: 'task-1',
  goalPeriod: 'day',
  goals: [
    {
      id: 'g-day',
      period: 'day',
      date: '28-02-2026',
      goalItems: [
        { id: 'gi-1', body: 'Sit for 10 minutes', taskRef: 'task-1', progress: 100 },
      ],
    },
  ],
};

export const EmptyState = Template.bind({});
EmptyState.args = {
  upcomingTasks: [],
  pastTasks: [],
  tabs: 0,
  goalPeriod: 'day',
  goals: [],
};
