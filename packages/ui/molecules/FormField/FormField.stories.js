import FormField from './FormField.vue';

export default {
  title: 'Molecules/FormField',
  component: FormField,
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'password', 'email', 'number', 'tel', 'url', 'textarea'],
    },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    loading: { control: 'boolean' },
    clearable: { control: 'boolean' },
    dense: { control: 'boolean' },
    solo: { control: 'boolean' },
    outline: { control: 'boolean' },
    filled: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { FormField },
  data() {
    return { inputValue: '' };
  },
  template: '<FormField v-model="inputValue" v-bind="$props" style="max-width: 400px;" />',
});

export const Text = Template.bind({});
Text.args = {
  label: 'Full Name',
  placeholder: 'Enter your name',
  type: 'text',
};

export const Email = Template.bind({});
Email.args = {
  label: 'Email',
  placeholder: 'Enter your email',
  type: 'email',
  prependIcon: 'mdi-email',
};

export const Password = Template.bind({});
Password.args = {
  label: 'Password',
  placeholder: 'Enter your password',
  type: 'password',
  prependIcon: 'mdi-lock',
};

export const Number = Template.bind({});
Number.args = {
  label: 'Age',
  type: 'number',
  hint: 'Enter your age',
};

export const Textarea = Template.bind({});
Textarea.args = {
  label: 'Description',
  placeholder: 'Enter description...',
  type: 'textarea',
  rows: 4,
};

export const WithValidation = () => ({
  components: { FormField },
  data() {
    return {
      email: '',
      rules: [
        (v) => !!v || 'Email is required',
        (v) => /.+@.+\..+/.test(v) || 'Email must be valid',
      ],
    };
  },
  template: `
    <FormField
      v-model="email"
      label="Email"
      type="email"
      :rules="rules"
      prependIcon="mdi-email"
      style="max-width: 400px;"
    />
  `,
});

export const WithError = Template.bind({});
WithError.args = {
  label: 'Username',
  type: 'text',
  error: true,
  errorMessages: 'Username is already taken',
};

export const WithSuccess = Template.bind({});
WithSuccess.args = {
  label: 'Username',
  type: 'text',
  success: true,
  successMessages: 'Username is available',
};

export const WithCounter = Template.bind({});
WithCounter.args = {
  label: 'Bio',
  type: 'textarea',
  counter: 200,
  maxlength: 200,
  rows: 3,
};

export const WithPrefixSuffix = Template.bind({});
WithPrefixSuffix.args = {
  label: 'Amount',
  type: 'number',
  prefix: '$',
  suffix: '.00',
};

export const Clearable = Template.bind({});
Clearable.args = {
  label: 'Search',
  type: 'text',
  clearable: true,
  prependIcon: 'mdi-magnify',
};

export const LoginForm = () => ({
  components: { FormField },
  data() {
    return {
      email: '',
      password: '',
    };
  },
  template: `
    <div style="max-width: 400px; display: flex; flex-direction: column; gap: 16px;">
      <FormField
        v-model="email"
        label="Email"
        type="email"
        prependIcon="mdi-email"
        :rules="[(v) => !!v || 'Email is required']"
      />
      <FormField
        v-model="password"
        label="Password"
        type="password"
        prependIcon="mdi-lock"
        :rules="[(v) => !!v || 'Password is required']"
      />
    </div>
  `,
});

export const Variants = () => ({
  components: { FormField },
  template: `
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <FormField label="Default" />
      <FormField label="Outline" outline />
      <FormField label="Filled" filled />
      <FormField label="Solo" solo placeholder="Solo field" />
      <FormField label="Dense" dense />
    </div>
  `,
});
