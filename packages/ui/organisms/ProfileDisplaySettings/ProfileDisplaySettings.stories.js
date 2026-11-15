import ProfileDisplaySettings from './ProfileDisplaySettings.vue';

export default {
  title: 'Organisms/ProfileDisplaySettings',
  component: ProfileDisplaySettings,
  argTypes: {
    alwaysOn: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ProfileDisplaySettings },
  template: '<div style="max-width: 600px"><ProfileDisplaySettings v-bind="$props" @change-always-on="onChange" /></div>',
  methods: {
    onChange(value) {
      console.log('always on', value);
    },
  },
});

// Off is the default: the screen sleeps as usual until a tablet opts in.
export const Off = Template.bind({});
Off.args = { alwaysOn: false };

export const On = Template.bind({});
On.args = { alwaysOn: true };
