import GettingStartedCard from './GettingStartedCard.vue';

export default {
  title: 'Molecules/GettingStartedCard',
  component: GettingStartedCard,
  argTypes: {
    steps: { control: 'object' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GettingStartedCard },
  template: '<div style="max-width: 412px"><GettingStartedCard v-bind="$props" @navigate="onNavigate" /></div>',
  methods: {
    onNavigate(route) {
      console.log('navigate', route);
    },
  },
});

// The shipped three steps (constants/about.js GETTING_STARTED).
export const Default = Template.bind({});
Default.args = {};

export const TwoSteps = Template.bind({});
TwoSteps.args = {
  steps: [
    { key: 'routine', title: 'Build a morning routine', text: 'Give each block a start time so the day has a shape.', route: '/routines' },
    { key: 'agent', title: 'Attach an agent', text: 'Let a routine fire a webhook when you tick it.', route: '/agents' },
  ],
};
