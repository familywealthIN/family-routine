// atoms/ScrollShadowIndicator/ScrollShadowIndicator.stories.js
import ScrollShadowIndicator from './ScrollShadowIndicator.vue';

export default {
  title: 'Atoms/ScrollShadowIndicator',
  component: ScrollShadowIndicator,
  argTypes: {
    showTop: {
      control: 'boolean',
    },
    showBottom: {
      control: 'boolean',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ScrollShadowIndicator },
  template: `
    <div style="height: 100vh; overflow: auto; position: relative;">
      <ScrollShadowIndicator v-bind="$props" />
      <div style="padding: 80px 20px;">
        <h2>Scroll Content</h2>
        <p v-for="i in 50" :key="i">
          Line {{ i }}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>
    </div>
  `,
});

export const NoShadows = Template.bind({});
NoShadows.args = {
  showTop: false,
  showBottom: false,
};

export const TopShadow = Template.bind({});
TopShadow.args = {
  showTop: true,
  showBottom: false,
};

export const BottomShadow = Template.bind({});
BottomShadow.args = {
  showTop: false,
  showBottom: true,
};

export const BothShadows = Template.bind({});
BothShadows.args = {
  showTop: true,
  showBottom: true,
};

export const Interactive = () => ({
  components: { ScrollShadowIndicator },
  data() {
    return {
      showTop: false,
      showBottom: true,
    };
  },
  methods: {
    handleScroll(event) {
      const { scrollTop, scrollHeight, clientHeight } = event.target;
      this.showTop = scrollTop > 0;
      this.showBottom = scrollTop + clientHeight < scrollHeight - 5;
    },
  },
  template: `
    <div style="height: 100vh; overflow: auto; position: relative;" @scroll="handleScroll">
      <ScrollShadowIndicator :showTop="showTop" :showBottom="showBottom" />
      <div style="padding: 80px 20px;">
        <h2>Scroll to see shadows change</h2>
        <p v-for="i in 100" :key="i">
          Line {{ i }}: Scroll up and down to see the shadow indicators appear and disappear.
        </p>
      </div>
    </div>
  `,
});
