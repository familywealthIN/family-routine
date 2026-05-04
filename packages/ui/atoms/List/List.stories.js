import List from './List.vue';

export default {
  title: 'Atoms/List',
  component: List,
  argTypes: {
    dense: { control: 'boolean' },
    subheader: { control: 'boolean' },
    twoLine: { control: 'boolean' },
    threeLine: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { List },
  template: `
    <v-card style="max-width: 400px;">
      <List v-bind="$props">
        <v-subheader v-if="subheader">List Subheader</v-subheader>
        <v-list-tile>
          <v-list-tile-content>
            <v-list-tile-title>Item 1</v-list-tile-title>
            <v-list-tile-sub-title v-if="twoLine || threeLine">Subtitle</v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
        <v-list-tile>
          <v-list-tile-content>
            <v-list-tile-title>Item 2</v-list-tile-title>
            <v-list-tile-sub-title v-if="twoLine || threeLine">Subtitle</v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
        <v-list-tile>
          <v-list-tile-content>
            <v-list-tile-title>Item 3</v-list-tile-title>
            <v-list-tile-sub-title v-if="twoLine || threeLine">Subtitle</v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
      </List>
    </v-card>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const Dense = Template.bind({});
Dense.args = {
  dense: true,
};

export const TwoLine = Template.bind({});
TwoLine.args = {
  twoLine: true,
};

export const WithSubheader = Template.bind({});
WithSubheader.args = {
  subheader: true,
};
