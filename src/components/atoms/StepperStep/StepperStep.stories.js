import StepperStep from './StepperStep.vue';

export default {
  title: 'Atoms/StepperStep',
  component: StepperStep,
  argTypes: {
    step: {
      control: 'text',
    },
    complete: {
      control: 'boolean',
    },
    editable: {
      control: 'boolean',
    },
    rules: {
      control: 'object',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { StepperStep },
  template: `
    <v-stepper value="2">
      <v-stepper-header>
        <StepperStep v-bind="$props">{{ label }}</StepperStep>
      </v-stepper-header>
    </v-stepper>
  `,
});

export const Default = Template.bind({});
Default.args = {
  step: '1',
  label: 'Step Title',
};

export const Complete = Template.bind({});
Complete.args = {
  step: '1',
  complete: true,
  label: 'Completed Step',
};

export const Editable = Template.bind({});
Editable.args = {
  step: '1',
  complete: true,
  editable: true,
  label: 'Editable Step',
};

export const WithError = Template.bind({});
WithError.args = {
  step: '1',
  rules: [() => false],
  label: 'Step with Error',
};

export const AllStates = () => ({
  components: { StepperStep },
  template: `
    <v-stepper value="2">
      <v-stepper-header>
        <StepperStep step="1" complete>Completed</StepperStep>
        <v-divider></v-divider>
        <StepperStep step="2">Current</StepperStep>
        <v-divider></v-divider>
        <StepperStep step="3">Upcoming</StepperStep>
      </v-stepper-header>
    </v-stepper>
  `,
});
