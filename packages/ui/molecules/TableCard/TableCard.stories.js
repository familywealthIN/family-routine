import TableCard from './TableCard.vue';

// TableCard takes one `details` object: a title, a headline value, and the
// name/score rows, sorted by score, highest first.
export default {
  title: 'Molecules/TableCard',
  component: TableCard,
  argTypes: {
    details: { control: 'object' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TableCard },
  template: '<div style="max-width: 420px;"><TableCard v-bind="$props" /></div>',
});

export const Default = Template.bind({});
Default.args = {
  details: {
    name: 'Routine scores',
    value: 'This week',
    values: [
      { name: 'Deep Work', value: 92 },
      { name: 'Jogging', value: 74 },
      { name: 'Start office work', value: 81 },
      { name: 'Read before bed', value: 58 },
    ],
  },
};

export const GroupMembers = Template.bind({});
GroupMembers.args = {
  details: {
    name: 'Group pulse',
    value: '4 members',
    values: [
      { name: 'Asha', value: 88 },
      { name: 'Ben', value: 63 },
      { name: 'Chloe', value: 95 },
      { name: 'Dev', value: 41 },
    ],
  },
};
