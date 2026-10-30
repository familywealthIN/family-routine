import ProfileTimeSettings from './ProfileTimeSettings.vue';

export default {
  title: 'Organisms/ProfileTimeSettings',
  component: ProfileTimeSettings,
  argTypes: {
    timeFormat: { control: { type: 'select', options: ['12', '24'] } },
    timezone: { control: 'text' },
    weekStart: { control: { type: 'select', options: ['sun', 'mon'] } },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ProfileTimeSettings },
  template: '<div style="max-width: 412px"><ProfileTimeSettings v-bind="$props" @change-time-format="onChange(\'time format\', $event)" @change-timezone="onChange(\'timezone\', $event)" /></div>',
  methods: {
    onChange(what, value) {
      console.log(what, value);
    },
  },
});

export const Default = Template.bind({});
Default.args = {
  timeFormat: '24',
  timezone: 'Asia/Kolkata',
  weekStart: 'sun',
};

export const TwelveHourMondayStart = Template.bind({});
TwelveHourMondayStart.args = {
  timeFormat: '12',
  timezone: 'America/Anchorage',
  weekStart: 'mon',
};
