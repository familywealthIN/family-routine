import Divider from './Divider.vue';

export default {
  title: 'Atoms/Divider',
  component: Divider,
  argTypes: {
    vertical: { control: 'boolean' },
    inset: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Divider },
  template: '<Divider v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {};

export const Inset = Template.bind({});
Inset.args = {
  inset: true,
};

export const Vertical = () => ({
  components: { Divider },
  template: `
    <div style="display: flex; align-items: center; height: 50px;">
      <span>Left</span>
      <Divider vertical style="margin: 0 16px;" />
      <span>Right</span>
    </div>
  `,
});

export const InList = () => ({
  components: { Divider },
  template: `
    <div>
      <div style="padding: 16px;">Item 1</div>
      <Divider />
      <div style="padding: 16px;">Item 2</div>
      <Divider />
      <div style="padding: 16px;">Item 3</div>
    </div>
  `,
});

export const InsetInList = () => ({
  components: { Divider },
  template: `
    <div>
      <div style="padding: 16px;">Item 1</div>
      <Divider inset />
      <div style="padding: 16px;">Item 2</div>
      <Divider inset />
      <div style="padding: 16px;">Item 3</div>
    </div>
  `,
});
