import ListTileTitle from './ListTileTitle.vue';

export default {
  title: 'Atoms/ListTileTitle',
  component: ListTileTitle,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ListTileTitle },
  template: `
    <v-list>
      <v-list-tile>
        <v-list-tile-content>
          <ListTileTitle v-bind="$props">{{ title }}</ListTileTitle>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  `,
});

export const Default = Template.bind({});
Default.args = {
  title: 'List Item Title',
};

export const TaskTitle = () => ({
  components: { ListTileTitle },
  template: `
    <v-list>
      <v-list-tile>
        <v-list-tile-action>
          <v-checkbox></v-checkbox>
        </v-list-tile-action>
        <v-list-tile-content>
          <ListTileTitle>Complete morning routine</ListTileTitle>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  `,
});

export const GoalTitle = () => ({
  components: { ListTileTitle },
  template: `
    <v-list>
      <v-list-tile>
        <v-list-tile-avatar>
          <v-icon color="primary">flag</v-icon>
        </v-list-tile-avatar>
        <v-list-tile-content>
          <ListTileTitle>Learn a new programming language</ListTileTitle>
          <v-list-tile-sub-title>Yearly Goal</v-list-tile-sub-title>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  `,
});

export const WithStatus = () => ({
  components: { ListTileTitle },
  template: `
    <v-list>
      <v-list-tile>
        <v-list-tile-content>
          <ListTileTitle>
            <span class="text-decoration-line-through grey--text">Completed Task</span>
          </ListTileTitle>
        </v-list-tile-content>
        <v-list-tile-action>
          <v-icon color="success">check_circle</v-icon>
        </v-list-tile-action>
      </v-list-tile>
      <v-list-tile>
        <v-list-tile-content>
          <ListTileTitle>
            <span class="font-weight-bold">Urgent Task</span>
          </ListTileTitle>
        </v-list-tile-content>
        <v-list-tile-action>
          <v-icon color="error">priority_high</v-icon>
        </v-list-tile-action>
      </v-list-tile>
    </v-list>
  `,
});
