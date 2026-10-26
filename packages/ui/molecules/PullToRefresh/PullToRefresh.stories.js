import PullToRefresh from './PullToRefresh.vue';

export default {
  title: 'Molecules/PullToRefresh',
  component: PullToRefresh,
  argTypes: {
    refreshing: { control: 'boolean' },
    threshold: { control: 'number' },
    max: { control: 'number' },
    disabled: { control: 'boolean' },
  },
};

// The indicator only follows a finger or spins while the host reports a refetch,
// so the static stories are the idle wrapper and the refreshing state.
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PullToRefresh },
  template: `
    <div style="width:360px;height:260px;overflow:hidden;position:relative;background:#f4f4f4;border-radius:12px">
      <PullToRefresh v-bind="$props" @refresh="() => {}">
        <div style="padding:16px;font-family:Roboto,sans-serif">
          <div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:rgba(0,0,0,.45)">TODAY</div>
          <div style="margin-top:8px;background:#fff;border-radius:12px;padding:14px 16px;font-size:15px;color:rgba(0,0,0,.87)">Deep Work · 09:00 - 12:00</div>
          <div style="margin-top:8px;background:#fff;border-radius:12px;padding:14px 16px;font-size:15px;color:rgba(0,0,0,.87)">Workout · 19:30</div>
        </div>
      </PullToRefresh>
    </div>`,
});

export const Idle = Template.bind({});
Idle.args = { refreshing: false };

export const Refreshing = Template.bind({});
Refreshing.args = { refreshing: true };

export const Disabled = Template.bind({});
Disabled.args = { disabled: true };
