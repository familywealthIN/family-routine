<template>
  <!--
    One overlay, two shapes. Phone/tablet get a bottom sheet (radius 16 top,
    `0 -8px 24px rgba(0,0,0,.18)`); desktop gets a centred 480px dialog with
    radius 20. Both over a `rgba(0,0,0,.32)` scrim.

    Vuetify's v-dialog/v-bottom-sheet carry their own radii, transitions and
    z-index stack; the focus screen needs exactly the handoff's values, so this
    is a plain overlay instead.
  -->
  <div v-if="value" class="rn-sheet-root" :class="`rn-sheet-root--${mode}`">
    <div class="rn-sheet__scrim" data-testid="sheet-scrim" @click="$emit('input', false)"></div>
    <section class="rn-sheet" :class="`rn-sheet--${mode}`" role="dialog" :aria-label="title">
      <header v-if="title" class="rn-sheet__head">
        <div class="rn-sheet__title">{{ title }}</div>
        <button type="button" class="rn-sheet__close" title="Close" @click="$emit('input', false)">
          <i class="rn-mi">close</i>
        </button>
      </header>
      <div class="rn-sheet__body">
        <slot></slot>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'OrganismRoutineSheet',
  props: {
    value: { type: Boolean, default: false },
    title: { type: String, default: '' },
    /** phone | tablet | desktop — desktop centres, the rest come up from the bottom. */
    variant: { type: String, default: 'phone' },
  },
  computed: {
    mode() {
      return this.variant === 'desktop' ? 'dialog' : 'bottom';
    },
  },
  watch: {
    // A plain overlay gets none of v-dialog's keyboard handling: Escape closes
    // it, listened for only while it is open.
    value: {
      handler(open) {
        if (open) document.addEventListener('keydown', this.onKeydown);
        else document.removeEventListener('keydown', this.onKeydown);
      },
      immediate: true,
    },
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.onKeydown);
  },
  methods: {
    onKeydown(event) {
      if (event.key !== 'Escape' && event.key !== 'Esc') return;
      if (event.defaultPrevented) return;
      this.$emit('input', false);
    },
  },
};
</script>

<style>
.rn-sheet-root {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 70;
  display: flex;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-sheet-root--bottom {
  align-items: flex-end;
}

.rn-sheet-root--dialog {
  align-items: center;
  justify-content: center;
}

.rn-sheet__scrim {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, .32);
  animation: rn-fade .2s ease-out;
}

.rn-sheet {
  position: relative;
  background: #fff;
  max-height: 88vh;
  overflow-y: auto;
  box-sizing: border-box;
}

.rn-sheet--bottom {
  width: 100%;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, .18);
  padding-bottom: env(safe-area-inset-bottom);
  animation: rn-sheet-up .28s cubic-bezier(.4, 0, .2, 1);
}

.rn-sheet--dialog {
  width: 480px;
  max-width: calc(100vw - 48px);
  border-radius: 20px;
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, .35);
  animation: rn-fade .2s ease-out;
}

@keyframes rn-sheet-up {
  from { transform: translateY(100%); }
  to { transform: none; }
}

.rn-sheet__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 16px 8px;
}

.rn-sheet__title {
  font-size: 17px;
  font-weight: 700;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-sheet__close {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgba(0, 0, 0, .54);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-sheet__body {
  padding: 0 16px 16px;
}
</style>
