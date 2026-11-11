import BottomSheet from './BottomSheet.vue';

export default {
  title: 'Atoms/BottomSheet',
  component: BottomSheet,
  argTypes: {
    value: { control: 'boolean' },
    hideOverlay: { control: 'boolean' },
    persistent: { control: 'boolean' },
    inset: { control: 'boolean' },
    fullscreen: { control: 'boolean' },
    maxWidth: { control: 'text' },
  },
};

const sheetBody = `
  <div style="background:#fff;padding:20px 20px 28px;font-family:Roboto,sans-serif">
    <div style="font-size:18px;font-weight:700;color:rgba(0,0,0,.87)">Deep Work</div>
    <div style="font-size:14px;color:rgba(0,0,0,.54);margin-top:4px">09:00 - 12:00 · Geniuses</div>
    <div style="margin-top:14px;font-size:15px;color:rgba(0,0,0,.87)">Ship the pricing page</div>
    <div style="margin-top:6px;font-size:15px;color:rgba(0,0,0,.87)">Draft the onboarding email</div>
  </div>`;

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { BottomSheet },
  template: `<BottomSheet v-bind="$props" :value="value">${sheetBody}</BottomSheet>`,
});

export const Open = Template.bind({});
Open.args = { value: true, maxWidth: 480 };

export const Inset = Template.bind({});
Inset.args = { value: true, inset: true, maxWidth: 420 };

export const Persistent = Template.bind({});
Persistent.args = { value: true, persistent: true, hideOverlay: true, maxWidth: 480 };
