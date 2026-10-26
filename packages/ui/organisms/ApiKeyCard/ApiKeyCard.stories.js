import ApiKeyCard from './ApiKeyCard.vue';

// Masked, obviously fake key. A real one is only ever shown by the container
// after the `generateApiKey` mutation.
const KEY = 'rn_live_••••••••3f2a';

export default {
  title: 'Organisms/ApiKeyCard',
  component: ApiKeyCard,
  argTypes: {
    apiKey: { control: 'text' },
    copied: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ApiKeyCard },
  template: '<div style="max-width: 412px"><ApiKeyCard ref="card" v-bind="$props" @copy="onCopy" @generate="onGenerate" /></div>',
  methods: {
    onCopy(payload) {
      console.log('copy', payload.label);
    },
    onGenerate() {
      console.log('generate');
    },
  },
});

export const NoKey = Template.bind({});
NoKey.args = { apiKey: '' };

export const HasKey = Template.bind({});
HasKey.args = { apiKey: KEY };

export const Copied = Template.bind({});
Copied.args = { apiKey: KEY, copied: true };

// Regenerating takes two presses: this story presses once, as a user would.
export const ConfirmRegenerate = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ApiKeyCard },
  template: '<div style="max-width: 412px"><ApiKeyCard ref="card" v-bind="$props" /></div>',
  mounted() {
    this.$refs.card.press();
  },
});
ConfirmRegenerate.args = { apiKey: KEY };
