import ChipGroup from './ChipGroup.vue';

export default {
  title: 'Atoms/ChipGroup',
  component: ChipGroup,
  argTypes: {
    multiple: {
      control: 'boolean',
    },
    column: {
      control: 'boolean',
    },
    mandatory: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ChipGroup },
  data() {
    return {
      selected: args.multiple ? [] : null,
    };
  },
  template: `
    <ChipGroup v-model="selected" v-bind="$props">
      <v-chip filter outlined value="option1">Option 1</v-chip>
      <v-chip filter outlined value="option2">Option 2</v-chip>
      <v-chip filter outlined value="option3">Option 3</v-chip>
    </ChipGroup>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const Multiple = Template.bind({});
Multiple.args = {
  multiple: true,
};

export const Column = Template.bind({});
Column.args = {
  column: true,
};

export const Mandatory = Template.bind({});
Mandatory.args = {
  mandatory: true,
};
