import ListTileSubTitle from './ListTileSubTitle.vue';

export default {
  title: 'Atoms/ListTileSubTitle',
  component: ListTileSubTitle,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ListTileSubTitle },
  template: `
    <v-list>
      <v-list-tile>
        <v-list-tile-content>
          <v-list-tile-title>Main Title</v-list-tile-title>
          <ListTileSubTitle v-bind="$props">{{ subtitle }}</ListTileSubTitle>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  `,
});

export const Default = Template.bind({});
Default.args = {
  subtitle: 'This is a subtitle description',
};

export const TimeInfo = () => ({
  components: { ListTileSubTitle },
  template: `
    <v-list two-line>
      <v-list-tile>
        <v-list-tile-content>
          <v-list-tile-title>Morning Meditation</v-list-tile-title>
          <ListTileSubTitle>6:00 AM - 6:30 AM • Daily</ListTileSubTitle>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  `,
});

export const WithMetadata = () => ({
  components: { ListTileSubTitle },
  template: `
    <v-list two-line>
      <v-list-tile>
        <v-list-tile-content>
          <v-list-tile-title>Project Documentation</v-list-tile-title>
          <ListTileSubTitle>
            <span class="primary--text">In Progress</span> • Due in 3 days
          </ListTileSubTitle>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  `,
});

export const LongDescription = () => ({
  components: { ListTileSubTitle },
  template: `
    <v-list three-line>
      <v-list-tile>
        <v-list-tile-content>
          <v-list-tile-title>Weekly Goal Review</v-list-tile-title>
          <ListTileSubTitle>
            Review all weekly goals and assess progress. Update any goals that need adjustments and plan for the upcoming week.
          </ListTileSubTitle>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  `,
});
