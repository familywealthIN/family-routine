import ListTileActionText from './ListTileActionText.vue';

export default {
  title: 'Atoms/ListTileActionText',
  component: ListTileActionText,
};

export const Default = () => ({
  components: { ListTileActionText },
  template: `
    <v-list>
      <v-list-tile>
        <v-list-tile-content>
          <v-list-tile-title>List Item</v-list-tile-title>
        </v-list-tile-content>
        <v-list-tile-action>
          <ListTileActionText>Action Text</ListTileActionText>
        </v-list-tile-action>
      </v-list-tile>
    </v-list>
  `,
});

export const Multiple = () => ({
  components: { ListTileActionText },
  template: `
    <v-list>
      <v-list-tile>
        <v-list-tile-content>
          <v-list-tile-title>Task</v-list-tile-title>
        </v-list-tile-content>
        <v-list-tile-action>
          <ListTileActionText><b>5</b>/10</ListTileActionText>
          <ListTileActionText>tasks</ListTileActionText>
        </v-list-tile-action>
      </v-list-tile>
    </v-list>
  `,
});
