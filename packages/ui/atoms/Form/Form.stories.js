import Form from './Form.vue';

export default {
  title: 'Atoms/Form',
  component: Form,
  argTypes: {
    lazyValidation: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Form },
  data() {
    return {
      valid: true,
      name: '',
      email: '',
      rules: {
        required: [(v) => !!v || 'Required'],
        email: [(v) => /.+@.+\..+/.test(v) || 'E-mail must be valid'],
      },
    };
  },
  template: `
    <v-card style="max-width: 500px; padding: 16px;">
      <Form ref="form" v-model="valid" v-bind="$props">
        <v-text-field
          v-model="name"
          :rules="rules.required"
          label="Name"
          required
        ></v-text-field>
        <v-text-field
          v-model="email"
          :rules="[...rules.required, ...rules.email]"
          label="Email"
          required
        ></v-text-field>
        <v-btn
          :disabled="!valid"
          color="primary"
          @click="submit"
        >
          Submit
        </v-btn>
        <v-btn flat @click="reset">Reset</v-btn>
      </Form>
    </v-card>
  `,
  methods: {
    submit() {
      if (this.$refs.form.validate()) {
        console.log('Form submitted:', { name: this.name, email: this.email });
      }
    },
    reset() {
      this.$refs.form.reset();
    },
  },
});

export const Default = Template.bind({});
Default.args = {};

export const LazyValidation = Template.bind({});
LazyValidation.args = {
  lazyValidation: true,
};
