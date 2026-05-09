import NextSteps from './NextSteps.vue';

export default {
  title: 'Organisms/NextSteps',
  component: NextSteps,
  argTypes: {
    title: {
      control: 'text',
    },
    showAiSuggestion: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { NextSteps },
  data() {
    return {
      steps: [
        { id: 1, text: 'Review yesterday\'s progress', completed: false },
        { id: 2, text: 'Set priorities for today', completed: false },
        { id: 3, text: 'Start with most important task', completed: false },
      ],
    };
  },
  template: '<NextSteps :steps="steps" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {};

export const WithTitle = Template.bind({});
WithTitle.args = {
  title: 'Recommended Actions',
};

export const WithAiSuggestion = Template.bind({});
WithAiSuggestion.args = {
  showAiSuggestion: true,
};

export const GoalNextSteps = () => ({
  components: { NextSteps },
  data() {
    return {
      steps: [
        { id: 1, text: 'Complete Chapter 5 exercises', completed: true },
        { id: 2, text: 'Watch tutorial video on advanced concepts', completed: false },
        { id: 3, text: 'Practice for 30 minutes', completed: false },
        { id: 4, text: 'Take quiz to test understanding', completed: false },
      ],
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>Learn Python - Next Steps</v-card-title>
      <v-card-text>
        <NextSteps :steps="steps" showAiSuggestion />
      </v-card-text>
    </v-card>
  `,
});

export const DailyNextSteps = () => ({
  components: { NextSteps },
  data() {
    return {
      morning: [
        { id: 1, text: 'Check calendar for appointments', completed: true },
        { id: 2, text: 'Review team standup notes', completed: false },
      ],
      afternoon: [
        { id: 3, text: 'Complete project review', completed: false },
        { id: 4, text: 'Send weekly report', completed: false },
      ],
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>Today's Next Steps</v-card-title>
      <v-card-text>
        <div class="subtitle-1 mb-2">Morning</div>
        <NextSteps :steps="morning" />
        <div class="subtitle-1 mb-2 mt-4">Afternoon</div>
        <NextSteps :steps="afternoon" />
      </v-card-text>
    </v-card>
  `,
});
