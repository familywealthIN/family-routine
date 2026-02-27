import StepperHeader from './StepperHeader.vue';

export default {
  title: 'Atoms/StepperHeader',
  component: StepperHeader,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { StepperHeader },
  template: `
    <v-stepper value="2">
      <StepperHeader v-bind="$props">
        <v-stepper-step complete step="1">Account</v-stepper-step>
        <v-divider></v-divider>
        <v-stepper-step step="2">Profile</v-stepper-step>
        <v-divider></v-divider>
        <v-stepper-step step="3">Review</v-stepper-step>
      </StepperHeader>
    </v-stepper>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const FourSteps = () => ({
  components: { StepperHeader },
  template: `
    <v-stepper value="2">
      <StepperHeader>
        <v-stepper-step complete step="1">Sleep Schedule</v-stepper-step>
        <v-divider></v-divider>
        <v-stepper-step step="2">Work Hours</v-stepper-step>
        <v-divider></v-divider>
        <v-stepper-step step="3">Morning Routine</v-stepper-step>
        <v-divider></v-divider>
        <v-stepper-step step="4">Evening Routine</v-stepper-step>
      </StepperHeader>
    </v-stepper>
  `,
});
