import Chip from './Chip.vue';

export default {
  title: 'Atoms/Chip',
  component: Chip,
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'accent'],
    },
    textColor: {
      control: { type: 'select' },
      options: ['white', 'black', 'primary', 'secondary'],
    },
    small: { control: 'boolean' },
    label: { control: 'boolean' },
    outline: { control: 'boolean' },
    selected: { control: 'boolean' },
    disabled: { control: 'boolean' },
    close: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Chip },
  template: '<Chip v-bind="$props">{{ text }}</Chip>',
});

export const Default = Template.bind({});
Default.args = {
  text: 'Chip',
  color: 'primary',
};

export const Small = Template.bind({});
Small.args = {
  text: 'Small Chip',
  color: 'primary',
  small: true,
};

export const Label = Template.bind({});
Label.args = {
  text: 'Label Chip',
  color: 'primary',
  label: true,
};

export const Outline = Template.bind({});
Outline.args = {
  text: 'Outline Chip',
  color: 'primary',
  outline: true,
};

export const Closable = Template.bind({});
Closable.args = {
  text: 'Closable',
  color: 'primary',
  close: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  text: 'Disabled',
  color: 'primary',
  disabled: true,
};

export const Colors = () => ({
  components: { Chip },
  template: `
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <Chip color="primary">Primary</Chip>
      <Chip color="secondary">Secondary</Chip>
      <Chip color="success">Success</Chip>
      <Chip color="error">Error</Chip>
      <Chip color="warning">Warning</Chip>
      <Chip color="info">Info</Chip>
      <Chip color="accent">Accent</Chip>
    </div>
  `,
});

export const OutlineColors = () => ({
  components: { Chip },
  template: `
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <Chip color="primary" outline>Primary</Chip>
      <Chip color="secondary" outline>Secondary</Chip>
      <Chip color="success" outline>Success</Chip>
      <Chip color="error" outline>Error</Chip>
      <Chip color="warning" outline>Warning</Chip>
      <Chip color="info" outline>Info</Chip>
    </div>
  `,
});
