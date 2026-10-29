import Icon from './Icon.vue';

// AtomIcon draws the Material Icons ligature in its slot, the way the app
// uses it: <AtomIcon>close</AtomIcon>. `name` below is a story arg only.
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
  computed: {
    iconProps() {
      const { name, ...rest } = this.$props;
      return rest;
    },
  },
  template: '<Icon v-bind="iconProps">{{ name }}</Icon>',
});

export const Default = Template.bind({});
Default.args = {
  name: 'home',
};

export const Colored = Template.bind({});
Colored.args = {
  name: 'favorite',
  color: 'error',
};

export const Small = Template.bind({});
Small.args = {
  name: 'star',
  small: true,
};

export const Large = Template.bind({});
Large.args = {
  name: 'star',
  large: true,
};

export const XLarge = Template.bind({});
XLarge.args = {
  name: 'star',
  xLarge: true,
};

export const CustomSize = Template.bind({});
CustomSize.args = {
  name: 'person',
  size: 48,
};

export const CommonIcons = () => ({
  components: { Icon },
  template: `
    <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
      <Icon>home</Icon>
      <Icon>person</Icon>
      <Icon>settings</Icon>
      <Icon>notifications</Icon>
      <Icon>favorite</Icon>
      <Icon>star</Icon>
      <Icon>check</Icon>
      <Icon>close</Icon>
      <Icon>add</Icon>
      <Icon>remove</Icon>
      <Icon>edit</Icon>
      <Icon>delete</Icon>
      <Icon>search</Icon>
      <Icon>menu</Icon>
      <Icon>chevron_left</Icon>
      <Icon>chevron_right</Icon>
    </div>
  `,
});

export const Colors = () => ({
  components: { Icon },
  template: `
    <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
      <Icon color="primary">lens</Icon>
      <Icon color="secondary">lens</Icon>
      <Icon color="success">lens</Icon>
      <Icon color="error">lens</Icon>
      <Icon color="warning">lens</Icon>
      <Icon color="info">lens</Icon>
      <Icon color="accent">lens</Icon>
    </div>
  `,
});
