import MarkdownField from './MarkdownField.vue';

export default {
  title: 'Molecules/MarkdownField',
  component: MarkdownField,
  argTypes: {
    value: { control: 'text' },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    editorKey: { control: 'text' },
    editing: { control: 'boolean' },
  },
};

const NOTES = [
  'Shipped the **pricing page** this morning.',
  '',
  '- Three plan cards, monthly and yearly toggle',
  '- Checkout link wired to the web app',
  '- FAQ still to write',
  '',
  'Next: ask two beta users to review it before Friday.',
].join('\n');

/**
 * `editing` is story-only: it opens the editor after mount, the same call the
 * preview click makes. It is not a prop of the field, so it stays out of what
 * we bind.
 */
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { MarkdownField },
  computed: {
    bound() {
      const { editing, ...rest } = this.$props;
      return rest;
    },
  },
  mounted() {
    if (this.editing) setTimeout(() => this.$refs.field.setEditing(true), 150);
  },
  template: `
    <div style="width:380px;padding:16px;background:#fff;border-radius:16px">
      <MarkdownField ref="field" v-bind="bound" @commit="onCommit" />
    </div>`,
  methods: {
    onCommit(text) {
      console.log('markdown committed', text);
    },
  },
});

export const WithContribution = Template.bind({});
WithContribution.args = {
  value: NOTES,
  label: 'CONTRIBUTION',
};

export const Empty = Template.bind({});
Empty.args = {
  value: '',
  label: 'CONTRIBUTION',
  placeholder: 'Click to add a contribution…',
};

export const Editing = Template.bind({});
Editing.args = {
  value: NOTES,
  label: 'CONTRIBUTION',
  editing: true,
};

export const CustomLabel = Template.bind({});
CustomLabel.args = {
  value: 'Run 5 km before work, easy pace. Log the time in the notes.',
  label: 'NOTES',
};
