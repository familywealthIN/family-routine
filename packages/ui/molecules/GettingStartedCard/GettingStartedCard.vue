<template>
  <!--
    "Getting started" (`Profile and About.dc.html` § AP/AT/AD).

    The old page said all three steps in one paragraph. Here each step is a LINK
    to the page where you do that thing, so the instruction and the door are the
    same object — which is the whole argument of the Goals cascade applied to
    onboarding.

    A real `<a href>` is rendered (not a div with a click) so middle-click and
    "open in new tab" work; the click is intercepted so in-app navigation goes
    through the router instead of reloading the SPA.
  -->
  <section class="rn-astart" data-testid="getting-started">
    <div class="rn-astart__head">GETTING STARTED</div>

    <a
      v-for="(step, index) in steps"
      :key="step.key"
      class="rn-astart__step"
      :class="{ 'rn-astart__step--last': index === steps.length - 1 }"
      :href="step.route"
      :data-testid="`getting-started-${step.key}`"
      @click="go($event, step)"
    >
      <span class="rn-astart__n">{{ index + 1 }}</span>
      <span class="rn-astart__text">
        <span class="rn-astart__title">{{ step.title }}</span>
        <span class="rn-astart__sub">{{ step.text }}</span>
      </span>
      <i class="rn-mi rn-astart__chevron">chevron_right</i>
    </a>
  </section>
</template>

<script>
import { GETTING_STARTED } from '../../constants/about';

export default {
  name: 'MoleculeGettingStartedCard',
  props: {
    steps: { type: Array, default: () => GETTING_STARTED },
  },
  methods: {
    go(event, step) {
      // The router belongs to the page — this only reports which door was opened.
      event.preventDefault();
      this.$emit('navigate', step.route, step);
    },
  },
};
</script>

<style>
.rn-astart {
  padding: 16px 18px 8px;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-astart__head {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-astart__step {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, .06);
  color: inherit;
  text-decoration: none;
}

.rn-astart__step--last {
  border-bottom: 0;
}

.rn-astart__n {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(40, 139, 213, .12);
  color: #1f6fab;
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-astart__text {
  flex: 1;
  min-width: 0;
}

.rn-astart__title {
  display: block;
  font-size: 14px;
  font-weight: 700;
}

.rn-astart__sub {
  display: block;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(0, 0, 0, .62);
  margin-top: 2px;
}

.rn-astart__chevron {
  font-size: 20px;
  color: rgba(0, 0, 0, .3);
  align-self: center;
  flex-shrink: 0;
}
</style>
