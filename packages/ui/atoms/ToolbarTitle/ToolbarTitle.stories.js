import AtomToolbarTitle from './ToolbarTitle.vue';

export default {
  title: 'Atoms/ToolbarTitle',
  component: AtomToolbarTitle,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AtomToolbarTitle },
  template: `
    <v-toolbar dark color="primary">
      <atom-toolbar-title>{{ title }}</atom-toolbar-title>
    </v-toolbar>
  `,
});

export const Default = Template.bind({});
Default.args = {
  title: 'Page Title',
};

export const LongTitle = Template.bind({});
LongTitle.args = {
  title: 'This is a very long page title that might need truncation',
};
