import AtomTimeline from './Timeline.vue';

export default {
  title: 'Atoms/Timeline',
  component: AtomTimeline,
  argTypes: {
    dense: { control: 'boolean' },
    clipped: { control: 'boolean' },
    alignTop: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AtomTimeline },
  template: `
    <atom-timeline v-bind="$props">
      <v-timeline-item>Event 1</v-timeline-item>
      <v-timeline-item>Event 2</v-timeline-item>
      <v-timeline-item>Event 3</v-timeline-item>
    </atom-timeline>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const Dense = Template.bind({});
Dense.args = {
  dense: true,
};

export const Clipped = Template.bind({});
Clipped.args = {
  clipped: true,
};
