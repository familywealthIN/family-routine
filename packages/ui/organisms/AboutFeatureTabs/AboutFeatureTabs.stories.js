import AboutFeatureTabs from './AboutFeatureTabs.vue';

export default {
  title: 'Organisms/AboutFeatureTabs',
  component: AboutFeatureTabs,
  argTypes: {
    features: { control: 'object' },
    value: { control: { type: 'select', options: ['', 'routines', 'goals', 'priority', 'agents', 'evolution'] } },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AboutFeatureTabs },
  template: '<div style="max-width: 412px"><AboutFeatureTabs v-bind="$props" @change="onChange" /></div>',
  methods: {
    onChange(key) {
      console.log('tab', key);
    },
  },
});

// Opens on the first of the shipped five tabs (constants/about.js ABOUT_FEATURES).
export const Default = Template.bind({});
Default.args = {};

export const GoalsTab = Template.bind({});
GoalsTab.args = {
  value: 'goals',
};

export const CustomTabs = Template.bind({});
CustomTabs.args = {
  features: [
    {
      key: 'one',
      label: 'Routines',
      icon: 'schedule',
      title: 'Your day, time-boxed',
      lead: 'Lay the day on a timeline and keep score on punctuality.',
      points: [
        { term: 'Punctuality window', text: 'tick inside the window and the check-in counts as on time.' },
        { text: 'A point with no term leads with an arrow instead of a tick.' },
      ],
      link: 'https://example.com/docs/routines',
      linkLabel: 'Read the routines guide',
    },
    {
      key: 'two',
      label: 'Goals',
      icon: 'assignment',
      title: 'The year to day cascade',
      lead: 'Turn one yearly ambition into month, week and day milestones.',
      points: [
        { term: 'Wins roll up', text: 'five day wins complete a week.' },
      ],
    },
  ],
};
