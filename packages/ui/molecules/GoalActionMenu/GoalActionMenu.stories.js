import GoalActionMenu from './GoalActionMenu.vue';

export default {
  title: 'Molecules/GoalActionMenu',
  component: GoalActionMenu,
  argTypes: {
    title: { control: 'text' },
    items: { control: 'object' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalActionMenu },
  template: '<div style="width:360px;padding:8px 16px;background:#fff;border-radius:16px"><GoalActionMenu v-bind="$props" @select="onSelect" /></div>',
  methods: {
    onSelect(key) {
      console.log('goal action', key);
    },
  },
});

const FULL = [
  { key: 'edit', icon: 'edit', label: 'Edit goal' },
  { key: 'add', icon: 'add_circle_outline', label: 'Add a month goal under it' },
  { key: 'delete', icon: 'delete_outline', label: 'Delete goal', color: '#F44336' },
];

export const Default = Template.bind({});
Default.args = {
  title: 'Run a 10K in under 55 min',
  items: FULL,
};

export const LongTitle = Template.bind({});
LongTitle.args = {
  title: 'Google UX: complete courses 1–3 and publish the first case study to the portfolio',
  items: FULL,
};

export const EditAndDeleteOnly = Template.bind({});
EditAndDeleteOnly.args = {
  title: 'Ship the pricing page',
  items: [FULL[0], FULL[2]],
};
