import ListTileAction from './ListTileAction.vue';

export default {
  title: 'Atoms/ListTileAction',
  component: ListTileAction,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ListTileAction },
  template: `
    <v-list>
      <v-list-tile>
        <v-list-tile-content>
          <v-list-tile-title>List Item</v-list-tile-title>
        </v-list-tile-content>
        <ListTileAction v-bind="$props">
          <v-icon>edit</v-icon>
        </ListTileAction>
      </v-list-tile>
    </v-list>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const WithCheckbox = () => ({
  components: { ListTileAction },
  data() {
    return { checked: false };
  },
  template: `
    <v-list>
      <v-list-tile @click="checked = !checked">
        <ListTileAction>
          <v-checkbox v-model="checked" color="primary"></v-checkbox>
        </ListTileAction>
        <v-list-tile-content>
          <v-list-tile-title>Complete morning routine</v-list-tile-title>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  `,
});

export const WithButton = () => ({
  components: { ListTileAction },
  template: `
    <v-list>
      <v-list-tile>
        <v-list-tile-content>
          <v-list-tile-title>Task item with actions</v-list-tile-title>
        </v-list-tile-content>
        <ListTileAction>
          <v-btn icon>
            <v-icon color="grey lighten-1">delete</v-icon>
          </v-btn>
        </ListTileAction>
      </v-list-tile>
    </v-list>
  `,
});

export const MultipleActions = () => ({
  components: { ListTileAction },
  template: `
    <v-list>
      <v-list-tile>
        <v-list-tile-content>
          <v-list-tile-title>Goal item</v-list-tile-title>
        </v-list-tile-content>
        <ListTileAction>
          <v-btn icon small>
            <v-icon small>edit</v-icon>
          </v-btn>
        </ListTileAction>
        <ListTileAction>
          <v-btn icon small>
            <v-icon small>delete</v-icon>
          </v-btn>
        </ListTileAction>
      </v-list-tile>
    </v-list>
  `,
});
