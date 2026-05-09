import Button from './Button.vue';

export default {
  title: 'Atoms/Button',
  component: Button,
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'accent'],
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    outline: { control: 'boolean' },
    flat: { control: 'boolean' },
    round: { control: 'boolean' },
    block: { control: 'boolean' },
    small: { control: 'boolean' },
    large: { control: 'boolean' },
    depressed: { control: 'boolean' },
    fab: { control: 'boolean' },
    icon: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Button },
  template: '<Button v-bind="$props">{{ label }}</Button>',
});

export const Default = Template.bind({});
Default.args = {
  label: 'Button',
  color: 'primary',
};

export const Outline = Template.bind({});
Outline.args = {
  label: 'Outline Button',
  color: 'primary',
  outline: true,
};

export const Flat = Template.bind({});
Flat.args = {
  label: 'Flat Button',
  color: 'primary',
  flat: true,
};

export const Loading = Template.bind({});
Loading.args = {
  label: 'Loading',
  color: 'primary',
  loading: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'Disabled',
  color: 'primary',
  disabled: true,
};

export const Small = Template.bind({});
Small.args = {
  label: 'Small',
  color: 'primary',
  small: true,
};

export const Large = Template.bind({});
Large.args = {
  label: 'Large',
  color: 'primary',
  large: true,
};

export const Block = Template.bind({});
Block.args = {
  label: 'Block Button',
  color: 'primary',
  block: true,
};

export const Round = Template.bind({});
Round.args = {
  label: 'Round',
  color: 'primary',
  round: true,
};

export const Colors = () => ({
  components: { Button },
  template: `
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <Button color="primary">Primary</Button>
      <Button color="secondary">Secondary</Button>
      <Button color="success">Success</Button>
      <Button color="error">Error</Button>
      <Button color="warning">Warning</Button>
      <Button color="info">Info</Button>
      <Button color="accent">Accent</Button>
    </div>
  `,
});
