import RoutineRankCard from './RoutineRankCard.vue';

export default {
  title: 'Molecules/RoutineRankCard',
  component: RoutineRankCard,
  argTypes: {
    title: { control: 'text' },
    variant: { control: { type: 'select' }, options: ['good', 'attention'] },
    rows: { control: 'object' },
    emptyText: { control: 'text' },
    scoreSuffix: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RoutineRankCard },
  template: '<div style="max-width: 400px; padding: 16px; background: #fff; border-radius: 16px;"><RoutineRankCard v-bind="$props" @open-routine="onOpen" /></div>',
  methods: {
    onOpen(id) {
      console.log('open-routine', id);
    },
  },
});

export const GreatGoing = Template.bind({});
GreatGoing.args = {
  title: 'Great going',
  variant: 'good',
  rows: [
    {
      id: 'r1', name: 'Wake up · brush · invest', score: 96, time: '05:30', pattern: [1, 1, 1, 1, 1, 1, 0],
    },
    {
      id: 'r2', name: 'Jogging', score: 90, time: '07:15', pattern: [1, 1, 0, 1, 1, 1, 1],
    },
    {
      id: 'r3', name: 'Family time', score: 84, time: '21:00', pattern: [1, 0, 1, 1, 1, 0, 1],
    },
  ],
};

export const NeedsAttention = Template.bind({});
NeedsAttention.args = {
  title: 'Needs attention',
  variant: 'attention',
  rows: [
    {
      id: 'r4', name: 'Workout', score: 31, time: '19:30', why: 'Missed 4 of the last 7 days',
    },
    {
      id: 'r5', name: 'Deep Work', score: 44, time: '09:00', why: 'Usually checked in late',
    },
    { id: 'r6', name: 'Start office work', score: 52 },
  ],
};

export const Empty = Template.bind({});
Empty.args = {
  title: 'Needs attention',
  variant: 'attention',
  rows: [],
  emptyText: 'No routines scored yet.',
};
