import PriorityGoalList from './PriorityGoalList.vue';

export default {
  title: 'Molecules/PriorityGoalList',
  component: PriorityGoalList,
  argTypes: {
    items: { control: 'object' },
    tasklist: { control: 'object' },
    color: { control: 'color' },
    emptyText: { control: 'text' },
    showEdit: { control: 'boolean' },
    showDelete: { control: 'boolean' },
    showSubtasks: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PriorityGoalList },
  template: '<div style="max-width: 420px; background: #fff;"><PriorityGoalList v-bind="$props" /></div>',
});

const tasklist = [
  { id: 't-deep', taskId: 't-deep', name: 'Deep Work' },
  { id: 't-office', taskId: 't-office', name: 'Start office work' },
  { id: 't-jog', taskId: 't-jog', name: 'Jogging' },
];

const items = [
  {
    id: 'g1', body: 'Ship the pricing page', isComplete: false, taskRef: 't-deep', parentGoalBody: 'Launch the website',
  },
  {
    id: 'g2', body: 'Email two beta users', isComplete: true, taskRef: 't-office', parentGoalBody: '',
  },
  {
    id: 'g3', body: 'Run 5 km', isComplete: false, taskRef: 't-jog', parentGoalBody: 'Get fit this quarter',
  },
];

export const Default = Template.bind({});
Default.args = {
  items,
  tasklist,
  color: '#F44336',
};

export const WithSubtasksAndDelete = Template.bind({});
WithSubtasksAndDelete.args = {
  items: [
    {
      ...items[0],
      subTasks: [
        { id: 's1', body: 'Draft the three tiers', isComplete: true },
        { id: 's2', body: 'Review copy', isComplete: false },
      ],
    },
    { ...items[1], reward: '<p>Agent drafted both emails.</p>' },
    items[2],
  ],
  tasklist,
  color: '#1976D2',
  showSubtasks: true,
  showDelete: true,
};

export const Empty = Template.bind({});
Empty.args = {
  items: [],
  emptyText: 'No items for this day',
};
