// molecules/GoalTagsInput/GoalTagsInput.stories.js
import GoalTagsInput from './GoalTagsInput.vue';

export default {
  title: 'Molecules/GoalTagsInput',
  component: GoalTagsInput,
  argTypes: {
    goalTags: {
      control: { type: 'object' },
    },
    userTags: {
      control: { type: 'object' },
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalTagsInput },
  template: '<GoalTagsInput v-bind="$props" @update-new-tag-items="handleUpdate" />',
  methods: {
    handleUpdate(tags) {
      console.log('Tags updated:', tags);
    },
  },
});

export const Default = Template.bind({});
Default.args = {
  goalTags: [],
  userTags: ['work', 'personal', 'health', 'learning'],
};

export const WithExistingTags = Template.bind({});
WithExistingTags.args = {
  goalTags: ['work', 'urgent'],
  userTags: ['work', 'personal', 'health', 'learning', 'urgent'],
};

export const WithAreaTags = Template.bind({});
WithAreaTags.args = {
  goalTags: ['area:work', 'project:website'],
  userTags: ['area:work', 'area:personal', 'project:website', 'project:app'],
};

export const EmptyState = Template.bind({});
EmptyState.args = {
  goalTags: [],
  userTags: [],
};
