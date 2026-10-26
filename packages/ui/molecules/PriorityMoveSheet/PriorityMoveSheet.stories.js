import PriorityMoveSheet from './PriorityMoveSheet.vue';
import { QUADRANTS } from '../../constants/priority';

export default {
  title: 'Molecules/PriorityMoveSheet',
  component: PriorityMoveSheet,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    open: { control: 'boolean' },
    shell: { control: { type: 'select' }, options: ['phone', 'tablet', 'desktop'] },
    item: { control: 'object' },
    quadrants: { control: 'object' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PriorityMoveSheet },
  template: '<PriorityMoveSheet v-bind="$props" @close="onClose" @assign="onAssign" />',
  methods: {
    onClose() {
      console.log('move sheet closed');
    },
    onAssign(payload) {
      console.log('assign', payload);
    },
  },
});

export const Phone = Template.bind({});
Phone.args = {
  open: true,
  shell: 'phone',
  item: { id: 'g1', body: 'Ship the pricing page', quadrant: 'plan' },
  quadrants: QUADRANTS,
};

export const Tablet = Template.bind({});
Tablet.args = {
  open: true,
  shell: 'tablet',
  item: { id: 'g2', body: 'Email two beta users', quadrant: 'delegate' },
  quadrants: QUADRANTS,
};

export const Desktop = Template.bind({});
Desktop.args = {
  open: true,
  shell: 'desktop',
  item: { id: 'g3', body: 'Run 5 km', quadrant: 'do' },
  quadrants: QUADRANTS,
};
