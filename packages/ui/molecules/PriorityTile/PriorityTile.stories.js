import PriorityTile from './PriorityTile.vue';
import { QUADRANTS } from '../../constants/priority';

export default {
  title: 'Molecules/PriorityTile',
  component: PriorityTile,
  argTypes: {
    quadrant: { control: 'object' },
    selected: { control: 'boolean' },
    bumping: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PriorityTile },
  template: '<div style="width: 170px;"><PriorityTile v-bind="$props" @select="onSelect" /></div>',
  methods: {
    onSelect(key) {
      console.log('select', key);
    },
  },
});

const byKey = (key) => QUADRANTS.find((q) => q.key === key);

export const Do = Template.bind({});
Do.args = {
  quadrant: {
    ...byKey('do'), open: 3, done: 2, pct: 40,
  },
  selected: true,
};

export const Plan = Template.bind({});
Plan.args = {
  quadrant: {
    ...byKey('plan'), open: 5, done: 1, pct: 17,
  },
};

export const Delegate = Template.bind({});
Delegate.args = {
  quadrant: {
    ...byKey('delegate'), open: 2, done: 0, pct: 0,
  },
};

export const AutomateComplete = Template.bind({});
AutomateComplete.args = {
  quadrant: {
    ...byKey('automate'), open: 0, done: 4, pct: 100,
  },
  selected: true,
};
