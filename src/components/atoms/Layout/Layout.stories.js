import Layout from './Layout.vue';

export default {
  title: 'Atoms/Layout',
  component: Layout,
  argTypes: {
    row: { control: 'boolean' },
    column: { control: 'boolean' },
    wrap: { control: 'boolean' },
    justifyCenter: { control: 'boolean' },
    justifySpaceBetween: { control: 'boolean' },
    alignCenter: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Layout },
  template: `
    <Layout v-bind="$props" style="background: #f5f5f5; padding: 16px;">
      <div style="background: #1976d2; color: white; padding: 16px; margin: 8px;">Item 1</div>
      <div style="background: #1976d2; color: white; padding: 16px; margin: 8px;">Item 2</div>
      <div style="background: #1976d2; color: white; padding: 16px; margin: 8px;">Item 3</div>
    </Layout>
  `,
});

export const Row = Template.bind({});
Row.args = {
  row: true,
};

export const Column = Template.bind({});
Column.args = {
  column: true,
};

export const RowWrap = Template.bind({});
RowWrap.args = {
  row: true,
  wrap: true,
};

export const JustifyCenter = Template.bind({});
JustifyCenter.args = {
  row: true,
  justifyCenter: true,
};

export const JustifySpaceBetween = Template.bind({});
JustifySpaceBetween.args = {
  row: true,
  justifySpaceBetween: true,
};

export const AlignCenter = Template.bind({});
AlignCenter.args = {
  row: true,
  alignCenter: true,
};
