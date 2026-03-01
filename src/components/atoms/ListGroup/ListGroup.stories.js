import AtomListGroup from './ListGroup.vue';

export default {
  title: 'Atoms/ListGroup',
  component: AtomListGroup,
};

export const Default = () => ({
  components: { AtomListGroup },
  data() {
    return { active: true };
  },
  template: `
    <v-list>
      <atom-list-group v-model="active">
        <template v-slot:activator>
          <v-list-tile>
            <v-list-tile-content>
              <v-list-tile-title>Expandable Group</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
        </template>
        <v-list-tile>
          <v-list-tile-content>
            <v-list-tile-title>Nested Item 1</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
        <v-list-tile>
          <v-list-tile-content>
            <v-list-tile-title>Nested Item 2</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </atom-list-group>
    </v-list>
  `,
});
