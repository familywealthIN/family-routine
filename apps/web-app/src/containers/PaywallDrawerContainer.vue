<template>
  <!--
    Modal container for the paywall drawer (see ARCHITECTURE.md).
    Owns the drawer + its open/cost state. `available` (from XP_BALANCE_QUERY)
    stays page-owned because the page also needs it for redeem-affordability
    checks — it's passed in as a prop. The page calls `open(cost)`.
  -->
  <PaywallDrawer
    v-model="isOpen"
    :cost="cost"
    :available="available"
    :show-purchase="showPurchase"
  />
</template>

<script>
import { PaywallDrawer } from '@routine-notes/ui/organisms';

export default {
  name: 'PaywallDrawerContainer',
  components: { PaywallDrawer },
  props: {
    // Spendable points — page-owned (cross-cutting: paywall + redeem checks).
    available: {
      type: Number,
      default: 0,
    },
    showPurchase: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      isOpen: false,
      cost: 0,
    };
  },
  methods: {
    open(cost) {
      this.cost = cost || 0;
      this.isOpen = true;
    },
    close() {
      this.isOpen = false;
    },
  },
};
</script>
