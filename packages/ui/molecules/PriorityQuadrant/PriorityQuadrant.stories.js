import PriorityQuadrant from './PriorityQuadrant.vue';

// One quadrant of the 2×2 priority map: a titled card around a PriorityGoalList.
// `color` is a Vuetify colour name (error, primary, warning, grey darken-1).
export default {
  title: 'Molecules/PriorityQuadrant',
  component: PriorityQuadrant,
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    color: {
      control: { type: 'select' },
      options: ['error', 'primary', 'warning', 'grey darken-1'],
    },
    icon: { control: 'text' },
    items: { control: 'object' },
    tasklist: { control: 'object' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PriorityQuadrant },
  template: '<div style="max-width: 420px;"><PriorityQuadrant v-bind="$props" /></div>',
});

const tasklist = [
  { id: 't-deep', taskId: 't-deep', name: 'Deep Work' },
  { id: 't-office', taskId: 't-office', name: 'Start office work' },
  { id: 't-jog', taskId: 't-jog', name: 'Jogging' },
];

export const Default = Template.bind({});
Default.args = {
  title: 'Do',
  subtitle: 'Urgent and important',
  color: 'error',
  icon: 'priority_high',
  tasklist,
  items: [
    {
      id: 'g1', body: 'Ship the pricing page', isComplete: false, taskRef: 't-deep', parentGoalBody: 'Launch the website',
    },
    {
      id: 'g2', body: 'Email two beta users', isComplete: true, taskRef: 't-office', parentGoalBody: '',
    },
  ],
};

export const Plan = Template.bind({});
Plan.args = {
  title: 'Plan',
  subtitle: 'Important, not urgent',
  color: 'primary',
  icon: 'event',
  tasklist,
  items: [
    {
      id: 'g3', body: 'Run 5 km', isComplete: false, taskRef: 't-jog', parentGoalBody: 'Get fit this quarter',
    },
  ],
};

export const Empty = Template.bind({});
Empty.args = {
  title: 'Delegate',
  subtitle: 'Urgent, not important',
  color: 'warning',
  icon: 'people',
  tasklist,
  items: [],
};
