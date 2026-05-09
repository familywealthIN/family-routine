import AtomTimelineItem from './TimelineItem.vue';

export default {
  title: 'Atoms/TimelineItem',
  component: AtomTimelineItem,
  argTypes: {
    color: { control: 'text' },
    fillDot: { control: 'boolean' },
    hideDot: { control: 'boolean' },
    small: { control: 'boolean' },
    large: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AtomTimelineItem },
  template: `
    <v-timeline>
      <atom-timeline-item v-bind="$props">
        Timeline event content
      </atom-timeline-item>
    </v-timeline>
  `,
});

export const Default = Template.bind({});
Default.args = {
  color: 'primary',
};

export const FillDot = Template.bind({});
FillDot.args = {
  fillDot: true,
  color: 'success',
};

export const WithIcon = () => ({
  components: { AtomTimelineItem },
  template: `
    <v-timeline>
      <atom-timeline-item fill-dot color="primary">
        <template #icon>
          <v-icon class="white--text">check</v-icon>
        </template>
        Event with custom icon
      </atom-timeline-item>
    </v-timeline>
  `,
});

export const HiddenDot = Template.bind({});
HiddenDot.args = {
  hideDot: true,
};
