import AgentEditModal from './AgentEditModal.vue';

const ROUTINE_OPTIONS = [
  { label: '09:00 — Start Work', value: 'r1' },
  { label: '12:30 — Lunch Walk', value: 'r2' },
  { label: '18:00 — Review', value: 'r3' },
];

export default {
  title: 'Organisms/AgentEditModal',
  component: AgentEditModal,
  argTypes: {
    agent: { control: 'object' },
    prefilledTaskRef: { control: 'text' },
    routineOptions: { control: 'object' },
    hideTaskRefSelect: { control: 'boolean' },
  },
};

// The dialog hydrates its form when `value` flips to true, so the stories mount it
// closed and open it on the next tick, the way the page does. `$agent` is only
// touched on Save, so nothing here needs it stubbed.
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AgentEditModal },
  template: '<AgentEditModal v-bind="$props" :value="open" @input="open = $event" />',
  data() {
    return { open: false };
  },
  mounted() {
    this.$nextTick(() => { this.open = true; });
  },
});

export const BuildAgent = Template.bind({});
BuildAgent.args = {
  agent: null,
  routineOptions: ROUTINE_OPTIONS,
  prefilledTaskRef: 'r1',
};

export const EditAgent = Template.bind({});
EditAgent.args = {
  agent: {
    id: 'a1',
    name: 'PR Summarizer',
    taskRef: 'r1',
    startEvent: { kind: 'url', value: 'https://hooks.example.com/pr-summary/start?goal={{ goal_id }}' },
    endEvent: { kind: 'curl', value: 'curl -X POST https://hooks.example.com/pr-summary/end' },
  },
  routineOptions: ROUTINE_OPTIONS,
};

export const FreshForm = Template.bind({});
FreshForm.args = {
  agent: null,
  routineOptions: ROUTINE_OPTIONS,
};
