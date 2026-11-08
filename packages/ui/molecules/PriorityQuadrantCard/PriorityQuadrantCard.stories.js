import PriorityQuadrantCard from './PriorityQuadrantCard.vue';
import { QUADRANTS } from '../../constants/priority';

export default {
  title: 'Molecules/PriorityQuadrantCard',
  component: PriorityQuadrantCard,
  argTypes: {
    quadrant: { control: 'object' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PriorityQuadrantCard },
  template: '<div style="width: 360px; height: 420px; display: flex; flex-direction: column;"><PriorityQuadrantCard v-bind="$props" /></div>',
});

const byKey = (key) => QUADRANTS.find((q) => q.key === key);
const row = (body, over) => ({
  id: body, body, isComplete: false, meta: '', ...over,
});

export const Do = Template.bind({});
Do.args = {
  quadrant: {
    ...byKey('do'),
    open: 2,
    done: 1,
    total: 3,
    pct: 33,
    groups: [
      {
        key: 'office',
        time: '08:30',
        name: 'Start office work',
        isNow: true,
        rows: [
          row('Ship the pricing page', { quadrant: 'do', meta: '↑ Launch the website · 1/2 subtasks' }),
          row('Email two beta users', { quadrant: 'do', isComplete: true }),
        ],
      },
      {
        key: 'none',
        time: '—',
        name: 'No routine',
        isNow: false,
        rows: [row('Renew the domain', { quadrant: 'do' })],
      },
    ],
  },
};

export const Delegate = Template.bind({});
Delegate.args = {
  quadrant: {
    ...byKey('delegate'),
    open: 3,
    done: 0,
    total: 3,
    pct: 0,
    groups: [
      {
        key: 'deep',
        time: '09:00',
        name: 'Deep Work',
        isNow: false,
        rows: [
          row('Summarise beta feedback', { quadrant: 'delegate', agentState: 'ready', taskRef: 'deep' }),
          row('Draft the changelog', { quadrant: 'delegate', agentState: 'running', taskRef: 'deep' }),
          row('Collect screenshots', { quadrant: 'delegate', agentState: 'done', taskRef: 'deep' }),
        ],
      },
    ],
  },
};

export const Empty = Template.bind({});
Empty.args = {
  quadrant: {
    ...byKey('automate'),
    open: 0,
    done: 0,
    total: 0,
    pct: 0,
    groups: [],
  },
};
