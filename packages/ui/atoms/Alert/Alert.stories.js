import Alert from './Alert.vue';

export default {
  title: 'Atoms/Alert',
  component: Alert,
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['success', 'info', 'warning', 'error'],
    },
    dismissible: { control: 'boolean' },
    outline: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Alert },
  template: '<Alert v-bind="$props">{{ message }}</Alert>',
});

export const Success = Template.bind({});
Success.args = {
  type: 'success',
  message: 'This is a success alert.',
};

export const Info = Template.bind({});
Info.args = {
  type: 'info',
  message: 'This is an info alert.',
};

export const Warning = Template.bind({});
Warning.args = {
  type: 'warning',
  message: 'This is a warning alert.',
};

export const Error = Template.bind({});
Error.args = {
  type: 'error',
  message: 'This is an error alert.',
};

export const Dismissible = Template.bind({});
Dismissible.args = {
  type: 'info',
  message: 'This alert can be dismissed.',
  dismissible: true,
};

export const Outline = Template.bind({});
Outline.args = {
  type: 'info',
  message: 'This is an outline alert.',
  outline: true,
};

export const AllTypes = () => ({
  components: { Alert },
  template: `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <Alert type="success">Success: Operation completed successfully.</Alert>
      <Alert type="info">Info: Here's some useful information.</Alert>
      <Alert type="warning">Warning: Please review before proceeding.</Alert>
      <Alert type="error">Error: Something went wrong.</Alert>
    </div>
  `,
});

export const OutlineTypes = () => ({
  components: { Alert },
  template: `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <Alert type="success" outline>Success: Operation completed successfully.</Alert>
      <Alert type="info" outline>Info: Here's some useful information.</Alert>
      <Alert type="warning" outline>Warning: Please review before proceeding.</Alert>
      <Alert type="error" outline>Error: Something went wrong.</Alert>
    </div>
  `,
});

export const CustomIcon = Template.bind({});
CustomIcon.args = {
  type: 'info',
  icon: 'mdi-star',
  message: 'Alert with custom icon.',
};
