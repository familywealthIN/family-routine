import ButtonToggle from './ButtonToggle.vue';

export default {
  title: 'Molecules/ButtonToggle',
  component: ButtonToggle,
  argTypes: {
    mandatory: { control: 'boolean' },
    multiple: { control: 'boolean' },
    flat: { control: 'boolean' },
    small: { control: 'boolean' },
    large: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ButtonToggle },
  data() {
    return { selected: null };
  },
  template: '<ButtonToggle v-model="selected" v-bind="$props" />',
});

export const TextOnly = Template.bind({});
TextOnly.args = {
  options: [
    { text: 'Day', value: 'day' },
    { text: 'Week', value: 'week' },
    { text: 'Month', value: 'month' },
  ],
};

export const IconOnly = Template.bind({});
IconOnly.args = {
  options: [
    { icon: 'mdi-format-align-left', value: 'left' },
    { icon: 'mdi-format-align-center', value: 'center' },
    { icon: 'mdi-format-align-right', value: 'right' },
    { icon: 'mdi-format-align-justify', value: 'justify' },
  ],
};

export const IconAndText = Template.bind({});
IconAndText.args = {
  options: [
    { icon: 'mdi-view-list', text: 'List', value: 'list' },
    { icon: 'mdi-view-grid', text: 'Grid', value: 'grid' },
    { icon: 'mdi-view-carousel', text: 'Carousel', value: 'carousel' },
  ],
};

export const Mandatory = Template.bind({});
Mandatory.args = {
  options: [
    { text: 'Option A', value: 'a' },
    { text: 'Option B', value: 'b' },
    { text: 'Option C', value: 'c' },
  ],
  mandatory: true,
};

export const Multiple = () => ({
  components: { ButtonToggle },
  data() {
    return {
      selected: [],
      options: [
        { icon: 'mdi-format-bold', value: 'bold' },
        { icon: 'mdi-format-italic', value: 'italic' },
        { icon: 'mdi-format-underline', value: 'underline' },
        { icon: 'mdi-format-strikethrough', value: 'strikethrough' },
      ],
    };
  },
  template: '<ButtonToggle v-model="selected" :options="options" multiple />',
});

export const Small = Template.bind({});
Small.args = {
  options: [
    { text: 'S', value: 's' },
    { text: 'M', value: 'm' },
    { text: 'L', value: 'l' },
    { text: 'XL', value: 'xl' },
  ],
  small: true,
};

export const Large = Template.bind({});
Large.args = {
  options: [
    { text: 'Small', value: 'small' },
    { text: 'Medium', value: 'medium' },
    { text: 'Large', value: 'large' },
  ],
  large: true,
};

export const WithDisabledOption = Template.bind({});
WithDisabledOption.args = {
  options: [
    { text: 'Available', value: 'available' },
    { text: 'Unavailable', value: 'unavailable', disabled: true },
    { text: 'Available', value: 'available2' },
  ],
};

export const PeriodSelector = () => ({
  components: { ButtonToggle },
  data() {
    return {
      period: 'week',
      options: [
        { text: 'Day', value: 'day' },
        { text: 'Week', value: 'week' },
        { text: 'Month', value: 'month' },
        { text: 'Year', value: 'year' },
      ],
    };
  },
  template: `
    <div>
      <ButtonToggle v-model="period" :options="options" mandatory />
      <p style="margin-top: 16px;">Selected period: {{ period }}</p>
    </div>
  `,
});

export const ViewModeToggle = () => ({
  components: { ButtonToggle },
  data() {
    return {
      viewMode: 'list',
      options: [
        { icon: 'mdi-view-list', value: 'list' },
        { icon: 'mdi-view-grid', value: 'grid' },
        { icon: 'mdi-view-module', value: 'module' },
      ],
    };
  },
  template: `
    <div>
      <ButtonToggle v-model="viewMode" :options="options" mandatory />
      <p style="margin-top: 16px;">View mode: {{ viewMode }}</p>
    </div>
  `,
});
