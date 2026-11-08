import ResponsiveSheet from './ResponsiveSheet.vue';

export default {
  title: 'Molecules/ResponsiveSheet',
  component: ResponsiveSheet,
  argTypes: {
    open: { control: 'boolean' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    width: { control: 'text' },
    title: { control: 'text' },
    handle: { control: 'boolean' },
    closable: { control: 'boolean' },
  },
};

const body = `
  <div style="padding:4px 16px 16px;font-family:Roboto,sans-serif;color:rgba(0,0,0,.87)">
    <div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:rgba(0,0,0,.45)">TODAY · 25 OCT 2026</div>
    <div style="margin-top:10px;font-size:15px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06)">Ship the pricing page</div>
    <div style="font-size:15px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06)">Draft the onboarding email</div>
    <div style="font-size:15px;padding:10px 0">Run 5 km</div>
  </div>`;

const footer = `
  <div slot="footer" style="display:flex;gap:10px;justify-content:flex-end;font-family:Roboto,sans-serif;font-size:14px;font-weight:700">
    <span style="padding:8px 14px;color:rgba(0,0,0,.54)">Cancel</span>
    <span style="padding:8px 18px;border-radius:8px;background:#288bd5;color:#fff">Save</span>
  </div>`;

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ResponsiveSheet },
  template: `<ResponsiveSheet v-bind="$props" @close="() => {}">${body}${footer}</ResponsiveSheet>`,
});

export const Phone = Template.bind({});
Phone.args = { open: true, shell: 'phone', title: 'Goals for today' };

export const Tablet = Template.bind({});
Tablet.args = { open: true, shell: 'tablet', title: 'Goals for today' };

export const Desktop = Template.bind({});
Desktop.args = { open: true, shell: 'desktop', title: 'Goals for today', width: 520 };

