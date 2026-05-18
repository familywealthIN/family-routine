import Textarea from './Textarea.vue';

export default {
  title: 'Atoms/Textarea',
  component: Textarea,
  argTypes: {
    rows: { control: { type: 'number' } },
    autoGrow: { control: 'boolean' },
    noResize: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    clearable: { control: 'boolean' },
    solo: { control: 'boolean' },
    outline: { control: 'boolean' },
    filled: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Textarea },
  data() {
    return { inputValue: '' };
  },
  template: '<Textarea v-model="inputValue" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  label: 'Description',
  placeholder: 'Enter description...',
};

export const WithHint = Template.bind({});
WithHint.args = {
  label: 'Bio',
  hint: 'Tell us about yourself',
  persistentHint: true,
};

export const AutoGrow = Template.bind({});
AutoGrow.args = {
  label: 'Auto-growing textarea',
  autoGrow: true,
  rows: 1,
};

export const NoResize = Template.bind({});
NoResize.args = {
  label: 'No resize',
  noResize: true,
};

export const Counter = Template.bind({});
Counter.args = {
  label: 'With Counter',
  counter: 500,
  maxlength: 500,
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'Disabled',
  disabled: true,
};

export const Readonly = Template.bind({});
Readonly.args = {
  label: 'Readonly',
  readonly: true,
  value: 'This content cannot be edited.',
};

export const Error = Template.bind({});
Error.args = {
  label: 'Description',
  error: true,
  errorMessages: 'Description is required',
};

export const Solo = Template.bind({});
Solo.args = {
  placeholder: 'Solo textarea',
  solo: true,
};

export const Outline = Template.bind({});
Outline.args = {
  label: 'Outline',
  outline: true,
};

export const Filled = Template.bind({});
Filled.args = {
  label: 'Filled',
  filled: true,
};

export const CustomRows = Template.bind({});
CustomRows.args = {
  label: 'Custom Rows',
  rows: 10,
};

export const Variants = () => ({
  components: { Textarea },
  template: `
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <Textarea label="Default" />
      <Textarea label="Solo" solo />
      <Textarea label="Outline" outline />
      <Textarea label="Filled" filled />
      <Textarea label="Box" box />
    </div>
  `,
});
