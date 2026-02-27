import AtomCheckbox from './Checkbox.vue';

export default {
  title: 'Atoms/Checkbox',
  component: AtomCheckbox,
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'accent'],
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AtomCheckbox },
  data() {
    return { checked: args.value || false };
  },
  template: '<AtomCheckbox v-model="checked" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  label: 'Accept terms and conditions',
};

export const Checked = Template.bind({});
Checked.args = {
  label: 'I agree',
  value: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  label: 'Disabled checkbox',
  disabled: true,
};

export const DisabledChecked = Template.bind({});
DisabledChecked.args = {
  label: 'Disabled checked',
  value: true,
  disabled: true,
};

export const WithColor = Template.bind({});
WithColor.args = {
  label: 'Success colored',
  color: 'success',
  value: true,
};

export const Indeterminate = Template.bind({});
Indeterminate.args = {
  label: 'Indeterminate state',
  indeterminate: true,
};

export const WithHint = Template.bind({});
WithHint.args = {
  label: 'With hint text',
  hint: 'This is a helpful hint',
  persistentHint: true,
};

export const WithError = Template.bind({});
WithError.args = {
  label: 'Required field',
  error: true,
  errorMessages: 'This field is required',
};

export const MultipleCheckboxes = () => ({
  components: { AtomCheckbox },
  data() {
    return {
      selected: ['option1'],
      options: [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' },
      ],
    };
  },
  template: `
    <div>
      <AtomCheckbox
        v-for="option in options"
        :key="option.value"
        v-model="selected"
        :label="option.label"
        :value="option.value"
        class="mb-2"
      />
      <p class="mt-4">Selected: {{ selected.join(', ') }}</p>
    </div>
  `,
});

export const CustomLabel = () => ({
  components: { AtomCheckbox },
  data() {
    return { checked: false };
  },
  template: `
    <AtomCheckbox v-model="checked" color="primary">
      <template #label>
        <span>I accept the <a href="#" @click.stop>terms of service</a></span>
      </template>
    </AtomCheckbox>
  `,
});
