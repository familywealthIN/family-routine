import BtnToggle from './BtnToggle.vue';

export default {
  title: 'Atoms/BtnToggle',
  component: BtnToggle,
  argTypes: {
    mandatory: { control: 'boolean' },
    multiple: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { BtnToggle },
  data() {
    return { selected: 'day' };
  },
  template: `
    <BtnToggle v-model="selected" v-bind="$props">
      <v-btn flat value="day">Today</v-btn>
      <v-btn flat value="week">Week</v-btn>
      <v-btn flat value="month">Month</v-btn>
      <v-btn flat value="year">Year</v-btn>
    </BtnToggle>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const Mandatory = Template.bind({});
Mandatory.args = {
  mandatory: true,
};

export const Multiple = () => ({
  components: { BtnToggle },
  data() {
    return { selected: [] };
  },
  template: `
    <BtnToggle v-model="selected" multiple>
      <v-btn flat value="option1">Option 1</v-btn>
      <v-btn flat value="option2">Option 2</v-btn>
      <v-btn flat value="option3">Option 3</v-btn>
    </BtnToggle>
  `,
});
