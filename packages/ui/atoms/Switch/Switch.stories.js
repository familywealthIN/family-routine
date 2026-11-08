import Switch from './Switch.vue';

// Registered as AtomSwitch, the name the app uses: a bare <Switch> is the SVG
// <switch> element, so Vue renders that instead of the component.

export default {
  title: 'Atoms/Switch',
  component: Switch,
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'accent'],
    },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    loading: { control: 'boolean' },
    inset: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AtomSwitch: Switch },
  data() {
    return { isOn: false };
  },
  template: '<AtomSwitch v-model="isOn" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  label: 'Enable feature',
};

export const WithHint = Template.bind({});
WithHint.args = {
  label: 'Dark mode',
  hint: 'Toggle dark mode on/off',
  persistentHint: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'Disabled switch',
  disabled: true,
};

export const Loading = Template.bind({});
Loading.args = {
  label: 'Loading switch',
  loading: true,
};

export const Inset = Template.bind({});
Inset.args = {
  label: 'Inset switch',
  inset: true,
};

export const CustomColors = () => ({
  components: { AtomSwitch: Switch },
  data() {
    return {
      switches: {
        primary: true,
        secondary: false,
        success: true,
        error: false,
        warning: true,
        info: false,
      },
    };
  },
  template: `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <AtomSwitch v-model="switches.primary" label="Primary" color="primary" />
      <AtomSwitch v-model="switches.secondary" label="Secondary" color="secondary" />
      <AtomSwitch v-model="switches.success" label="Success" color="success" />
      <AtomSwitch v-model="switches.error" label="Error" color="error" />
      <AtomSwitch v-model="switches.warning" label="Warning" color="warning" />
      <AtomSwitch v-model="switches.info" label="Info" color="info" />
    </div>
  `,
});

export const InsetVariants = () => ({
  components: { AtomSwitch: Switch },
  data() {
    return {
      regular: false,
      inset: false,
    };
  },
  template: `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <AtomSwitch v-model="regular" label="Regular switch" />
      <AtomSwitch v-model="inset" label="Inset switch" inset />
    </div>
  `,
});

export const WithIcons = Template.bind({});
WithIcons.args = {
  label: 'Notifications',
  prependIcon: 'mdi-bell',
};

export const States = () => ({
  components: { AtomSwitch: Switch },
  data() {
    return {
      normal: false,
      disabled: true,
      readonly: true,
      loading: false,
    };
  },
  template: `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <AtomSwitch v-model="normal" label="Normal" />
      <AtomSwitch v-model="disabled" label="Disabled (on)" disabled />
      <AtomSwitch :value="false" label="Disabled (off)" disabled />
      <AtomSwitch v-model="readonly" label="Readonly" readonly />
      <AtomSwitch v-model="loading" label="Loading" loading />
    </div>
  `,
});
