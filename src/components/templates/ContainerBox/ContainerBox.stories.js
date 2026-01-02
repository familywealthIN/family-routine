// templates/ContainerBox/ContainerBox.stories.js
import ContainerBox from './ContainerBox.vue';

export default {
  title: 'Templates/ContainerBox',
  component: ContainerBox,
  argTypes: {
    isLoading: {
      control: { type: 'boolean' },
    },
    transparent: {
      control: { type: 'boolean' },
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ContainerBox },
  template: `
    <ContainerBox v-bind="$props">
      <div style="padding: 20px;">
        <h2>Content Inside Container</h2>
        <p>This is the slotted content that appears inside the container box.</p>
      </div>
    </ContainerBox>
  `,
});

export const Default = Template.bind({});
Default.args = {
  isLoading: false,
  transparent: false,
};

export const Loading = Template.bind({});
Loading.args = {
  isLoading: true,
  transparent: false,
};

export const Transparent = Template.bind({});
Transparent.args = {
  isLoading: false,
  transparent: true,
};

export const WithComplexContent = () => ({
  components: { ContainerBox },
  template: `
    <ContainerBox>
      <v-card-title>Example Card Title</v-card-title>
      <v-card-text>
        <p>This demonstrates a container box with more complex content.</p>
        <v-btn color="primary">Action Button</v-btn>
      </v-card-text>
    </ContainerBox>
  `,
});
