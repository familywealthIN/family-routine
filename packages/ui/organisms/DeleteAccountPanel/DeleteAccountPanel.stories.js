import DeleteAccountPanel from './DeleteAccountPanel.vue';

export default {
  title: 'Organisms/DeleteAccountPanel',
  component: DeleteAccountPanel,
  argTypes: {
    open: { control: 'boolean' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { DeleteAccountPanel },
  template: '<div style="max-width: 412px"><DeleteAccountPanel v-bind="$props" @open="onEvent(\'open\')" @close="onEvent(\'close\')" @confirm="onEvent(\'confirm\')" /></div>',
  methods: {
    onEvent(name) {
      console.log(name);
    },
  },
});

// The collapsed row in the Profile page's danger zone.
export const Row = Template.bind({});
Row.args = { open: false, shell: 'phone' };

export const ConfirmSheetPhone = Template.bind({});
ConfirmSheetPhone.args = { open: true, shell: 'phone' };

export const ConfirmDialogDesktop = Template.bind({});
ConfirmDialogDesktop.args = { open: true, shell: 'desktop' };
