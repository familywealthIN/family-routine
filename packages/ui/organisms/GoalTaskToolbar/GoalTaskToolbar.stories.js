import GoalTaskToolbar from './GoalTaskToolbar.vue';

export default {
  title: 'Organisms/GoalTaskToolbar',
  component: GoalTaskToolbar,
  argTypes: {
    period: { control: { type: 'select', options: ['', 'day', 'week', 'month', 'year', 'lifetime'] } },
    date: { control: 'text' },
    taskRef: { control: 'text' },
    goalRef: { control: 'text' },
    tasklist: { control: 'object' },
    goalItemsRef: { control: 'object' },
    disabled: { control: 'boolean' },
    minDate: { control: 'text' },
    taskMode: { control: 'boolean' },
    searchMode: { control: 'boolean' },
    isMilestone: { control: 'boolean' },
  },
};

const TASKLIST = [
  { id: 'r1', name: 'Wake up · brush · invest', time: '05:30' },
  { id: 'r2', name: 'Reading and skills', time: '06:00' },
  { id: 'r3', name: 'Jogging', time: '07:15' },
  { id: 'r4', name: 'Deep Work', time: '09:00' },
  { id: 'r5', name: 'Workout', time: '19:30' },
];

const WEEK_GOALS = [
  { id: 'wg1', body: 'Ship the pricing page this week', taskRef: 'r4' },
  { id: 'wg2', body: 'Run 25 km this week', taskRef: 'r3' },
  { id: 'wg3', body: 'Google UX: course 2', taskRef: 'r2' },
];

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalTaskToolbar },
  template: `
    <div style="width:380px;padding:12px;background:#fff">
      <GoalTaskToolbar
        v-bind="$props"
        @update:date="log('date', $event)"
        @update:period="log('period', $event)"
        @update:taskRef="log('taskRef', $event)"
        @update:goalRef="log('goalRef', $event)"
      />
    </div>`,
  methods: {
    log(name, value) {
      console.log('goal task toolbar', name, value);
    },
  },
});

export const DayGoalWithMilestoneParent = Template.bind({});
DayGoalWithMilestoneParent.args = {
  period: 'day',
  date: '25-10-2026',
  taskRef: 'r4',
  goalRef: 'wg1',
  tasklist: TASKLIST,
  goalItemsRef: WEEK_GOALS,
  isMilestone: true,
};

export const RoutineChosenNoParentYet = Template.bind({});
RoutineChosenNoParentYet.args = {
  period: 'day',
  date: '25-10-2026',
  taskRef: 'r3',
  goalRef: '',
  tasklist: TASKLIST,
  goalItemsRef: WEEK_GOALS,
};

export const NothingPickedYet = Template.bind({});
NothingPickedYet.args = {
  period: '',
  date: '',
  taskRef: '',
  goalRef: '',
  tasklist: TASKLIST,
  goalItemsRef: [],
};

export const WeekGoal = Template.bind({});
WeekGoal.args = {
  period: 'week',
  date: '31-10-2026',
  taskRef: 'r3',
  goalRef: '',
  tasklist: TASKLIST,
  goalItemsRef: [],
};

export const LifetimeGoal = Template.bind({});
LifetimeGoal.args = {
  period: 'lifetime',
  date: '01-01-1970',
  taskRef: '',
  goalRef: '',
  tasklist: TASKLIST,
  goalItemsRef: [],
};

export const DayOnlyTaskMode = Template.bind({});
DayOnlyTaskMode.args = {
  period: 'day',
  date: '26-10-2026',
  taskRef: 'r2',
  goalRef: '',
  tasklist: TASKLIST,
  goalItemsRef: WEEK_GOALS,
  taskMode: true,
};

export const SearchModeRoutineOnly = Template.bind({});
SearchModeRoutineOnly.args = {
  period: 'day',
  date: '25-10-2026',
  taskRef: 'r5',
  goalRef: '',
  tasklist: TASKLIST,
  goalItemsRef: WEEK_GOALS,
  searchMode: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  period: 'day',
  date: '25-10-2026',
  taskRef: 'r4',
  goalRef: 'wg1',
  tasklist: TASKLIST,
  goalItemsRef: WEEK_GOALS,
  isMilestone: true,
  disabled: true,
};
