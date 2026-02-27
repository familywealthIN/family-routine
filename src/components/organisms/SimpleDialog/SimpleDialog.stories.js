import SimpleDialog from './SimpleDialog.vue';

export default {
  title: 'Organisms/SimpleDialog',
  component: SimpleDialog,
  argTypes: {
    value: { control: 'boolean' },
    persistent: { control: 'boolean' },
    showDivider: { control: 'boolean' },
    showCancel: { control: 'boolean' },
    showConfirm: { control: 'boolean' },
    confirmLoading: { control: 'boolean' },
    confirmDisabled: { control: 'boolean' },
    confirmColor: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info'],
    },
    maxWidth: { control: { type: 'number' } },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { SimpleDialog },
  data() {
    return { dialogOpen: true };
  },
  template: `
    <div>
      <v-btn @click="dialogOpen = true">Open Dialog</v-btn>
      <SimpleDialog
        v-model="dialogOpen"
        v-bind="$props"
        @cancel="dialogOpen = false"
        @confirm="handleConfirm"
      />
    </div>
  `,
  methods: {
    handleConfirm() {
      console.log('Confirmed!');
      this.dialogOpen = false;
    },
  },
});

export const Default = Template.bind({});
Default.args = {
  title: 'Dialog Title',
  message: 'This is the dialog content. Are you sure you want to proceed?',
};

export const StepsDialog = Template.bind({});
StepsDialog.args = {
  title: 'Routine Steps',
  showCancel: false,
  confirmText: 'Close',
};

export const DeleteConfirmation = Template.bind({});
DeleteConfirmation.args = {
  title: 'Delete Item',
  message: 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmText: 'Delete',
  confirmColor: 'error',
};

export const Loading = Template.bind({});
Loading.args = {
  title: 'Processing',
  message: 'Please wait while we process your request...',
  confirmLoading: true,
  showCancel: false,
};

export const WithCustomContent = () => ({
  components: { SimpleDialog },
  data() {
    return { dialogOpen: true };
  },
  template: `
    <div>
      <v-btn @click="dialogOpen = true">Open Dialog</v-btn>
      <SimpleDialog
        v-model="dialogOpen"
        title="Quick Task"
        @cancel="dialogOpen = false"
        @confirm="dialogOpen = false"
      >
        <v-text-field label="Task Name" outlined dense />
        <v-textarea label="Description" outlined dense rows="2" />
      </SimpleDialog>
    </div>
  `,
});

export const WithList = () => ({
  components: { SimpleDialog },
  data() {
    return {
      dialogOpen: true,
      steps: ['Wake up', 'Brush teeth', 'Exercise', 'Shower', 'Breakfast'],
    };
  },
  template: `
    <div>
      <v-btn @click="dialogOpen = true">View Steps</v-btn>
      <SimpleDialog
        v-model="dialogOpen"
        title="Routine Steps"
        showCancel
        confirmText="Close"
        @cancel="dialogOpen = false"
        @confirm="dialogOpen = false"
      >
        <ul>
          <li v-for="step in steps" :key="step">{{ step }}</li>
        </ul>
      </SimpleDialog>
    </div>
  `,
});

export const Persistent = Template.bind({});
Persistent.args = {
  title: 'Important Action',
  message: 'You must confirm or cancel this action to continue.',
  persistent: true,
};

export const InfoDialog = Template.bind({});
InfoDialog.args = {
  title: 'Information',
  message: 'Here is some important information for you to review.',
  showCancel: false,
  confirmText: 'Got it',
  confirmColor: 'info',
};
