import PriorityTaskList from './PriorityTaskList.vue';

export default {
  title: 'Molecules/PriorityTaskList',
  component: PriorityTaskList,
  argTypes: {
    groups: { control: 'object' },
    color: { control: 'color' },
    emptyText: { control: 'text' },
    seq: { control: 'number' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PriorityTaskList },
  template: '<div style="max-width: 420px; padding: 12px; background: #fff;"><PriorityTaskList v-bind="$props" /></div>',
});

const row = (body, over) => ({
  id: body, body, isComplete: false, meta: '', quadrant: 'do', ...over,
});

export const Do = Template.bind({});
Do.args = {
  color: '#F44336',
  groups: [
    {
      key: 'wake',
      time: '05:30',
      name: 'Wake up · brush · invest',
      isNow: false,
      rows: [row('Review the budget', { isComplete: true })],
    },
    {
      key: 'office',
      time: '08:30',
      name: 'Start office work',
      isNow: true,
      rows: [
        row('Ship the pricing page', { meta: '↑ Launch the website · 1/2 subtasks' }),
        row('Email two beta users'),
      ],
    },
    {
      key: 'none',
      time: '—',
      name: 'No routine',
      isNow: false,
      rows: [row('Renew the domain')],
    },
  ],
};

export const Delegate = Template.bind({});
Delegate.args = {
  color: '#E68900',
  groups: [
    {
      key: 'deep',
      time: '09:00',
      name: 'Deep Work',
      isNow: false,
      rows: [
        row('Summarise beta feedback', { quadrant: 'delegate', agentState: 'ready' }),
        row('Draft the changelog', { quadrant: 'delegate', agentState: 'running' }),
        row('Collect screenshots', { quadrant: 'delegate', agentState: 'done' }),
      ],
    },
  ],
};

export const Automate = Template.bind({});
Automate.args = {
  color: '#616161',
  groups: [
    {
      key: 'family',
      time: '21:00',
      name: 'Family time',
      isNow: false,
      rows: [
        row('Back up the photos', { quadrant: 'automate' }),
        row('Pay the electricity bill', { quadrant: 'automate', automated: true, rule: 'every day' }),
        row('Water the plants', { quadrant: 'automate', isComplete: true }),
      ],
    },
  ],
};

export const Empty = Template.bind({});
Empty.args = {
  color: '#1976D2',
  groups: [],
  emptyText: 'Nothing here. Triage something in.',
};
