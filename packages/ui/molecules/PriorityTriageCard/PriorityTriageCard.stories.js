import PriorityTriageCard from './PriorityTriageCard.vue';
import { QUADRANTS } from '../../constants/priority';

export default {
  title: 'Molecules/PriorityTriageCard',
  component: PriorityTriageCard,
  argTypes: {
    item: { control: 'object' },
    count: { control: 'number' },
    quadrants: { control: 'object' },
    shell: { control: { type: 'select' }, options: ['phone', 'tablet', 'desktop'] },
    seq: { control: 'number' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PriorityTriageCard },
  template: '<div style="padding: 16px; max-width: 560px;"><PriorityTriageCard v-bind="$props" @assign="onAssign" @skip="onSkip" /></div>',
  methods: {
    onAssign(payload) {
      console.log('assign', payload);
    },
    onSkip(item) {
      console.log('skip', item);
    },
  },
});

export const Phone = Template.bind({});
Phone.args = {
  item: { id: 'g1', body: 'Ship the pricing page', meta: '↑ Launch the website · 1/2 subtasks' },
  count: 3,
  quadrants: QUADRANTS,
  shell: 'phone',
};

export const LastItem = Template.bind({});
LastItem.args = {
  item: { id: 'g2', body: 'Email two beta users', meta: '' },
  count: 1,
  quadrants: QUADRANTS,
  shell: 'phone',
};

export const Desktop = Template.bind({});
Desktop.args = {
  item: { id: 'g3', body: 'Summarise beta feedback', meta: '↑ Close the beta loop' },
  count: 5,
  quadrants: QUADRANTS,
  shell: 'desktop',
};
