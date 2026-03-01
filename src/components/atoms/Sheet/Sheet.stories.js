import AtomSheet from './Sheet.vue';

export default {
  title: 'Atoms/Sheet',
  component: AtomSheet,
  argTypes: {
    color: { control: 'text' },
    elevation: { control: 'number' },
    tile: { control: 'boolean' },
    dark: { control: 'boolean' },
    light: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AtomSheet },
  template: '<atom-sheet v-bind="$props" class="pa-3">Sheet Content</atom-sheet>',
});

export const Default = Template.bind({});
Default.args = {};

export const Elevated = Template.bind({});
Elevated.args = {
  elevation: 4,
};

export const Colored = Template.bind({});
Colored.args = {
  color: 'grey lighten-3',
};

export const Dark = Template.bind({});
Dark.args = {
  dark: true,
  color: 'primary',
};

export const Tile = Template.bind({});
Tile.args = {
  tile: true,
  elevation: 2,
};
