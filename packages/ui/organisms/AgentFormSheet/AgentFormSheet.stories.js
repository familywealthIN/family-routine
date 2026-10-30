import AgentFormSheet from './AgentFormSheet.vue';

// Routines that do not have an agent yet (the container filters the rest out).
const ROUTINES = [
  {
    value: 'r1', time: '09:00', name: 'Start Work', label: '09:00 — Start Work',
  },
  {
    value: 'r2', time: '12:30', name: 'Lunch Walk', label: '12:30 — Lunch Walk',
  },
  {
    value: 'r3', time: '18:00', name: 'Review', label: '18:00 — Review',
  },
];

const EDITING = {
  id: 'a1',
  name: 'PR Summarizer',
  taskRef: 'r1',
  routineName: 'Start Work',
  routineTime: '09:00',
  startEvent: { kind: 'url', value: 'https://hooks.example.com/pr-summary/start?goal={{ goal_id }}' },
  endEvent: { kind: 'curl', value: 'curl -X POST https://hooks.example.com/pr-summary/end -d \'{"goal":"{{ goal_id }}"}\'' },
};

export default {
  title: 'Organisms/AgentFormSheet',
  component: AgentFormSheet,
  argTypes: {
    open: { control: 'boolean' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    agent: { control: 'object' },
    routineOptions: { control: 'object' },
    prefillTaskRef: { control: 'text' },
    errorMessage: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AgentFormSheet },
  template: '<AgentFormSheet v-bind="$props" @save="onSave" @close="onClose" @delete="onDelete" />',
  methods: {
    onSave(payload) {
      console.log('save', payload);
    },
    onClose() {
      console.log('close');
    },
    onDelete(id) {
      console.log('delete', id);
    },
  },
});

export const NewAgent = Template.bind({});
NewAgent.args = {
  open: true,
  shell: 'phone',
  agent: null,
  routineOptions: ROUTINES,
};

export const EditAgent = Template.bind({});
EditAgent.args = {
  open: true,
  shell: 'phone',
  agent: EDITING,
  routineOptions: [],
};

export const SaveFailed = Template.bind({});
SaveFailed.args = {
  open: true,
  shell: 'phone',
  agent: EDITING,
  routineOptions: [],
  errorMessage: 'Could not save the agent. Check your connection and try again.',
};

export const NoFreeRoutines = Template.bind({});
NoFreeRoutines.args = {
  open: true,
  shell: 'phone',
  agent: null,
  routineOptions: [],
};

export const TabletDialog = Template.bind({});
TabletDialog.args = {
  open: true,
  shell: 'tablet',
  agent: null,
  routineOptions: ROUTINES,
  prefillTaskRef: 'r2',
};
