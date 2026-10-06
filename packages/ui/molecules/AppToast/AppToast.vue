<template>
  <!--
    The chassis toast host. One per screen; the page bumps `seq` to replay it.

    Toast copy is always title + sub, where the sub carries the consequence
    ("streak kept", "Launch mobile dashboard -> 2/3 weeks") — chassis.md § Toast.
    The sub element is therefore unconditional: a toast with no consequence is a
    toast that has not been written yet.

    The mocks restart the animation by alternating two identical keyframes
    (`rn-in0`/`rn-in1`). Vue does it by re-creating the node, so the root carries
    `:key="seq"` and there is only ever one `rn-toast` keyframe.
  -->
  <div
    v-if="visible"
    :key="seq"
    class="rn-toast"
    :class="`rn-toast--${shellName}`"
    data-testid="app-toast"
    @animationend="$emit('done')"
  >
    <i class="rn-mi rn-toast__icon" :style="{ color: iconColor }">{{ icon }}</i>
    <div class="rn-toast__text">
      <div class="rn-toast__title" data-testid="app-toast-title">{{ title }}</div>
      <div class="rn-toast__sub" data-testid="app-toast-sub">{{ sub }}</div>
    </div>
  </div>
</template>

<script>
import { SHELLS, resolveShell } from '../../constants/navigation';

export default {
  name: 'MoleculeAppToast',
  props: {
    /** 'phone' | 'tablet' | 'desktop'. Empty resolves from the one breakpoint rule. */
    shell: { type: String, default: '' },
    title: { type: String, default: '' },
    /** The consequence. Required by the contract, not by the prop validator. */
    sub: { type: String, default: '' },
    icon: { type: String, default: 'check_circle' },
    iconColor: { type: String, default: '#4CAF50' },
    /** Bump to replay the animation for a repeat of the same message. */
    seq: { type: Number, default: 0 },
  },
  computed: {
    shellName() {
      if (SHELLS.indexOf(this.shell) !== -1) return this.shell;
      return resolveShell(this.$vuetify && this.$vuetify.breakpoint);
    },
    visible() {
      return !!this.title;
    },
  },
};
</script>

<style>
.rn-toast {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #1a1a1a;
  color: #fff;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, .3);
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  animation: rn-toast 2.8s ease forwards;
  pointer-events: none;
  /* Above every overlay (drawer z-60, sheets z-70) so a failure toast is never
     hidden behind the dialog that caused it. pointer-events: none keeps it from
     blocking anything underneath. */
  z-index: 75;
}

/* Phone: a full-width pill clear of the 64px tab bar. */
.rn-toast--phone {
  left: 16px;
  right: 16px;
  bottom: 80px;
}

.rn-toast--tablet,
.rn-toast--desktop {
  left: auto;
  right: 24px;
  bottom: 24px;
  width: 360px;
  box-sizing: border-box;
}

.rn-toast__icon {
  font-size: 22px;
  flex-shrink: 0;
}

.rn-toast__text {
  flex: 1;
  min-width: 0;
}

.rn-toast__title {
  font-size: 14px;
  font-weight: 700;
}

.rn-toast__sub {
  font-size: 12px;
  opacity: .75;
}
</style>
