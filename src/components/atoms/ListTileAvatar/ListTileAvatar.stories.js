import ListTileAvatar from './ListTileAvatar.vue';

export default {
  title: 'Atoms/ListTileAvatar',
  component: ListTileAvatar,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ListTileAvatar },
  template: `
    <v-list>
      <v-list-tile>
        <ListTileAvatar v-bind="$props">
          <v-icon>person</v-icon>
        </ListTileAvatar>
        <v-list-tile-content>
          <v-list-tile-title>User Name</v-list-tile-title>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const WithImage = () => ({
  components: { ListTileAvatar },
  template: `
    <v-list>
      <v-list-tile>
        <ListTileAvatar>
          <v-avatar color="primary">
            <span class="white--text headline">JD</span>
          </v-avatar>
        </ListTileAvatar>
        <v-list-tile-content>
          <v-list-tile-title>John Doe</v-list-tile-title>
          <v-list-tile-sub-title>john@example.com</v-list-tile-sub-title>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  `,
});

export const WithColoredIcon = () => ({
  components: { ListTileAvatar },
  template: `
    <v-list>
      <v-list-tile>
        <ListTileAvatar>
          <v-avatar color="success" size="40">
            <v-icon dark>check</v-icon>
          </v-avatar>
        </ListTileAvatar>
        <v-list-tile-content>
          <v-list-tile-title>Task Completed</v-list-tile-title>
          <v-list-tile-sub-title>Morning routine finished</v-list-tile-sub-title>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  `,
});

export const MultipleFamilyMembers = () => ({
  components: { ListTileAvatar },
  template: `
    <v-list two-line>
      <v-list-tile>
        <ListTileAvatar>
          <v-avatar color="blue">
            <span class="white--text">D</span>
          </v-avatar>
        </ListTileAvatar>
        <v-list-tile-content>
          <v-list-tile-title>Dad</v-list-tile-title>
          <v-list-tile-sub-title>5 tasks today</v-list-tile-sub-title>
        </v-list-tile-content>
      </v-list-tile>
      <v-list-tile>
        <ListTileAvatar>
          <v-avatar color="pink">
            <span class="white--text">M</span>
          </v-avatar>
        </ListTileAvatar>
        <v-list-tile-content>
          <v-list-tile-title>Mom</v-list-tile-title>
          <v-list-tile-sub-title>3 tasks today</v-list-tile-sub-title>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  `,
});
