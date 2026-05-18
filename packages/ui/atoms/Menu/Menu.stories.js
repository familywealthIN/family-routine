import Menu from './Menu.vue';

export default {
  title: 'Atoms/Menu',
  component: Menu,
  argTypes: {
    bottom: { control: 'boolean' },
    left: { control: 'boolean' },
    right: { control: 'boolean' },
    top: { control: 'boolean' },
    offsetX: { control: 'boolean' },
    offsetY: { control: 'boolean' },
    openOnHover: { control: 'boolean' },
    closeOnContentClick: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Menu },
  template: `
    <div style="padding: 100px;">
      <Menu v-bind="$props">
        <template v-slot:activator="{ on }">
          <v-btn v-on="on" color="primary">
            Open Menu
          </v-btn>
        </template>
        <v-list>
          <v-list-tile @click="() => {}">
            <v-list-tile-title>Option 1</v-list-tile-title>
          </v-list-tile>
          <v-list-tile @click="() => {}">
            <v-list-tile-title>Option 2</v-list-tile-title>
          </v-list-tile>
          <v-list-tile @click="() => {}">
            <v-list-tile-title>Option 3</v-list-tile-title>
          </v-list-tile>
        </v-list>
      </Menu>
    </div>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const OffsetY = Template.bind({});
OffsetY.args = {
  offsetY: true,
};

export const OpenOnHover = Template.bind({});
OpenOnHover.args = {
  openOnHover: true,
};

export const BottomRight = Template.bind({});
BottomRight.args = {
  bottom: true,
  right: true,
};
