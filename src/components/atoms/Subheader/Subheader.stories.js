import Subheader from './Subheader.vue';

export default {
  title: 'Atoms/Subheader',
  component: Subheader,
  argTypes: {
    inset: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Subheader },
  template: '<Subheader v-bind="$props">{{ text }}</Subheader>',
});

export const Default = Template.bind({});
Default.args = {
  text: 'Section Header',
};

export const Inset = Template.bind({});
Inset.args = {
  text: 'Inset Subheader',
  inset: true,
};

export const InList = () => ({
  components: { Subheader },
  template: `
    <v-list>
      <Subheader>Today's Tasks</Subheader>
      <v-list-tile>
        <v-list-tile-content>
          <v-list-tile-title>Task 1</v-list-tile-title>
        </v-list-tile-content>
      </v-list-tile>
      <v-list-tile>
        <v-list-tile-content>
          <v-list-tile-title>Task 2</v-list-tile-title>
        </v-list-tile-content>
      </v-list-tile>
      <Subheader>Tomorrow's Tasks</Subheader>
      <v-list-tile>
        <v-list-tile-content>
          <v-list-tile-title>Task 3</v-list-tile-title>
        </v-list-tile-content>
      </v-list-tile>
    </v-list>
  `,
});
