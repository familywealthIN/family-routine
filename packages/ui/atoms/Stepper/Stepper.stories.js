import Stepper from './Stepper.vue';

export default {
  title: 'Atoms/Stepper',
  component: Stepper,
  argTypes: {
    vertical: {
      control: 'boolean',
    },
    altLabels: {
      control: 'boolean',
    },
    nonLinear: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Stepper },
  data() {
    return {
      currentStep: 1,
    };
  },
  template: `
    <Stepper v-model="currentStep" v-bind="$props">
      <v-stepper-header>
        <v-stepper-step :complete="currentStep > 1" step="1">Step 1</v-stepper-step>
        <v-divider></v-divider>
        <v-stepper-step :complete="currentStep > 2" step="2">Step 2</v-stepper-step>
        <v-divider></v-divider>
        <v-stepper-step step="3">Step 3</v-stepper-step>
      </v-stepper-header>
      <v-stepper-items>
        <v-stepper-content step="1">
          <div class="pa-4">Content for Step 1</div>
          <v-btn color="primary" @click="currentStep = 2">Continue</v-btn>
        </v-stepper-content>
        <v-stepper-content step="2">
          <div class="pa-4">Content for Step 2</div>
          <v-btn @click="currentStep = 1">Back</v-btn>
          <v-btn color="primary" @click="currentStep = 3">Continue</v-btn>
        </v-stepper-content>
        <v-stepper-content step="3">
          <div class="pa-4">Content for Step 3</div>
          <v-btn @click="currentStep = 2">Back</v-btn>
          <v-btn color="success">Finish</v-btn>
        </v-stepper-content>
      </v-stepper-items>
    </Stepper>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const Vertical = Template.bind({});
Vertical.args = {
  vertical: true,
};

export const AltLabels = Template.bind({});
AltLabels.args = {
  altLabels: true,
};

export const NonLinear = Template.bind({});
NonLinear.args = {
  nonLinear: true,
};
