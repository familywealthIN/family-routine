import StepperContent from './StepperContent.vue';

export default {
  title: 'Atoms/StepperContent',
  component: StepperContent,
  argTypes: {
    step: {
      control: 'text',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { StepperContent },
  template: `
    <v-stepper value="1">
      <v-stepper-header>
        <v-stepper-step step="1">Step 1</v-stepper-step>
      </v-stepper-header>
      <v-stepper-items>
        <StepperContent v-bind="$props">
          <v-card class="mb-4" color="grey lighten-4">
            <v-card-text>
              <h3>Welcome to the Setup Wizard</h3>
              <p>This is the content area for Step 1.</p>
            </v-card-text>
          </v-card>
          <v-btn color="primary">Continue</v-btn>
        </StepperContent>
      </v-stepper-items>
    </v-stepper>
  `,
});

export const Default = Template.bind({});
Default.args = {
  step: '1',
};

export const WithForm = () => ({
  components: { StepperContent },
  template: `
    <v-stepper value="1">
      <v-stepper-items>
        <StepperContent step="1">
          <v-form>
            <v-text-field label="Full Name" outlined></v-text-field>
            <v-text-field label="Email" type="email" outlined></v-text-field>
          </v-form>
          <v-btn color="primary">Continue</v-btn>
        </StepperContent>
      </v-stepper-items>
    </v-stepper>
  `,
});
