import ProgressCircular from './ProgressCircular.vue';

export default {
  title: 'Atoms/ProgressCircular',
  component: ProgressCircular,
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100 },
    },
    size: {
      control: { type: 'number' },
    },
    width: {
      control: { type: 'number' },
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'error', 'warning', 'info', 'accent'],
    },
    indeterminate: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ProgressCircular },
  template: '<ProgressCircular v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  value: 50,
};

export const Indeterminate = Template.bind({});
Indeterminate.args = {
  indeterminate: true,
};

export const WithValue = () => ({
  components: { ProgressCircular },
  template: `
    <div style="display: flex; gap: 24px; align-items: center;">
      <ProgressCircular :value="25" :size="50">25%</ProgressCircular>
      <ProgressCircular :value="50" :size="50">50%</ProgressCircular>
      <ProgressCircular :value="75" :size="50">75%</ProgressCircular>
      <ProgressCircular :value="100" :size="50" color="success">100%</ProgressCircular>
    </div>
  `,
});

export const Sizes = () => ({
  components: { ProgressCircular },
  template: `
    <div style="display: flex; gap: 24px; align-items: center;">
      <ProgressCircular indeterminate :size="20" />
      <ProgressCircular indeterminate :size="32" />
      <ProgressCircular indeterminate :size="48" />
      <ProgressCircular indeterminate :size="64" />
      <ProgressCircular indeterminate :size="96" />
    </div>
  `,
});

export const Colors = () => ({
  components: { ProgressCircular },
  template: `
    <div style="display: flex; gap: 24px; align-items: center;">
      <ProgressCircular indeterminate color="primary" />
      <ProgressCircular indeterminate color="secondary" />
      <ProgressCircular indeterminate color="success" />
      <ProgressCircular indeterminate color="error" />
      <ProgressCircular indeterminate color="warning" />
      <ProgressCircular indeterminate color="info" />
    </div>
  `,
});

export const Width = () => ({
  components: { ProgressCircular },
  template: `
    <div style="display: flex; gap: 24px; align-items: center;">
      <ProgressCircular :value="70" :size="64" :width="2" />
      <ProgressCircular :value="70" :size="64" :width="4" />
      <ProgressCircular :value="70" :size="64" :width="6" />
      <ProgressCircular :value="70" :size="64" :width="8" />
    </div>
  `,
});

export const Rotate = () => ({
  components: { ProgressCircular },
  template: `
    <div style="display: flex; gap: 24px; align-items: center;">
      <ProgressCircular :value="45" :size="64" :rotate="0">0°</ProgressCircular>
      <ProgressCircular :value="45" :size="64" :rotate="90">90°</ProgressCircular>
      <ProgressCircular :value="45" :size="64" :rotate="180">180°</ProgressCircular>
      <ProgressCircular :value="45" :size="64" :rotate="270">270°</ProgressCircular>
    </div>
  `,
});

export const InButton = () => ({
  components: { ProgressCircular },
  template: `
    <button class="loading-btn">
      <ProgressCircular indeterminate :size="20" :width="2" color="white" />
      Loading...
    </button>
    <style>
      .loading-btn {
        padding: 12px 24px;
        background: #1976d2;
        color: white;
        border: none;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }
    </style>
  `,
});

export const AnimatedProgress = () => ({
  components: { ProgressCircular },
  data() {
    return { progress: 0 };
  },
  mounted() {
    this.interval = setInterval(() => {
      this.progress = (this.progress + 10) % 110;
    }, 500);
  },
  beforeDestroy() {
    clearInterval(this.interval);
  },
  template: '<ProgressCircular :value="progress" :size="64" color="primary">{{ progress }}%</ProgressCircular>',
});
