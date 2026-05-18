import CardTitle from './CardTitle.vue';

export default {
  title: 'Atoms/CardTitle',
  component: CardTitle,
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { CardTitle },
  template: `
    <v-card style="max-width: 400px;">
      <CardTitle v-bind="$props">
        <span class="headline">{{ title }}</span>
      </CardTitle>
      <v-card-text>Card content goes here.</v-card-text>
    </v-card>
  `,
});

export const Default = Template.bind({});
Default.args = {
  title: 'Card Title',
};

export const WithSubtitle = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { CardTitle },
  template: `
    <v-card style="max-width: 400px;">
      <CardTitle>
        <div>
          <span class="headline">Main Title</span>
          <div class="caption grey--text">Subtitle text</div>
        </div>
      </CardTitle>
    </v-card>
  `,
});
