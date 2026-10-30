import HierarchicalTagInput from './HierarchicalTagInput.vue';

export default {
  title: 'Molecules/HierarchicalTagInput',
  component: HierarchicalTagInput,
  argTypes: {
    value: { control: 'object' },
    universe: { control: 'object' },
    usage: { control: 'object' },
    hint: { control: 'text' },
    usageNoun: { control: 'text' },
    typed: { control: 'text' },
  },
};

const UNIVERSE = [
  'area:health:fitness',
  'area:health:sleep',
  'area:health:nutrition',
  'area:work',
  'area:work:writing',
  'area:work:product',
  'area:learning',
  'area:family',
  'project:pricing-page',
  'project:google-ux',
  'project:10k',
  'morning',
  'evening',
  'deep-focus',
];

const USAGE = {
  'area:health:fitness': 3,
  'area:health:sleep': 1,
  'area:work:product': 2,
  'area:work:writing': 2,
  'area:learning': 2,
  'project:google-ux': 1,
  'project:10k': 2,
  morning: 4,
};

/**
 * `typed` is story-only: it types into the field after mount (and focuses it)
 * so the suggestion dropdown shows in the canvas. It is not a prop of the
 * component, so it stays out of what we bind.
 */
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { HierarchicalTagInput },
  data() {
    return { tags: this.value || [] };
  },
  computed: {
    bound() {
      const { typed, value, ...rest } = this.$props;
      return rest;
    },
  },
  mounted() {
    if (!this.typed) return;
    setTimeout(() => {
      const field = this.$refs.field;
      field.focused = true;
      field.inputValue = this.typed;
    }, 150);
  },
  template: `
    <div :style="{ width: '360px', minHeight: typed ? '340px' : '0', padding: '16px', background: '#fff' }">
      <HierarchicalTagInput ref="field" v-bind="bound" v-model="tags" />
    </div>`,
});

export const Empty = Template.bind({});
Empty.args = {
  value: [],
  universe: UNIVERSE,
  usage: USAGE,
};

export const WithTags = Template.bind({});
WithTags.args = {
  value: ['area:health:fitness', 'project:10k', 'morning'],
  universe: UNIVERSE,
  usage: USAGE,
};

export const TypingATopLevelTag = Template.bind({});
TypingATopLevelTag.args = {
  value: ['project:10k'],
  universe: UNIVERSE,
  usage: USAGE,
  typed: 'ar',
};

export const DrillingIntoALevel = Template.bind({});
DrillingIntoALevel.args = {
  value: [],
  universe: UNIVERSE,
  usage: USAGE,
  typed: 'area:health:',
};

export const CreatingANewTag = Template.bind({});
CreatingANewTag.args = {
  value: ['area:work:product'],
  universe: UNIVERSE,
  usage: USAGE,
  typed: 'area:work:pricing',
};

export const GoalTagsNoHint = Template.bind({});
GoalTagsNoHint.args = {
  value: ['project:google-ux', 'area:learning'],
  universe: UNIVERSE,
  usage: USAGE,
  usageNoun: 'goal',
  hint: '',
};
