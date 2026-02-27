import DialogHeader from './DialogHeader.vue';

export default {
  title: 'Molecules/DialogHeader',
  component: DialogHeader,
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'accent'],
    },
    dark: { control: 'boolean' },
    light: { control: 'boolean' },
    flat: { control: 'boolean' },
    dense: { control: 'boolean' },
    showClose: { control: 'boolean' },
    showBack: { control: 'boolean' },
    showSave: { control: 'boolean' },
    saveDisabled: { control: 'boolean' },
    saveLoading: { control: 'boolean' },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { DialogHeader },
  template: '<DialogHeader v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  title: 'Dialog Title',
  showClose: true,
};

export const WithSaveButton = Template.bind({});
WithSaveButton.args = {
  title: 'Edit Item',
  showClose: true,
  showSave: true,
  saveText: 'Save',
};

export const WithBackButton = Template.bind({});
WithBackButton.args = {
  title: 'Step 2 of 3',
  showClose: false,
  showBack: true,
};

export const SaveDisabled = Template.bind({});
SaveDisabled.args = {
  title: 'Create New',
  showClose: true,
  showSave: true,
  saveDisabled: true,
};

export const SaveLoading = Template.bind({});
SaveLoading.args = {
  title: 'Saving...',
  showClose: true,
  showSave: true,
  saveLoading: true,
};

export const Dense = Template.bind({});
Dense.args = {
  title: 'Compact Header',
  showClose: true,
  dense: true,
};

export const CustomColor = Template.bind({});
CustomColor.args = {
  title: 'Error Dialog',
  showClose: true,
  color: 'error',
};

export const WithCustomActions = () => ({
  components: { DialogHeader },
  template: `
    <DialogHeader title="Custom Actions" :showClose="false">
      <template #actions>
        <v-btn icon>
          <v-icon>mdi-magnify</v-icon>
        </v-btn>
        <v-btn icon>
          <v-icon>mdi-dots-vertical</v-icon>
        </v-btn>
      </template>
    </DialogHeader>
  `,
});

export const FormDialog = () => ({
  components: { DialogHeader },
  template: `
    <DialogHeader
      title="Create Goal"
      showClose
      showSave
      saveText="Create"
      @close="() => console.log('Close clicked')"
      @save="() => console.log('Save clicked')"
    />
  `,
});

export const SettingsDialog = () => ({
  components: { DialogHeader },
  template: `
    <DialogHeader
      title="Settings"
      showClose
      color="grey darken-3"
    >
      <template #actions>
        <v-btn flat dark>Reset</v-btn>
        <v-btn flat dark>Apply</v-btn>
      </template>
    </DialogHeader>
  `,
});

export const LightTheme = Template.bind({});
LightTheme.args = {
  title: 'Light Header',
  showClose: true,
  color: 'white',
  dark: false,
  light: true,
};
