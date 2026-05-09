import Toolbar from './Toolbar.vue';

export default {
  title: 'Atoms/Toolbar',
  component: Toolbar,
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'info', 'success', 'warning', 'error', undefined],
    },
    dark: { control: 'boolean' },
    dense: { control: 'boolean' },
    flat: { control: 'boolean' },
    prominent: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Toolbar },
  template: `
    <Toolbar v-bind="$props">
      <v-toolbar-side-icon></v-toolbar-side-icon>
      <v-toolbar-title>Toolbar Title</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon>
        <v-icon>search</v-icon>
      </v-btn>
      <v-btn icon>
        <v-icon>more_vert</v-icon>
      </v-btn>
    </Toolbar>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const Primary = Template.bind({});
Primary.args = {
  color: 'primary',
  dark: true,
};

export const Dense = Template.bind({});
Dense.args = {
  dense: true,
};

export const Flat = Template.bind({});
Flat.args = {
  flat: true,
};

export const Prominent = Template.bind({});
Prominent.args = {
  color: 'primary',
  dark: true,
  prominent: true,
};
