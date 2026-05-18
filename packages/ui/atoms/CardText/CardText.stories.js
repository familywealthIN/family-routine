import CardText from './CardText.vue';

export default {
  title: 'Atoms/CardText',
  component: CardText,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { CardText },
  template: `
    <v-card style="max-width: 400px;">
      <CardText v-bind="$props">
        <h2>Card Title</h2>
        <p>This is the card text content area. It provides proper padding and typography styling for text content within a card.</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      </CardText>
    </v-card>
  `,
});

export const Default = Template.bind({});
Default.args = {};

export const WithCustomClass = Template.bind({});
WithCustomClass.args = {
  class: 'text-xs-center',
};
