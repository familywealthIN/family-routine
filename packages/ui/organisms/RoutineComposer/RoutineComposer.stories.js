import RoutineComposer from './RoutineComposer.vue';

export default {
  title: 'Organisms/RoutineComposer',
  component: RoutineComposer,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    value: { control: 'text' },
    placeholder: { control: 'text' },
    variant: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    disabled: { control: 'boolean' },
  },
};

// The phone composer sits on the page background; the tablet and desktop ones sit
// in a white chat pane, which is why their pill is #f4f4f4 instead of white.
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RoutineComposer },
  data: () => ({ draft: '' }),
  created() { this.draft = this.value; },
  computed: {
    frame() {
      return this.variant === 'phone'
        ? 'box-sizing:border-box;width:412px;background:#f4f4f4;padding:10px 12px'
        : 'box-sizing:border-box;width:520px;background:#fff;padding:12px 16px;border-radius:16px';
    },
  },
  template: `
    <div :style="frame">
      <RoutineComposer v-bind="$props" :value="draft" @input="draft = $event" @send="draft = ''" @add-task="() => {}" />
    </div>`,
});

export const Empty = Template.bind({});
Empty.args = { value: '', variant: 'phone', placeholder: 'Message Deep Work…' };

export const Typing = Template.bind({});
Typing.args = { value: 'Break down the pricing page into steps', variant: 'phone', placeholder: 'Message Deep Work…' };

export const Tablet = Template.bind({});
Tablet.args = { value: '', variant: 'tablet', placeholder: 'Message Deep Work…' };

export const Desktop = Template.bind({});
Desktop.args = { value: 'Add "Draft the onboarding email" to the checklist', variant: 'desktop', placeholder: 'Message Deep Work…' };

export const Disabled = Template.bind({});
Disabled.args = { value: '', variant: 'phone', placeholder: 'Message Deep Work…', disabled: true };
