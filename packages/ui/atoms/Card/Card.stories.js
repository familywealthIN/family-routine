import Card from './Card.vue';

export default {
  title: 'Atoms/Card',
  component: Card,
  argTypes: {
    color: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'info', 'warning', 'error', undefined],
    },
    dark: { control: 'boolean' },
    flat: { control: 'boolean' },
    hover: { control: 'boolean' },
    raised: { control: 'boolean' },
    tile: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Card },
  template: `
    <Card v-bind="$props" style="max-width: 400px; padding: 16px;">
      <h3>Card Title</h3>
      <p>This is the card content. Cards are surfaces that display content and actions on a single topic.</p>
    </Card>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const Flat = Template.bind({});
Flat.args = {
  flat: true,
};

export const Raised = Template.bind({});
Raised.args = {
  raised: true,
};

export const Dark = Template.bind({});
Dark.args = {
  dark: true,
  color: 'primary',
};

export const Hover = Template.bind({});
Hover.args = {
  hover: true,
};

export const WithImage = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Card },
  template: `
    <Card v-bind="$props" style="max-width: 400px;">
      <div style="padding: 16px;">
        <h3>Image Card</h3>
        <p>Card with a background image.</p>
      </div>
    </Card>
  `,
});
WithImage.args = {
  img: 'https://picsum.photos/400/200',
  dark: true,
};
