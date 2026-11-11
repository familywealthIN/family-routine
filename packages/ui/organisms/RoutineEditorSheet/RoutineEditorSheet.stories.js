import RoutineEditorSheet from './RoutineEditorSheet.vue';

export default {
  title: 'Organisms/RoutineEditorSheet',
  component: RoutineEditorSheet,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    open: { control: 'boolean' },
    shell: { control: { type: 'select' }, options: ['phone', 'tablet', 'desktop'] },
    routine: { control: 'object' },
    defaultTime: { control: 'text' },
    siblings: { control: 'object' },
    maxPoints: { control: 'number' },
    tagUniverse: { control: 'object' },
    tagUsage: { control: 'object' },
    agent: { control: 'object' },
    yearGoal: { control: 'object' },
    errorMessage: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RoutineEditorSheet },
  template: '<RoutineEditorSheet v-bind="$props" @close="onEvent(\'close\')" @save="onEvent(\'save\', $event)" @delete="onEvent(\'delete\', $event)" @manage-agent="onEvent(\'manage-agent\')" @open-goal="onEvent(\'open-goal\', $event)" />',
  methods: {
    onEvent(name, payload) {
      console.log(name, payload);
    },
  },
});

const siblings = [
  { id: 'wake', time: '05:30' },
  { id: 'jog', time: '07:15' },
  { id: 'office', time: '08:30' },
  { id: 'deep', time: '09:00' },
  { id: 'workout', time: '19:30' },
  { id: 'family', time: '21:00' },
];

const tagUniverse = ['area:health', 'area:health:fitness', 'area:work', 'project:website'];
const tagUsage = {
  'area:health': 3, 'area:health:fitness': 2, 'area:work': 4, 'project:website': 2,
};

const deepWork = {
  id: 'deep',
  name: 'Deep Work',
  description: 'Three focused hours on the most important project.',
  time: '09:00',
  points: 20,
  tags: ['area:work', 'project:website'],
  notifyMode: 'notify',
  steps: [
    { id: 's1', name: 'Close chat and email' },
    { id: 's2', name: 'Pick the one thing to ship' },
    { id: 's3', name: 'Work in a 90 minute block' },
  ],
};

export const EditPhone = Template.bind({});
EditPhone.args = {
  open: true,
  shell: 'phone',
  routine: deepWork,
  siblings,
  maxPoints: 50,
  tagUniverse,
  tagUsage,
  agent: { name: 'Website helper', status: 'idle' },
  yearGoal: { id: 'yg1', body: 'Launch the website', pct: 42 },
};

export const NewPhone = Template.bind({});
NewPhone.args = {
  open: true,
  shell: 'phone',
  routine: null,
  defaultTime: '13:00',
  siblings,
  maxPoints: 50,
  tagUniverse,
  tagUsage,
};

export const EditDesktop = Template.bind({});
EditDesktop.args = {
  open: true,
  shell: 'desktop',
  routine: {
    id: 'workout',
    name: 'Workout',
    description: '',
    time: '19:30',
    points: 15,
    tags: ['area:health:fitness'],
    notifyMode: 'alarm',
    steps: [{ id: 's1', name: 'Warm up' }, { id: 's2', name: 'Strength set' }],
  },
  siblings,
  maxPoints: 50,
  tagUniverse,
  tagUsage,
  agent: null,
  yearGoal: { id: 'yg2', body: 'Run a half marathon', pct: 18 },
};

export const BudgetSpent = Template.bind({});
BudgetSpent.args = {
  open: true,
  shell: 'tablet',
  routine: null,
  defaultTime: '22:00',
  siblings,
  maxPoints: 0,
  tagUniverse,
  tagUsage,
  errorMessage: '',
};
