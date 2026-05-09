import { MarkdownEditor } from './index';

export default {
  title: 'Editors/MarkdownEditor',
  component: MarkdownEditor,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'compact'],
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { MarkdownEditor },
  data() {
    return { model: args.value || '' };
  },
  template: `
    <MarkdownEditor
      v-model="model"
      :variant="variant"
      :configs="configs"
    />
  `,
});

export const Default = Template.bind({});
Default.args = {
  variant: 'default',
  value: '# Hello\n\nStart writing your **goal** description.',
  configs: {},
};

export const Compact = Template.bind({});
Compact.args = {
  variant: 'compact',
  value: 'Short description — toolbar hidden, capped height.',
  configs: {
    minHeight: '80px',
    maxHeight: '160px',
    placeholder: 'Describe this entry…',
  },
};

export const Empty = Template.bind({});
Empty.args = {
  variant: 'default',
  value: '',
  configs: {},
};
