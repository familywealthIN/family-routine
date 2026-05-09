import CardActions from './CardActions.vue';

export default {
  title: 'Atoms/CardActions',
  component: CardActions,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { CardActions },
  template: `
    <v-card style="max-width: 400px;">
      <v-card-title>Card Title</v-card-title>
      <v-card-text>Card content goes here.</v-card-text>
      <CardActions v-bind="$props">
        <v-spacer></v-spacer>
        <v-btn flat color="primary">Cancel</v-btn>
        <v-btn color="primary">Save</v-btn>
      </CardActions>
    </v-card>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const LeftAligned = () => ({
  components: { CardActions },
  template: `
    <v-card style="max-width: 400px;">
      <v-card-title>Card Title</v-card-title>
      <v-card-text>Card content goes here.</v-card-text>
      <CardActions>
        <v-btn flat color="primary">Action 1</v-btn>
        <v-btn flat color="primary">Action 2</v-btn>
      </CardActions>
    </v-card>
  `,
});
