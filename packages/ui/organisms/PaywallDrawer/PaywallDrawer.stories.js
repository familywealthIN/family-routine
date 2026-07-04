import PaywallDrawer from './PaywallDrawer.vue';

export default {
  title: 'Organisms/PaywallDrawer',
  component: PaywallDrawer,
  argTypes: {
    value: { control: 'boolean' },
    cost: { control: 'number' },
    available: { control: 'number' },
    showPurchase: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PaywallDrawer },
  template: `
    <PaywallDrawer
      v-bind="$props"
      @input="onInput"
      @select-plan="onSelectPlan"
    />
  `,
  methods: {
    onInput(open) {
      console.log('drawer open:', open);
    },
    onSelectPlan(plan) {
      console.log('selected plan:', plan);
    },
  },
});

export const InsufficientPoints = Template.bind({});
InsufficientPoints.args = {
  value: true,
  cost: 40,
  available: 15,
};

export const OutOfPoints = Template.bind({});
OutOfPoints.args = {
  value: true,
  cost: 0,
  available: 0,
};

export const WithPurchaseEnabled = Template.bind({});
WithPurchaseEnabled.args = {
  value: true,
  cost: 40,
  available: 15,
  showPurchase: true,
};
