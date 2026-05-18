import AtomImg from './Img.vue';

export default {
  title: 'Atoms/Img',
  component: AtomImg,
  argTypes: {
    src: { control: 'text' },
    aspectRatio: { control: 'number' },
    gradient: { control: 'text' },
    contain: { control: 'boolean' },
    height: { control: 'text' },
    maxHeight: { control: 'text' },
    maxWidth: { control: 'text' },
    width: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AtomImg },
  template: '<atom-img v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  src: 'https://cdn.vuetifyjs.com/images/cards/forest.jpg',
  aspectRatio: 1.7,
};

export const WithGradient = () => ({
  components: { AtomImg },
  template: `
    <atom-img 
      src="https://cdn.vuetifyjs.com/images/cards/forest.jpg"
      gradient="to top, rgba(0,0,0,.44), rgba(0,0,0,.44)"
      height="200"
    >
      <div class="white--text pa-3">Overlay Content</div>
    </atom-img>
  `,
});

export const Contained = Template.bind({});
Contained.args = {
  src: 'https://cdn.vuetifyjs.com/images/cards/forest.jpg',
  contain: true,
  height: '200',
  width: '300',
};

export const FixedSize = Template.bind({});
FixedSize.args = {
  src: 'https://cdn.vuetifyjs.com/images/cards/forest.jpg',
  height: '150',
  width: '250',
};
