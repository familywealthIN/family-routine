import RoutineSheet from './RoutineSheet.vue';

export default {
  title: 'Organisms/RoutineSheet',
  component: RoutineSheet,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    value: { control: 'boolean' },
    title: { control: 'text' },
    variant: { control: { type: 'select' }, options: ['phone', 'tablet', 'desktop'] },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RoutineSheet },
  template: `
    <RoutineSheet v-bind="$props" @input="onInput">
      <div style="padding: 4px 16px 24px;">
        <div style="color: rgba(0,0,0,.6); margin-bottom: 12px;">08:30 · 12 points</div>
        <div style="padding: 8px 0;">Ship the pricing page</div>
        <div style="padding: 8px 0;">Email two beta users</div>
        <div style="padding: 8px 0;">Review the week</div>
      </div>
    </RoutineSheet>`,
  methods: {
    onInput(open) {
      console.log('input', open);
    },
  },
});

export const Phone = Template.bind({});
Phone.args = { value: true, title: 'Start office work', variant: 'phone' };

export const Tablet = Template.bind({});
Tablet.args = { value: true, title: 'Deep Work', variant: 'tablet' };

export const Desktop = Template.bind({});
Desktop.args = { value: true, title: 'Workout', variant: 'desktop' };
