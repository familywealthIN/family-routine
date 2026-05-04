import TimePicker from './TimePicker.vue';

export default {
  title: 'Atoms/TimePicker',
  component: TimePicker,
  argTypes: {
    format: {
      control: { type: 'select' },
      options: ['ampm', '24hr'],
    },
    landscape: {
      control: 'boolean',
    },
    scrollable: {
      control: 'boolean',
    },
    color: {
      control: 'color',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TimePicker },
  data() {
    return {
      time: '09:00',
    };
  },
  template: '<TimePicker v-model="time" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {};

export const Format24Hour = Template.bind({});
Format24Hour.args = {
  format: '24hr',
};

export const Landscape = Template.bind({});
Landscape.args = {
  landscape: true,
};

export const Scrollable = Template.bind({});
Scrollable.args = {
  scrollable: true,
};

export const CustomColor = Template.bind({});
CustomColor.args = {
  color: '#4CAF50',
};

export const InMenu = () => ({
  components: { TimePicker },
  data() {
    return {
      menu: false,
      time: '09:00',
    };
  },
  template: `
    <v-menu
      ref="menu"
      v-model="menu"
      :close-on-content-click="false"
      transition="scale-transition"
      offset-y
      max-width="290px"
      min-width="290px"
    >
      <template v-slot:activator="{ on }">
        <v-text-field
          v-model="time"
          label="Select Time"
          prepend-icon="access_time"
          readonly
          v-on="on"
        ></v-text-field>
      </template>
      <TimePicker v-model="time" full-width @click:minute="menu = false" />
    </v-menu>
  `,
});
