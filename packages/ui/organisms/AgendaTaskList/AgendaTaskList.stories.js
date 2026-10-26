import AgendaTaskList from './AgendaTaskList.vue';

export default {
  title: 'Organisms/AgendaTaskList',
  component: AgendaTaskList,
  argTypes: {
    groups: { control: 'object' },
    loading: { control: 'boolean' },
    hideCheckbox: { control: 'boolean' },
    error: { control: 'boolean' },
    retrying: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AgendaTaskList },
  template: '<div style="max-width: 420px; padding: 12px;"><AgendaTaskList v-bind="$props" @complete-goal-item="onEvent(\'complete-goal-item\', $event)" @edit-goal-item="onEvent(\'edit-goal-item\', $event)" @delete-goal-item="onEvent(\'delete-goal-item\', $event)" @retry="onEvent(\'retry\')" /></div>',
  methods: {
    onEvent(name, payload) {
      console.log(name, payload);
    },
  },
});

const groups = [
  {
    taskId: 'task-office',
    taskName: 'Start office work',
    goals: [
      {
        id: 'goal-1',
        period: 'day',
        date: '25-10-2026',
        goalItems: [
          {
            id: 'gi-1', body: 'Ship the pricing page', taskRef: 'task-office', isComplete: false, isMilestone: false,
          },
          {
            id: 'gi-2', body: 'Email two beta users', taskRef: 'task-office', isComplete: true, isMilestone: false,
          },
        ],
      },
    ],
  },
  {
    taskId: 'task-jog',
    taskName: 'Jogging',
    goals: [
      {
        id: 'goal-2',
        period: 'day',
        date: '25-10-2026',
        goalItems: [
          {
            id: 'gi-3', body: 'Run 5 km', taskRef: 'task-jog', isComplete: false, isMilestone: true,
          },
        ],
      },
    ],
  },
];

export const Default = Template.bind({});
Default.args = { groups };

export const ReadOnlyCheckboxes = Template.bind({});
ReadOnlyCheckboxes.args = { groups, hideCheckbox: true };

export const Empty = Template.bind({});
Empty.args = { groups: [] };

export const Loading = Template.bind({});
Loading.args = { groups: [], loading: true };

export const LoadFailed = Template.bind({});
LoadFailed.args = { groups: [], error: true };
