import AtomSparkline from './Sparkline.vue';

export default {
  title: 'Atoms/Sparkline',
  component: AtomSparkline,
  argTypes: {
    smooth: { control: 'boolean' },
    lineWidth: { control: 'number' },
    autoDraw: { control: 'boolean' },
    strokeLinecap: {
      control: { type: 'select' },
      options: ['butt', 'round', 'square'],
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AtomSparkline },
  template: `
    <atom-sparkline 
      v-bind="$props"
      :value="[0, 2, 5, 9, 5, 10, 3, 5, 0, 0, 1, 8, 2, 9, 0]"
      :gradient="['#f72047', '#ffd200', '#1feaea']"
    />
  `,
});

export const Default = Template.bind({});
Default.args = {
  smooth: true,
  lineWidth: 3,
  autoDraw: true,
  strokeLinecap: 'round',
};

export const Flat = Template.bind({});
Flat.args = {
  smooth: false,
  lineWidth: 2,
};
