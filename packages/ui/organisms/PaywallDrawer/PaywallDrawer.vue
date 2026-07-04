<template>
  <atom-bottom-sheet :value="value" inset max-width="480" @input="$emit('input', $event)">
    <v-card class="paywall-drawer">
      <div class="paywall-drawer__header">
        <v-icon color="primary" large>diamond</v-icon>
        <h3 class="paywall-drawer__title">{{ title }}</h3>
        <p class="paywall-drawer__subtitle">{{ subtitle }}</p>
      </div>

      <div v-if="showPurchase" class="paywall-drawer__plans">
        <v-card
          v-for="plan in plans"
          :key="plan.id"
          class="paywall-drawer__plan"
          :class="{ 'paywall-drawer__plan--featured': plan.featured }"
          @click="$emit('select-plan', plan)"
        >
          <div class="paywall-drawer__plan-name">{{ plan.name }}</div>
          <div class="paywall-drawer__plan-price">{{ plan.price }}</div>
          <div class="paywall-drawer__plan-note">{{ plan.note }}</div>
        </v-card>
      </div>

      <div v-else class="paywall-drawer__plans paywall-drawer__plans--preview">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="paywall-drawer__plan paywall-drawer__plan--preview"
        >
          <div class="paywall-drawer__plan-name">{{ plan.name }}</div>
          <div class="paywall-drawer__plan-price">{{ plan.price }}</div>
          <div class="paywall-drawer__plan-note">{{ plan.note }}</div>
        </div>
        <p class="paywall-drawer__coming-soon">
          Subscriptions are coming soon. Keep earning points by completing your
          routine, goals and milestones — every day banks more redeems.
        </p>
      </div>

      <div class="paywall-drawer__footer">
        <v-btn flat block @click="$emit('input', false)">Keep earning points</v-btn>
      </div>
    </v-card>
  </atom-bottom-sheet>
</template>

<script>
import AtomBottomSheet from '../../atoms/BottomSheet/BottomSheet.vue';

export const DEFAULT_PLANS = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$4.99 / month',
    note: 'Redeem any missed task, any day',
  },
  {
    id: 'annual',
    name: 'Annual',
    price: '$49.99 / year',
    note: 'Same benefits — 2 months free',
    featured: true,
  },
];

export default {
  name: 'PaywallDrawer',
  components: { AtomBottomSheet },
  props: {
    value: {
      type: Boolean,
      default: false,
    },
    // Frozen cost of the task the user tried to redeem (0 = generic pitch)
    cost: {
      type: Number,
      default: 0,
    },
    available: {
      type: Number,
      default: 0,
    },
    plans: {
      type: Array,
      default: () => DEFAULT_PLANS,
    },
    // Purchase CTAs are feature-flagged off until PayPal + native IAP land.
    showPurchase: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    title() {
      return this.cost > 0 ? 'Not enough points' : "You're out of points";
    },
    subtitle() {
      if (this.cost > 0) {
        return `This task costs ${Math.round(this.cost)} points — you have ${Math.round(this.available)}. `
          + 'Subscribe to check missed routine tasks anytime.';
      }
      return 'Subscribe to check missed routine tasks anytime.';
    },
  },
};
</script>

<style scoped>
.paywall-drawer {
  padding: 24px 20px 12px;
  border-radius: 16px 16px 0 0;
}

.paywall-drawer__header {
  text-align: center;
  margin-bottom: 20px;
}

.paywall-drawer__title {
  margin: 12px 0 4px;
  font-size: 20px;
}

.paywall-drawer__subtitle {
  margin: 0;
  color: rgba(0, 0, 0, 0.6);
  font-size: 14px;
}

.paywall-drawer__plans {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.paywall-drawer__plan {
  flex: 1 1 160px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
}

.paywall-drawer__plan--featured {
  border-color: var(--v-primary-base, #288bd5);
}

.paywall-drawer__plan--preview {
  cursor: default;
  opacity: 0.75;
}

.paywall-drawer__plan-name {
  font-weight: 600;
}

.paywall-drawer__plan-price {
  font-size: 18px;
  margin: 4px 0;
}

.paywall-drawer__plan-note {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
}

.paywall-drawer__coming-soon {
  flex-basis: 100%;
  text-align: center;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.6);
  margin: 12px 0 0;
}

.paywall-drawer__footer {
  margin-top: 16px;
}
</style>
