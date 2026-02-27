import TextField from './TextField.vue';

export default {
  title: 'Atoms/TextField',
  component: TextField,
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'password', 'email', 'number', 'tel', 'url'],
    },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    loading: { control: 'boolean' },
    clearable: { control: 'boolean' },
    dense: { control: 'boolean' },
    solo: { control: 'boolean' },
    outline: { control: 'boolean' },
    filled: { control: 'boolean' },
    box: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TextField },
  data() {
    return { inputValue: '' };
  },
  template: '<TextField v-model="inputValue" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  label: 'Label',
  placeholder: 'Enter text...',
};

export const WithHint = Template.bind({});
WithHint.args = {
  label: 'Email',
  hint: 'We will never share your email',
  persistentHint: true,
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  label: 'Search',
  prependIcon: 'mdi-magnify',
};

export const Clearable = Template.bind({});
Clearable.args = {
  label: 'Clearable',
  clearable: true,
};

export const Password = Template.bind({});
Password.args = {
  label: 'Password',
  type: 'password',
  appendIcon: 'mdi-eye',
};

export const Counter = Template.bind({});
Counter.args = {
  label: 'With Counter',
  counter: 50,
  maxlength: 50,
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
  value: 'Cannot edit this',
};

export const Error = Template.bind({});
Error.args = {
  label: 'Email',
  error: true,
  errorMessages: 'Invalid email address',
};

export const Solo = Template.bind({});
Solo.args = {
  placeholder: 'Solo text field',
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

export const Dense = Template.bind({});
Dense.args = {
  label: 'Dense',
  dense: true,
};

export const Variants = () => ({
  components: { TextField },
  template: `
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <TextField label="Default" />
      <TextField label="Solo" solo />
      <TextField label="Outline" outline />
      <TextField label="Filled" filled />
      <TextField label="Box" box />
      <TextField label="Dense" dense />
    </div>
  `,
});

export const WithPrefixSuffix = Template.bind({});
WithPrefixSuffix.args = {
  label: 'Amount',
  prefix: '$',
  suffix: '.00',
  type: 'number',
};
