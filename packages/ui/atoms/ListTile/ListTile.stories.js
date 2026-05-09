import ListTile from './ListTile.vue';

export default {
  title: 'Atoms/ListTile',
  component: ListTile,
  argTypes: {
    avatar: { control: 'boolean' },
    inactive: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ListTile },
  template: `
    <v-card style="max-width: 400px;">
      <v-list>
        <ListTile v-bind="$props" @click="onClick">
          <v-list-tile-avatar v-if="avatar">
            <v-icon>person</v-icon>
          </v-list-tile-avatar>
          <v-list-tile-content>
            <v-list-tile-title>List Item Title</v-list-tile-title>
            <v-list-tile-sub-title>Subtitle text</v-list-tile-sub-title>
          </v-list-tile-content>
          <v-list-tile-action>
            <v-icon>chevron_right</v-icon>
          </v-list-tile-action>
        </ListTile>
      </v-list>
    </v-card>
  `,
  methods: {
    onClick() {
      console.log('Tile clicked');
    },
  },
});

export const Default = Template.bind({});
Default.args = {};

export const WithAvatar = Template.bind({});
WithAvatar.args = {
  avatar: true,
};

export const Inactive = Template.bind({});
Inactive.args = {
  inactive: true,
};
