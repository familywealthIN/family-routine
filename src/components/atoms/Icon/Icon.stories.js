import Icon from './Icon.vue';

export default {
  title: 'Atoms/Icon',
  component: Icon,
  argTypes: {
    name: {
      control: { type: 'text' },
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'accent', 'white', 'grey'],
    },
    size: {
      control: { type: 'number' },
    },
    small: { control: 'boolean' },
    medium: { control: 'boolean' },
    large: { control: 'boolean' },
    xLarge: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Icon },
  template: '<Icon v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  name: 'mdi-home',
};

export const Colored = Template.bind({});
Colored.args = {
  name: 'mdi-heart',
  color: 'error',
};

export const Small = Template.bind({});
Small.args = {
  name: 'mdi-star',
  small: true,
};

export const Large = Template.bind({});
Large.args = {
  name: 'mdi-star',
  large: true,
};

export const XLarge = Template.bind({});
XLarge.args = {
  name: 'mdi-star',
  xLarge: true,
};

export const CustomSize = Template.bind({});
CustomSize.args = {
  name: 'mdi-account',
  size: 48,
};

export const CommonIcons = () => ({
  components: { Icon },
  template: `
    <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
      <Icon name="mdi-home" />
      <Icon name="mdi-account" />
      <Icon name="mdi-cog" />
      <Icon name="mdi-bell" />
      <Icon name="mdi-heart" />
      <Icon name="mdi-star" />
      <Icon name="mdi-check" />
      <Icon name="mdi-close" />
      <Icon name="mdi-plus" />
      <Icon name="mdi-minus" />
      <Icon name="mdi-pencil" />
      <Icon name="mdi-delete" />
      <Icon name="mdi-magnify" />
      <Icon name="mdi-menu" />
      <Icon name="mdi-chevron-left" />
      <Icon name="mdi-chevron-right" />
    </div>
  `,
});

export const Colors = () => ({
  components: { Icon },
  template: `
    <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
      <Icon name="mdi-circle" color="primary" />
      <Icon name="mdi-circle" color="secondary" />
      <Icon name="mdi-circle" color="success" />
      <Icon name="mdi-circle" color="error" />
      <Icon name="mdi-circle" color="warning" />
      <Icon name="mdi-circle" color="info" />
      <Icon name="mdi-circle" color="accent" />
    </div>
  `,
});
