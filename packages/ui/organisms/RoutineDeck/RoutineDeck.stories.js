import RoutineDeck from './RoutineDeck.vue';

export default {
  title: 'Organisms/RoutineDeck',
  component: RoutineDeck,
  argTypes: {
    hasPrev: { control: 'boolean' },
    hasNext: { control: 'boolean' },
  },
};

// The deck only owns the swipe gesture; the page puts the focus card in the
// default slot. A plain card stands in for it here so the story needs no data.
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RoutineDeck },
  template: `
    <div style="width: 380px; padding: 12px;">
      <RoutineDeck v-bind="$props" @next="onSwipe('next')" @prev="onSwipe('prev')">
        <div style="padding: 20px; background: #fff; border-radius: 16px; min-height: 180px;">
          <div style="font-size: 12px; letter-spacing: .08em; color: rgba(0,0,0,.5);">08:30 · NOW</div>
          <div style="font-size: 22px; font-weight: 600; margin: 4px 0 12px;">Start office work</div>
          <div style="color: rgba(0,0,0,.6);">Ship the pricing page</div>
          <div style="color: rgba(0,0,0,.6);">Email two beta users</div>
          <div style="margin-top: 16px; font-size: 12px; color: rgba(0,0,0,.45);">Swipe the card sideways to switch routine</div>
        </div>
      </RoutineDeck>
    </div>`,
  methods: {
    onSwipe(direction) {
      console.log('swipe', direction);
    },
  },
});

export const Middle = Template.bind({});
Middle.args = { hasPrev: true, hasNext: true };

export const FirstRoutine = Template.bind({});
FirstRoutine.args = { hasPrev: false, hasNext: true };

export const LastRoutine = Template.bind({});
LastRoutine.args = { hasPrev: true, hasNext: false };
