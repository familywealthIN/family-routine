import AiTaskCreationForm from './AiTaskCreationForm.vue';

export default {
  title: 'Organisms/AiTaskCreationForm',
  component: AiTaskCreationForm,
  argTypes: {
    showSuggestions: {
      control: 'boolean',
    },
    maxTasks: {
      control: { type: 'number', min: 1, max: 20 },
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AiTaskCreationForm },
  methods: {
    handleCreate(tasks) {
      console.log('Tasks created:', tasks);
    },
  },
  template: '<AiTaskCreationForm v-bind="$props" @create="handleCreate" />',
});

export const Default = Template.bind({});
Default.args = {};

export const WithSuggestions = Template.bind({});
WithSuggestions.args = {
  showSuggestions: true,
};

export const LimitedTasks = Template.bind({});
LimitedTasks.args = {
  maxTasks: 5,
};

export const InDialog = () => ({
  components: { AiTaskCreationForm },
  data() {
    return {
      showDialog: true,
    };
  },
  template: `
    <div>
      <v-btn color="primary" @click="showDialog = true">
        <v-icon left>auto_awesome</v-icon>
        AI Task Creation
      </v-btn>
      <v-dialog v-model="showDialog" max-width="600">
        <v-card>
          <v-card-title>
            <v-icon left color="primary">auto_awesome</v-icon>
            Create Tasks with AI
          </v-card-title>
          <v-card-text>
            <AiTaskCreationForm 
              showSuggestions 
              @create="showDialog = false" 
            />
          </v-card-text>
        </v-card>
      </v-dialog>
    </div>
  `,
});

export const MorningRoutineCreation = () => ({
  components: { AiTaskCreationForm },
  data() {
    return {
      suggestedPrompts: [
        'Create a healthy morning routine for someone who wakes up at 6am',
        'Plan a productive work morning with focus blocks',
        'Design an exercise-focused morning for fitness enthusiasts',
      ],
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>
        <v-icon left>wb_sunny</v-icon>
        AI Morning Routine Generator
      </v-card-title>
      <v-card-text>
        <div class="subtitle-1 mb-3">Quick prompts:</div>
        <v-chip 
          v-for="(prompt, index) in suggestedPrompts" 
          :key="index" 
          class="mr-2 mb-2"
          @click="selectPrompt(prompt)"
          outlined
        >
          {{ prompt.slice(0, 40) }}...
        </v-chip>
        <AiTaskCreationForm showSuggestions class="mt-4" />
      </v-card-text>
    </v-card>
  `,
  methods: {
    selectPrompt(prompt) {
      console.log('Selected prompt:', prompt);
    },
  },
});

export const GoalBreakdown = () => ({
  components: { AiTaskCreationForm },
  template: `
    <v-card class="pa-4">
      <v-card-title>
        <v-icon left>flag</v-icon>
        Break Down Your Goal
      </v-card-title>
      <v-card-subtitle>
        Use AI to break down a large goal into actionable tasks
      </v-card-subtitle>
      <v-card-text>
        <v-text-field
          label="Your Goal"
          placeholder="e.g., Learn to play guitar"
          outlined
          class="mb-4"
        ></v-text-field>
        <AiTaskCreationForm 
          showSuggestions 
          :maxTasks="10"
        />
      </v-card-text>
    </v-card>
  `,
});
