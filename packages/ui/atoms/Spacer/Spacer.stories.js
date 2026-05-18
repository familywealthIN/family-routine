import Spacer from './Spacer.vue';

export default {
  title: 'Atoms/Spacer',
  component: Spacer,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Spacer },
  template: `
    <div style="display: flex; background: #f5f5f5; padding: 10px;">
      <div style="background: #2196F3; color: white; padding: 10px;">Left</div>
      <Spacer v-bind="$props" />
      <div style="background: #4CAF50; color: white; padding: 10px;">Right</div>
    </div>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const InToolbar = () => ({
  components: { Spacer },
  template: `
    <v-toolbar color="primary" dark>
      <v-toolbar-title>App Title</v-toolbar-title>
      <Spacer />
      <v-btn icon><v-icon>search</v-icon></v-btn>
      <v-btn icon><v-icon>more_vert</v-icon></v-btn>
    </v-toolbar>
  `,
});

export const MultipleSpacers = () => ({
  components: { Spacer },
  template: `
    <div style="display: flex; background: #f5f5f5; padding: 10px;">
      <div style="background: #2196F3; color: white; padding: 10px;">1</div>
      <Spacer />
      <div style="background: #4CAF50; color: white; padding: 10px;">2</div>
      <Spacer />
      <div style="background: #FF9800; color: white; padding: 10px;">3</div>
    </div>
  `,
});
