import ListTileContent from './ListTileContent.vue';

export default {
  title: 'Atoms/ListTileContent',
  component: ListTileContent,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ListTileContent },
  template: `
    <v-list>
      <v-list-tile>
        <ListTileContent v-bind="$props">
          <v-list-tile-title>Main Content</v-list-tile-title>
        </ListTileContent>
      </v-list-tile>
    </v-list>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const WithTitleAndSubtitle = () => ({
  components: { ListTileContent },
  template: `
    <v-list two-line>
      <v-list-tile>
        <ListTileContent>
          <v-list-tile-title>Morning Exercise</v-list-tile-title>
          <v-list-tile-sub-title>6:00 AM - 7:00 AM</v-list-tile-sub-title>
        </ListTileContent>
      </v-list-tile>
    </v-list>
  `,
});

export const WithMultipleLines = () => ({
  components: { ListTileContent },
  template: `
    <v-list three-line>
      <v-list-tile>
        <ListTileContent>
          <v-list-tile-title>Weekly Goal Review</v-list-tile-title>
          <v-list-tile-sub-title>
            Review your weekly goals and track progress. Make adjustments as needed based on your accomplishments.
          </v-list-tile-sub-title>
        </ListTileContent>
      </v-list-tile>
    </v-list>
  `,
});

export const GoalList = () => ({
  components: { ListTileContent },
  template: `
    <v-list two-line>
      <v-list-tile v-for="i in 3" :key="i">
        <v-list-tile-avatar>
          <v-icon>flag</v-icon>
        </v-list-tile-avatar>
        <ListTileContent>
          <v-list-tile-title>Goal {{ i }}: Complete Project</v-list-tile-title>
          <v-list-tile-sub-title>Due: Next week • Progress: {{ i * 25 }}%</v-list-tile-sub-title>
        </ListTileContent>
        <v-list-tile-action>
          <v-chip small :color="i === 3 ? 'success' : 'warning'">
            {{ i === 3 ? 'On Track' : 'In Progress' }}
          </v-chip>
        </v-list-tile-action>
      </v-list-tile>
    </v-list>
  `,
});
