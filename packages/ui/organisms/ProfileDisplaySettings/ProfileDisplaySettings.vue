<template>
  <!--
    Profile's DISPLAY card, on iPads and tablets only (`Profile and About.dc.html`
    § t1, the iPad frame): one row, Always on display, with the same Off/On
    sliding switch as the Time card's 12h/24h. The page decides whether the
    device is a tablet; this card only draws the choice.
  -->
  <section class="rn-pdisplay" data-testid="profile-display">
    <div class="rn-pdisplay__head">DISPLAY</div>

    <div class="rn-pdisplay__row">
      <div class="rn-pdisplay__text">
        <div class="rn-pdisplay__label">
          <i
            class="rn-mi rn-pdisplay__icon"
            :style="{ color: copy.iconColor }"
            data-testid="profile-always-on-icon"
          >{{ copy.icon }}</i>
          Always on display
        </div>
        <div class="rn-pdisplay__sub" data-testid="profile-always-on-sub">{{ copy.sub }}</div>
      </div>
      <sliding-switch
        class="rn-pdisplay__switch"
        :segments="options"
        :value="alwaysOn ? 'on' : 'off'"
        data-testid="profile-always-on"
        @change="onChange"
      />
    </div>
  </section>
</template>

<script>
import SlidingSwitch from '../../molecules/SlidingSwitch/SlidingSwitch.vue';
import { ALWAYS_ON_OPTIONS, alwaysOnCopy } from '../../constants/profile';

export default {
  name: 'OrganismProfileDisplaySettings',
  components: { SlidingSwitch },
  props: {
    alwaysOn: { type: Boolean, default: false },
  },
  computed: {
    options() {
      return ALWAYS_ON_OPTIONS;
    },
    copy() {
      return alwaysOnCopy(this.alwaysOn);
    },
  },
  methods: {
    onChange(key) {
      const on = key === 'on';
      if (on !== this.alwaysOn) this.$emit('change-always-on', on);
    },
  },
};
</script>

<style>
/* The Time card's geometry (ProfileTimeSettings), so the two cards line up. */
.rn-pdisplay {
  padding: 6px 16px;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-pdisplay__head {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
  padding: 10px 0 2px;
}

.rn-pdisplay__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 10px 0;
  min-height: 60px;
}

.rn-pdisplay__text {
  flex: 1 1 170px;
  min-width: 0;
}

.rn-pdisplay__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
}

.rn-pdisplay__icon {
  font-size: 18px;
  transition: color .2s;
}

.rn-pdisplay__sub {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

.rn-pdisplay__switch {
  width: 112px;
  flex-shrink: 0;
  margin-left: auto;
}
</style>
