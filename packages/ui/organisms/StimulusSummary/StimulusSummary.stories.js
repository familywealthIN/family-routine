import StimulusSummary from './StimulusSummary.vue';

export default {
  title: 'Organisms/StimulusSummary',
  component: StimulusSummary,
  argTypes: {
    d: { control: { type: 'range', min: 0, max: 100 } },
    k: { control: { type: 'range', min: 0, max: 100 } },
    g: { control: { type: 'range', min: 0, max: 100 } },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { StimulusSummary },
  template: '<div style="width: 160px; padding: 16px;"><StimulusSummary v-bind="$props" /></div>',
});

export const Default = Template.bind({});
Default.args = { d: 80, k: 46, g: 64 };

export const Balanced = Template.bind({});
Balanced.args = { d: 100, k: 100, g: 100 };

export const Empty = Template.bind({});
Empty.args = { d: 0, k: 0, g: 0 };
