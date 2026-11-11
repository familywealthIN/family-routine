import AgentDetail from './AgentDetail.vue';

// A pinned clock: a status only counts for today's run, so every story reads the
// same on any date.
const NOW = '2026-10-25T12:00:00';

const agent = (over = {}) => ({
  id: 'a1',
  name: 'PR Summarizer',
  taskRef: 'r1',
  executionStatus: 'listening',
  successCount: 18,
  failureCount: 1,
  lastRunAt: '2026-10-25T09:02:00',
  lastResultType: 'json',
  lastResultBody: '{\n  "summary": "3 pull requests merged, 1 awaiting review",\n  "repo": "example/routine-notes",\n  "goalItem": "Start Work"\n}',
  lastError: '',
  startEvent: { kind: 'url', value: 'https://hooks.example.com/pr-summary/start?goal={{ goal_id }}' },
  endEvent: { kind: 'curl', value: 'curl -X POST https://hooks.example.com/pr-summary/end -d \'{"goal":"{{ goal_id }}"}\'' },
  ...over,
});

export default {
  title: 'Organisms/AgentDetail',
  component: AgentDetail,
  argTypes: {
    agent: { control: 'object' },
    routineTime: { control: 'text' },
    routineName: { control: 'text' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    testing: { control: 'boolean' },
    canRunTest: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AgentDetail },
  template: '<div :style="{ maxWidth: shell === \'phone\' ? \'412px\' : \'640px\' }"><AgentDetail v-bind="$props" :now="clock" /></div>',
  data() {
    return { clock: NOW };
  },
});

const base = { routineTime: '09:00', routineName: 'Start Work', shell: 'phone' };

export const NothingSelected = Template.bind({});
NothingSelected.args = { ...base, agent: null };

export const Idle = Template.bind({});
Idle.args = {
  ...base,
  agent: agent({
    executionStatus: 'idle', lastRunAt: null, lastResultType: '', lastResultBody: '', successCount: 0, failureCount: 0,
  }),
};

export const Running = Template.bind({});
Running.args = {
  ...base,
  agent: agent({ executionStatus: 'running' }),
};

export const Listening = Template.bind({});
Listening.args = {
  ...base,
  agent: agent({ executionStatus: 'listening' }),
};

export const Finished = Template.bind({});
Finished.args = {
  ...base,
  agent: agent({ executionStatus: 'finished', successCount: 19 }),
};

export const FinishedHtmlTranscript = Template.bind({});
FinishedHtmlTranscript.args = {
  ...base,
  agent: agent({ executionStatus: 'finished', lastResultType: 'html', lastResultBody: '<h1>Run transcript</h1>' }),
};

export const Failed = Template.bind({});
Failed.args = {
  ...base,
  agent: agent({
    executionStatus: 'failed',
    failureCount: 4,
    lastResultType: '',
    lastResultBody: '',
    lastError: 'Start event returned 502 Bad Gateway from hooks.example.com',
    endEvent: null,
  }),
};

export const Stalled = Template.bind({});
Stalled.args = {
  ...base,
  agent: agent({ executionStatus: 'listening', stalled: true }),
};

export const DesktopPane = Template.bind({});
DesktopPane.args = {
  ...base,
  shell: 'desktop',
  canRunTest: true,
  agent: agent({ executionStatus: 'finished', successCount: 19 }),
};
