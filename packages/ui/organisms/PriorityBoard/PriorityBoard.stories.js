import PriorityBoard from './PriorityBoard.vue';
import { QUADRANTS } from '../../constants/priority';

export default {
  title: 'Organisms/PriorityBoard',
  component: PriorityBoard,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    shell: { control: { type: 'select' }, options: ['phone', 'tablet', 'desktop'] },
    quadrants: { control: 'object' },
    triage: { control: 'object' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PriorityBoard },
  template: '<div style="padding: 12px;"><PriorityBoard v-bind="$props" @assign="onEvent(\'assign\', $event)" @skip="onEvent(\'skip\', $event)" @toggle="onEvent(\'toggle\', $event)" @open="onEvent(\'open\', $event)" @action="onEvent(\'action\', $event)" /></div>',
  methods: {
    onEvent(name, payload) {
      console.log(name, payload);
    },
  },
});

const row = (id, body, over) => ({
  id, body, isComplete: false, meta: '', ...over,
});

// Same shape utils/priorityBoard.buildPriorityBoard returns for `quadrants`.
const build = (rowsByKey) => QUADRANTS.map((q) => {
  const groups = rowsByKey[q.key] || [];
  const rows = groups.reduce((all, g) => all.concat(g.rows), []);
  const done = rows.filter((r) => r.isComplete).length;
  return {
    ...q,
    total: rows.length,
    done,
    open: rows.length - done,
    pct: rows.length ? Math.round((done / rows.length) * 100) : 0,
    groups,
  };
});

const filled = build({
  do: [
    {
      key: 'office',
      time: '08:30',
      name: 'Start office work',
      isNow: true,
      rows: [
        row('d1', 'Ship the pricing page', { quadrant: 'do', meta: '↑ Launch the website · 1/2 subtasks' }),
        row('d2', 'Email two beta users', { quadrant: 'do', isComplete: true }),
      ],
    },
    {
      key: 'none',
      time: '—',
      name: 'No routine',
      isNow: false,
      rows: [row('d3', 'Renew the domain', { quadrant: 'do' })],
    },
  ],
  plan: [
    {
      key: 'deep',
      time: '09:00',
      name: 'Deep Work',
      isNow: false,
      rows: [
        row('p1', 'Outline the onboarding flow', { quadrant: 'plan' }),
        row('p2', 'Plan the Q4 roadmap', { quadrant: 'plan', meta: '↑ Launch the website' }),
      ],
    },
  ],
  delegate: [
    {
      key: 'deep',
      time: '09:00',
      name: 'Deep Work',
      isNow: false,
      rows: [
        row('g1', 'Summarise beta feedback', { quadrant: 'delegate', agentState: 'ready' }),
        row('g2', 'Draft the changelog', { quadrant: 'delegate', agentState: 'running' }),
      ],
    },
  ],
  automate: [
    {
      key: 'family',
      time: '21:00',
      name: 'Family time',
      isNow: false,
      rows: [
        row('a1', 'Back up the photos', { quadrant: 'automate' }),
        row('a2', 'Pay the electricity bill', { quadrant: 'automate', automated: true }),
      ],
    },
  ],
});

const triage = [
  { id: 't1', body: 'Call the dentist', meta: '' },
  { id: 't2', body: 'Review the pull requests', meta: '↑ Launch the website' },
  { id: 't3', body: 'Book flights for the offsite', meta: '' },
];

export const Phone = Template.bind({});
Phone.args = {
  shell: 'phone',
  quadrants: filled,
  triage,
};

export const PhoneInboxClear = Template.bind({});
PhoneInboxClear.args = {
  shell: 'phone',
  quadrants: filled,
  triage: [],
};

export const Tablet = Template.bind({});
Tablet.args = {
  shell: 'tablet',
  quadrants: filled,
  triage,
};

export const DesktopInboxClear = Template.bind({});
DesktopInboxClear.args = {
  shell: 'desktop',
  quadrants: filled,
  triage: [],
};

export const Empty = Template.bind({});
Empty.args = {
  shell: 'phone',
  quadrants: build({}),
  triage: [],
};
