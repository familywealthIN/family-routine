import Tab from './Tab.vue';

export default {
  title: 'Atoms/Tab',
  component: Tab,
  argTypes: {
    href: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
    ripple: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Tab },
  template: `
    <v-tabs>
      <Tab v-bind="$props">{{ label }}</Tab>
    </v-tabs>
  `,
});

export const Default = Template.bind({});
Default.args = {
  label: 'Tab Label',
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'Disabled Tab',
  disabled: true,
};

export const WithIcon = () => ({
  components: { Tab },
  template: `
    <v-tabs>
      <Tab>
        <v-icon left>schedule</v-icon>
        Schedule
      </Tab>
    </v-tabs>
  `,
});

export const MultipleTabs = () => ({
  components: { Tab },
  data() {
    return {
      activeTab: null,
    };
  },
  template: `
    <v-tabs v-model="activeTab">
      <Tab>
        <v-icon left>flag</v-icon>
        Goals
      </Tab>
      <Tab>
        <v-icon left>list</v-icon>
        Tasks
      </Tab>
      <Tab>
        <v-icon left>bar_chart</v-icon>
        Progress
      </Tab>
      <Tab disabled>
        <v-icon left>settings</v-icon>
        Settings
      </Tab>
    </v-tabs>
  `,
});
