<template>
  <!--
    "Message Start Work…" — the composer under the focus card. The "+" opens
    the AI Search sheet; focusing the input collapses the checklist so the
    thread gets the height (design handoff § Composer).
  -->
  <div class="rn-composer" :class="`rn-composer--${variant}`">
    <!--
      Every shell gets the "+". The design draws it in all three composers — a
      40px white circle on the phone, a 42px #f4f4f4 one on tablet and desktop —
      and it is the only way into the capture sheet from the chat pane, so
      hiding it above the phone breakpoint simply removed the affordance.
    -->
    <button
      type="button"
      class="rn-composer__plus"
      title="Add a task"
      data-testid="composer-add"
      @click="$emit('add-task')"
    >
      <i class="rn-mi rn-composer__plus-icon">add</i>
    </button>

    <div class="rn-composer__pill" :style="pillStyle">
      <input
        ref="input"
        class="rn-composer__input"
        type="text"
        :value="value"
        :placeholder="placeholder"
        :disabled="disabled"
        data-testid="composer-input"
        @input="$emit('input', $event.target.value)"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
        @keydown.enter.prevent="send"
      />
      <button
        type="button"
        class="rn-composer__send"
        :style="{ background: hasText ? '#288bd5' : 'rgba(0,0,0,.2)' }"
        :disabled="!hasText || disabled"
        title="Send"
        data-testid="composer-send"
        @click="send"
      >
        <i class="rn-mi rn-composer__send-icon">arrow_upward</i>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OrganismRoutineComposer',
  props: {
    value: { type: String, default: '' },
    placeholder: { type: String, default: 'Message this routine…' },
    /** phone | tablet | desktop — the pane variants sit on #f4f4f4, not white. */
    variant: { type: String, default: 'phone' },
    disabled: { type: Boolean, default: false },
  },
  computed: {
    hasText() {
      return !!(this.value && this.value.trim());
    },
    pillStyle() {
      if (this.variant === 'phone') {
        return { height: '44px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.12)' };
      }
      return { height: '46px', background: '#f4f4f4', boxShadow: 'none' };
    },
  },
  methods: {
    send() {
      if (!this.hasText || this.disabled) return;
      this.$emit('send', this.value.trim());
    },
    focus() {
      if (this.$refs.input) this.$refs.input.focus();
    },
  },
};
</script>

<style>
.rn-composer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  flex-shrink: 0;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-composer--tablet,
.rn-composer--desktop {
  padding: 12px 16px 16px;
}

.rn-composer__plus {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: #fff;
  color: #288bd5;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .12);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* The pane composers sit on white, so the circle reads as a well, not a card:
   42px, #f4f4f4, no shadow. */
.rn-composer--tablet .rn-composer__plus,
.rn-composer--desktop .rn-composer__plus {
  width: 42px;
  height: 42px;
  background: #f4f4f4;
  box-shadow: none;
}

.rn-composer__plus-icon {
  font-size: 24px;
}

.rn-composer__pill {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 5px 0 16px;
  border-radius: 23px;
}

.rn-composer__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: transparent;
  font-family: inherit;
  /* 15px, which is what the phone (5a) and pane (6a/6b) composers both specify. */
  font-size: 15px;
  color: rgba(0, 0, 0, .87);
}

/* DEPARTURE, phone only: the design pins 15px, but iOS Safari auto-zooms the
   page whenever a focused input is under 16px and does not zoom back out. The
   only viewport cure is `maximum-scale=1` / `user-scalable=no`, which kills
   pinch-zoom for everyone — an accessibility regression bought with 1px. So the
   phone composer keeps 16px; the tablet and desktop panes, where no such
   behaviour exists, render the design's 15px. */
.rn-composer--phone .rn-composer__input {
  font-size: 16px;
}

.rn-composer__input::placeholder {
  color: rgba(0, 0, 0, .38);
}

.rn-composer__send {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .2s;
}

.rn-composer--tablet .rn-composer__send,
.rn-composer--desktop .rn-composer__send {
  width: 36px;
  height: 36px;
}

.rn-composer__send[disabled] {
  cursor: default;
}

.rn-composer__send-icon {
  font-size: 20px;
}
</style>
