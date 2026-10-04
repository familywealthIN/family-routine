<template>
  <!--
    One overlay, two presentations — docs/redesign/chassis.md § "Sheet vs dialog".
    Every design file draws the same sheet twice (phone bottom sheet, tablet /
    desktop centred dialog), so this is one component with a `shell` prop rather
    than a sheet and a dialog that drift apart.

    Vuetify's v-dialog / v-bottom-sheet are not reused: they carry their own
    radii, transitions, scrim colour and z-index stack, and the chassis pins all
    four to exact values. Overriding them costs more CSS than owning the overlay.
    (`organisms/RoutineSheet` is the Home-only forerunner of this component — it
    hardcodes a 480px desktop dialog, treats tablet as a phone and animates with
    a 100% translate; this is the chassis-exact replacement for the nine screens.)

    `rn-sheet-in` / `rn-modal` live in styles/routine-focus.css. The mocks swap
    between identical `rn-in0`/`rn-in1` keyframes to replay an entrance; bump a
    `:key` on this component instead.
  -->
  <div
    v-if="open"
    class="rn-rsheet"
    :class="`rn-rsheet--${mode}`"
    data-testid="responsive-sheet"
  >
    <div
      class="rn-rsheet__backdrop"
      data-testid="responsive-sheet-backdrop"
      @click="$emit('close')"
    ></div>
    <section
      ref="panel"
      class="rn-rsheet__panel"
      :class="`rn-rsheet__panel--${mode}`"
      :style="panelStyle"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      :aria-label="title || undefined"
    >
      <div
        v-if="showHandle"
        class="rn-rsheet__handle-row"
        data-testid="responsive-sheet-handle"
        @click="$emit('close')"
      >
        <div class="rn-rsheet__handle"></div>
      </div>

      <header v-if="hasHeader" class="rn-rsheet__head">
        <slot name="header">
          <div class="rn-rsheet__title">{{ title }}</div>
        </slot>
        <button
          v-if="closable"
          type="button"
          class="rn-rsheet__close"
          title="Close"
          aria-label="Close"
          data-testid="responsive-sheet-close"
          @click="$emit('close')"
        >
          <i class="rn-mi">close</i>
        </button>
      </header>

      <div class="rn-rsheet__body rn-hidescroll">
        <slot></slot>
      </div>

      <footer v-if="$slots.footer" class="rn-rsheet__foot">
        <slot name="footer"></slot>
      </footer>
    </section>
  </div>
</template>

<script>
/** Chassis dialog widths. Phone ignores both — it spans the viewport. */
const SHELL_WIDTH = { tablet: 860, desktop: 720 };

/**
 * Open sheets, oldest first. Escape closes only the topmost one, so a confirm
 * stacked over an editor does not take the editor down with it.
 */
const openStack = [];

export default {
  name: 'MoleculeResponsiveSheet',
  props: {
    open: { type: Boolean, default: false },
    /** phone | tablet | desktop — the same three shells RoutineFocus resolves. */
    shell: { type: String, default: 'phone' },
    /**
     * Dialog width override for tablet and desktop. The Routines editor needs
     * 560, Year Goals 480, Goals 500.
     */
    width: { type: [Number, String], default: null },
    title: { type: String, default: '' },
    /** The 40x4 grab bar. Phone only — a centred dialog has nothing to drag. */
    handle: { type: Boolean, default: true },
    closable: { type: Boolean, default: true },
  },
  computed: {
    isPhone() {
      return this.shell === 'phone';
    },
    mode() {
      return this.isPhone ? 'sheet' : 'dialog';
    },
    showHandle() {
      return this.isPhone && this.handle;
    },
    hasHeader() {
      return Boolean(this.title) || this.closable || Boolean(this.$slots.header);
    },
    /** Tablet 860 / desktop 720 unless the page overrides it. */
    dialogWidth() {
      if (this.isPhone) return null;
      if (this.width != null && this.width !== '') {
        return typeof this.width === 'number' ? `${this.width}px` : String(this.width);
      }
      return `${SHELL_WIDTH[this.shell] || SHELL_WIDTH.desktop}px`;
    },
    panelStyle() {
      return this.isPhone ? {} : { width: this.dialogWidth };
    },
  },
  watch: {
    open: {
      immediate: true,
      handler(isOpen) {
        if (isOpen) this.activate();
        else this.deactivate();
      },
    },
  },
  beforeDestroy() {
    this.deactivate();
  },
  methods: {
    /**
     * Keyboard parity with the backdrop. Escape emits the same `close` a scrim
     * click does - and every sheet already honours the scrim, `closable` or
     * not, because `closable` only decides whether the × is drawn. So a page
     * that hides the × gets nothing new: just the close event it handles today.
     */
    activate() {
      if (this.active || typeof document === 'undefined') return;
      this.active = true;
      this.returnFocus = document.activeElement;
      openStack.push(this);
      document.addEventListener('keydown', this.onKeydown);
      this.$nextTick(this.focusPanel);
    },
    deactivate() {
      if (!this.active) return;
      this.active = false;
      const i = openStack.indexOf(this);
      if (i !== -1) openStack.splice(i, 1);
      document.removeEventListener('keydown', this.onKeydown);
      // Hand focus back to whatever opened the sheet, if it is still there.
      const back = this.returnFocus;
      this.returnFocus = null;
      if (back && typeof back.focus === 'function' && document.body.contains(back)) {
        back.focus();
      }
    },
    /**
     * Move focus into the dialog so keyboard and screen-reader users land in
     * it, not on the page behind. The panel itself takes focus rather than its
     * first control, which would usually be the × or a destructive button. A
     * page that already focused its own field (the invite input) keeps it.
     */
    focusPanel() {
      const { panel } = this.$refs;
      if (!panel || !this.active || panel.contains(document.activeElement)) return;
      panel.focus();
    },
    onKeydown(event) {
      if (event.key !== 'Escape' && event.key !== 'Esc') return;
      // Something inside (an open menu) already consumed this Escape.
      if (event.defaultPrevented) return;
      if (openStack[openStack.length - 1] !== this) return;
      this.$emit('close');
    },
  },
};
</script>

<style>
.rn-rsheet {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 70;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-rsheet__backdrop {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  animation: rn-fade .18s ease;
}

/* Phone scrim is lighter than the dialog scrim — the sheet still shows the
   screen it came from, the dialog deliberately pushes it back. */
.rn-rsheet--sheet .rn-rsheet__backdrop {
  background: rgba(0, 0, 0, .32);
}

.rn-rsheet--dialog .rn-rsheet__backdrop {
  background: rgba(15, 23, 42, .42);
}

/* 86% is the chassis default — Inbox, Skip-day and the goal-item editor all draw
   it. Two instances override it per-instance (by root class, not by changing this
   number): Start Work at 90% (`.rn-qg-sheet`) and the agent form at 88%
   (`.rn-agf-sheet`), each matching its own design frame. */
.rn-rsheet__panel {
  position: absolute;
  background: #fff;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-height: 86%;
  overflow: hidden;
}

/* Focused programmatically on open (tabindex -1); it is not a control. */
.rn-rsheet__panel:focus {
  outline: none;
}

.rn-rsheet__panel--sheet {
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, .18);
  padding-bottom: env(safe-area-inset-bottom);
  animation: rn-sheet-in .25s cubic-bezier(.3, 1.1, .5, 1);
}

.rn-rsheet__panel--dialog {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  max-width: 94%;
  border-radius: 20px;
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, .35);
  animation: rn-modal .22s cubic-bezier(.3, 1.1, .5, 1);
}

.rn-rsheet__handle-row {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
  flex-shrink: 0;
  cursor: pointer;
}

.rn-rsheet__handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: #ccc;
}

.rn-rsheet__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 8px;
  flex-shrink: 0;
}

.rn-rsheet__title {
  flex: 1;
  min-width: 0;
  font-size: 17px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-rsheet__close {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  margin-left: auto;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgba(0, 0, 0, .54);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-rsheet__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.rn-rsheet__foot {
  flex-shrink: 0;
  padding: 12px 16px 16px;
  border-top: 1px solid rgba(0, 0, 0, .06);
}
</style>
