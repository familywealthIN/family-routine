import Container from './Container.vue';

export default {
  title: 'Atoms/Container',
  component: Container,
  argTypes: {
    fluid: {
      control: 'boolean',
    },
    gridListMd: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { Container },
  template: `
    <Container v-bind="$props">
      <div style="background: #e3f2fd; padding: 20px; text-align: center;">
        Container Content
      </div>
    </Container>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const Fluid = Template.bind({});
Fluid.args = {
  fluid: true,
};

export const WithGridList = Template.bind({});
WithGridList.args = {
  gridListMd: true,
};
