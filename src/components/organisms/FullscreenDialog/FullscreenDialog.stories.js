import FullscreenDialog from './FullscreenDialog.vue';

export default {
  title: 'Organisms/FullscreenDialog',
  component: FullscreenDialog,
  argTypes: {
    value: { control: 'boolean' },
    showClose: { control: 'boolean' },
    showSave: { control: 'boolean' },
    saveDisabled: { control: 'boolean' },
    saveLoading: { control: 'boolean' },
    headerColor: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info'],
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { FullscreenDialog },
  data() {
    return { dialogOpen: true };
  },
  template: `
    <div>
      <v-btn @click="dialogOpen = true">Open Dialog</v-btn>
      <FullscreenDialog
        v-model="dialogOpen"
        v-bind="$props"
        @close="dialogOpen = false"
        @save="handleSave"
      >
        <p>Dialog content goes here.</p>
      </FullscreenDialog>
    </div>
  `,
  methods: {
    handleSave() {
      console.log('Save clicked');
    },
  },
});

export const Default = Template.bind({});
Default.args = {
  title: 'Dialog Title',
  showClose: true,
};

export const WithSave = Template.bind({});
WithSave.args = {
  title: 'Edit Item',
  showClose: true,
  showSave: true,
  saveText: 'Save Changes',
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

export const CustomColor = Template.bind({});
CustomColor.args = {
  title: 'Warning',
  showClose: true,
  headerColor: 'warning',
};

export const AddGoalDialog = () => ({
  components: { FullscreenDialog },
  data() {
    return { dialogOpen: true };
  },
  template: `
    <div>
      <v-btn @click="dialogOpen = true">Add Goal</v-btn>
      <FullscreenDialog
        v-model="dialogOpen"
        title="Add Goal"
        showClose
        @close="dialogOpen = false"
      >
        <div style="padding: 16px;">
          <v-text-field label="Goal Title" outlined />
          <v-textarea label="Description" outlined rows="3" />
          <v-select
            :items="['day', 'week', 'month', 'year']"
            label="Period"
            outlined
          />
        </div>
        <template #footer>
          <v-spacer />
          <v-btn flat @click="dialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" @click="dialogOpen = false">Create Goal</v-btn>
        </template>
      </FullscreenDialog>
    </div>
  `,
});

export const ViewGoalDialog = () => ({
  components: { FullscreenDialog },
  data() {
    return { dialogOpen: true };
  },
  template: `
    <div>
      <v-btn @click="dialogOpen = true">View Goal</v-btn>
      <FullscreenDialog
        v-model="dialogOpen"
        title=""
        headerColor="white"
        showClose
        @close="dialogOpen = false"
      >
        <div style="padding: 16px;">
          <h2>Goal Details</h2>
          <p>This is the goal content area where you can display detailed information about the goal.</p>
        </div>
      </FullscreenDialog>
    </div>
  `,
});
