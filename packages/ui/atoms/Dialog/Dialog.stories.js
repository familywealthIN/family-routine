import Dialog from './Dialog.vue';

export default {
  title: 'Atoms/Dialog',
  component: Dialog,
  argTypes: {
    fullscreen: { control: 'boolean' },
    persistent: { control: 'boolean' },
    scrollable: { control: 'boolean' },
    maxWidth: { control: 'text' },
    width: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Dialog },
  data() {
    return { show: false };
  },
  template: `
    <div>
      <v-btn color="primary" @click="show = true">Open Dialog</v-btn>
      <Dialog v-model="show" v-bind="$props">
        <v-card>
          <v-card-title>Dialog Title</v-card-title>
          <v-card-text>
            This is the dialog content. You can put any content here.
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn flat @click="show = false">Close</v-btn>
          </v-card-actions>
        </v-card>
      </Dialog>
    </div>
  `,
});

export const Default = Template.bind({});
Default.args = {
  maxWidth: '500',
};

export const Persistent = Template.bind({});
Persistent.args = {
  maxWidth: '500',
  persistent: true,
};

export const Fullscreen = Template.bind({});
Fullscreen.args = {
  fullscreen: true,
};

export const CustomWidth = Template.bind({});
CustomWidth.args = {
  width: '600',
};
