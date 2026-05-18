import Select from './Select.vue';

export default {
  title: 'Atoms/Select',
  component: Select,
  argTypes: {
    multiple: { control: 'boolean' },
    chips: { control: 'boolean' },
    clearable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    loading: { control: 'boolean' },
    dense: { control: 'boolean' },
    solo: { control: 'boolean' },
    outline: { control: 'boolean' },
    filled: { control: 'boolean' },
  },
};

const defaultItems = [
  { text: 'Option 1', value: 1 },
  { text: 'Option 2', value: 2 },
  { text: 'Option 3', value: 3 },
  { text: 'Option 4', value: 4 },
  { text: 'Option 5', value: 5 },
];

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Select },
  data() {
    return { selected: null };
  },
  template: '<Select v-model="selected" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  label: 'Select an option',
  items: defaultItems,
};

export const WithPlaceholder = Template.bind({});
WithPlaceholder.args = {
  label: 'Select',
  placeholder: 'Choose...',
  items: defaultItems,
};

export const WithHint = Template.bind({});
WithHint.args = {
  label: 'Priority',
  hint: 'Select the priority level',
  persistentHint: true,
  items: defaultItems,
};

export const Clearable = Template.bind({});
Clearable.args = {
  label: 'Clearable Select',
  items: defaultItems,
  clearable: true,
};

export const Multiple = () => ({
  components: { Select },
  data() {
    return {
      selected: [],
      items: defaultItems,
    };
  },
  template: '<Select v-model="selected" :items="items" label="Multiple Select" multiple />',
});

export const MultipleWithChips = () => ({
  components: { Select },
  data() {
    return {
      selected: [],
      items: defaultItems,
    };
  },
  template: '<Select v-model="selected" :items="items" label="With Chips" multiple chips deletable-chips />',
});

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'Disabled',
  items: defaultItems,
  disabled: true,
};

export const Loading = Template.bind({});
Loading.args = {
  label: 'Loading',
  items: defaultItems,
  loading: true,
};

export const Error = Template.bind({});
Error.args = {
  label: 'Select',
  items: defaultItems,
  error: true,
  errorMessages: 'This field is required',
};

export const Solo = Template.bind({});
Solo.args = {
  items: defaultItems,
  solo: true,
  placeholder: 'Solo select',
};

export const Outline = Template.bind({});
Outline.args = {
  label: 'Outline',
  items: defaultItems,
  outline: true,
};

export const Filled = Template.bind({});
Filled.args = {
  label: 'Filled',
  items: defaultItems,
  filled: true,
};

export const Dense = Template.bind({});
Dense.args = {
  label: 'Dense',
  items: defaultItems,
  dense: true,
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  label: 'Category',
  items: defaultItems,
  prependIcon: 'mdi-folder',
};

export const Variants = () => ({
  components: { Select },
  data() {
    return {
      items: defaultItems,
    };
  },
  template: `
    <div style="display: flex; flex-direction: column; gap: 16px; max-width: 400px;">
      <Select :items="items" label="Default" />
      <Select :items="items" label="Solo" solo />
      <Select :items="items" label="Outline" outline />
      <Select :items="items" label="Filled" filled />
      <Select :items="items" label="Box" box />
      <Select :items="items" label="Dense" dense />
    </div>
  `,
});

export const SimpleStringItems = () => ({
  components: { Select },
  data() {
    return {
      selected: null,
      items: ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'],
    };
  },
  template: '<Select v-model="selected" :items="items" label="Fruits" />',
});
