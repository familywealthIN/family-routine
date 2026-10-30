import MobileSubDrawer from './MobileSubDrawer.vue';

export default {
  title: 'Molecules/MobileSubDrawer',
  component: MobileSubDrawer,
  argTypes: {
    value: { control: 'boolean' },
    title: { control: 'text' },
  },
};

const list = `
  <div style="font-family:Roboto,sans-serif;font-size:15px;color:rgba(0,0,0,.87)">
    <div style="padding:12px 16px;border-bottom:1px solid rgba(0,0,0,.06)">Wake up · brush · invest <span style="color:rgba(0,0,0,.45)">05:30</span></div>
    <div style="padding:12px 16px;border-bottom:1px solid rgba(0,0,0,.06)">Deep Work <span style="color:rgba(0,0,0,.45)">09:00</span></div>
    <div style="padding:12px 16px;border-bottom:1px solid rgba(0,0,0,.06)">Workout <span style="color:rgba(0,0,0,.45)">19:30</span></div>
    <div style="padding:12px 16px">Family time <span style="color:rgba(0,0,0,.45)">21:00</span></div>
  </div>`;

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { MobileSubDrawer },
  template: `<MobileSubDrawer :value="value" :title="title" @input="() => {}">${list}</MobileSubDrawer>`,
});

export const Open = Template.bind({});
Open.args = { value: true, title: 'Select routine' };

export const Empty = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { MobileSubDrawer },
  template: `
    <MobileSubDrawer :value="value" :title="title" @input="() => {}">
      <div style="padding:28px 16px;text-align:center;font-family:Roboto,sans-serif;font-size:14px;color:rgba(0,0,0,.54)">No routines yet - add your first one.</div>
    </MobileSubDrawer>`,
});
Empty.args = { value: true, title: 'Select routine' };
