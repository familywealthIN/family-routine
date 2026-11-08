import AgentList from './AgentList.vue';

// The component judges "today" against `now`, so the clock is pinned and the
// stories never depend on the real date.
const NOW = '2026-10-25T12:00:00';

const agent = (over = {}) => ({
  id: 'a1',
  name: 'PR Summarizer',
  taskRef: 'r1',
  routineTime: '09:00',
  routineName: 'Start Work',
  executionStatus: 'listening',
  successCount: 18,
  failureCount: 1,
  lastRunAt: '2026-10-25T09:02:00',
  lastResultType: 'html',
  ...over,
});

// One agent per lifecycle stage the Agents page can show.
const MIXED = [
  agent(),
  agent({
    id: 'a2', name: 'Standup Poster', taskRef: 'r2', routineTime: '09:30', routineName: 'Standup', executionStatus: 'running', successCount: 42, failureCount: 3, lastResultType: 'json',
  }),
  agent({
    id: 'a3', name: 'Lunch Logger', taskRef: 'r3', routineTime: '12:30', routineName: 'Lunch Walk', executionStatus: 'finished', successCount: 30, failureCount: 0, lastRunAt: '2026-10-25T08:15:00', lastResultType: 'text',
  }),
  agent({
    id: 'a4', name: 'Backup Nightly', taskRef: 'r4', routineTime: '22:00', routineName: 'Wind Down', executionStatus: 'failed', successCount: 11, failureCount: 6, lastRunAt: '2026-10-25T07:40:00',
  }),
  agent({
    id: 'a5', name: 'Inbox Sweeper', taskRef: 'r5', routineTime: '08:00', routineName: 'Morning Reset', executionStatus: 'listening', stalled: true, successCount: 7, failureCount: 2, lastRunAt: '2026-10-25T08:05:00',
  }),
  agent({
    id: 'a6', name: 'Weekly Digest', taskRef: 'r6', routineTime: '18:00', routineName: 'Review', executionStatus: 'idle', successCount: 0, failureCount: 0, lastRunAt: null, lastResultType: '',
  }),
];

export default {
  title: 'Organisms/AgentList',
  component: AgentList,
  argTypes: {
    agents: { control: 'object' },
    selectedId: { control: 'text' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    loadError: { control: 'boolean' },
    retrying: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AgentList },
  template: '<div :style="{ maxWidth: shell === \'phone\' ? \'412px\' : \'520px\' }"><AgentList v-bind="$props" :now="clock" @select="onSelect" @retry="onRetry" /></div>',
  data() {
    return { clock: NOW };
  },
  methods: {
    onSelect(id) {
      console.log('select', id);
    },
    onRetry() {
      console.log('retry');
    },
  },
});

export const AllStages = Template.bind({});
AllStages.args = {
  agents: MIXED,
  selectedId: 'a1',
  shell: 'phone',
};

export const Running = Template.bind({});
Running.args = {
  agents: [MIXED[1], MIXED[0]],
  selectedId: 'a2',
  shell: 'phone',
};

export const Empty = Template.bind({});
Empty.args = {
  agents: [],
  shell: 'phone',
};

export const LoadError = Template.bind({});
LoadError.args = {
  agents: [],
  loadError: true,
  shell: 'phone',
};

export const TabletColumn = Template.bind({});
TabletColumn.args = {
  agents: MIXED,
  selectedId: 'a4',
  shell: 'tablet',
};
