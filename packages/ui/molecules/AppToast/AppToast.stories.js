import AppToast from './AppToast.vue';

export default {
  title: 'Molecules/AppToast',
  component: AppToast,
  argTypes: {
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    title: { control: 'text' },
    sub: { control: 'text' },
    icon: { control: 'text' },
    iconColor: { control: 'color' },
    duration: { control: 'number' },
    seq: { control: 'number' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AppToast },
  // The toast is a 2.8s keyframe that ends invisible. A long duration with a
  // negative delay parks it in the middle of the hold, so the canvas shows it.
  template: '<div style="min-height:140px"><AppToast v-bind="$props" style="animation-delay:-300000ms" /></div>',
});

export const Success = Template.bind({});
Success.args = {
  shell: 'phone',
  title: 'Week goal ticked',
  sub: 'Streak kept - Run 5 km, 3/3 weeks',
  duration: 600000,
};

export const Error = Template.bind({});
Error.args = {
  shell: 'phone',
  title: "Couldn't save that tick",
  sub: 'You are offline - it will sync when you are back',
  icon: 'error',
  iconColor: '#E53935',
  duration: 600000,
};

export const Tablet = Template.bind({});
Tablet.args = {
  shell: 'tablet',
  title: 'Routine complete',
  sub: 'Wake up - brush - invest, +35 points',
  duration: 600000,
};

export const Desktop = Template.bind({});
Desktop.args = {
  shell: 'desktop',
  title: 'Goal moved to tomorrow',
  sub: 'Draft the onboarding email is on Mon 26 Oct',
  icon: 'event',
  iconColor: '#2196F3',
  duration: 600000,
};
