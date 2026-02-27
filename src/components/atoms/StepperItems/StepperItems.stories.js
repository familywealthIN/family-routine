import StepperItems from './StepperItems.vue';

export default {
  title: 'Atoms/StepperItems',
  component: StepperItems,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { StepperItems },
  data() {
    return {
      currentStep: 1,
    };
  },
  template: `
    <v-stepper v-model="currentStep">
      <v-stepper-header>
        <v-stepper-step :complete="currentStep > 1" step="1">Step 1</v-stepper-step>
        <v-divider></v-divider>
        <v-stepper-step :complete="currentStep > 2" step="2">Step 2</v-stepper-step>
        <v-divider></v-divider>
        <v-stepper-step step="3">Step 3</v-stepper-step>
      </v-stepper-header>
      <StepperItems v-bind="$props">
        <v-stepper-content step="1">
          <v-card class="mb-4" color="grey lighten-4" height="100px">
            <v-card-text>Step 1 Content</v-card-text>
          </v-card>
          <v-btn color="primary" @click="currentStep = 2">Next</v-btn>
        </v-stepper-content>
        <v-stepper-content step="2">
          <v-card class="mb-4" color="grey lighten-4" height="100px">
            <v-card-text>Step 2 Content</v-card-text>
          </v-card>
          <v-btn @click="currentStep = 1">Back</v-btn>
          <v-btn color="primary" @click="currentStep = 3">Next</v-btn>
        </v-stepper-content>
        <v-stepper-content step="3">
          <v-card class="mb-4" color="grey lighten-4" height="100px">
            <v-card-text>Step 3 Content</v-card-text>
          </v-card>
          <v-btn @click="currentStep = 2">Back</v-btn>
          <v-btn color="success">Complete</v-btn>
        </v-stepper-content>
      </StepperItems>
    </v-stepper>
  `,
});

export const Default = Template.bind({});
Default.args = {};
