<template>
  <!--
    Invite by email. One overlay, two presentations, through the chassis'
    ResponsiveSheet: a bottom sheet on phone, a 560px centred modal on tablet and
    desktop (the per-page width exception the chassis allows).

    The five hint states and the Send gate are one pure function — `inviteState`
    in `constants/groups` — so "Keep typing…" versus "Enter a valid email
    address." is decided in one place and tested without a DOM.
  -->
  <responsive-sheet
    :open="open"
    :shell="shell"
    :width="560"
    :closable="false"
    data-testid="group-invite-sheet"
    @close="$emit('close')"
  >
    <div class="rn-ginvite">
      <div class="rn-ginvite__title">Invite to your group</div>
      <div class="rn-ginvite__sub">
        They’ll see your routines’ daily scores, and you’ll see theirs.
        {{ slotsLeft }} of {{ cap }} spots left.
      </div>

      <div class="rn-ginvite__field" :style="{ borderBottomColor: state.lineColor }">
        <i class="rn-mi rn-ginvite__field-glyph">alternate_email</i>
        <input
          ref="input"
          class="rn-ginvite__input"
          type="email"
          autocomplete="email"
          autocapitalize="none"
          spellcheck="false"
          placeholder="name@email.com"
          data-testid="group-invite-input"
          :value="email"
          @input="$emit('update:email', $event.target.value)"
          @keydown.enter.prevent="$emit('send')"
        />
      </div>
      <div
        class="rn-ginvite__hint"
        :style="{ color: state.hintColor }"
        data-testid="group-invite-hint"
      >
        {{ state.hint }}
      </div>

      <div class="rn-ginvite__actions">
        <button
          type="button"
          class="rn-ginvite__cancel"
          data-testid="group-invite-cancel"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rn-ginvite__send"
          :class="{ 'rn-ginvite__send--off': !state.canSend || sending }"
          :disabled="sending"
          :aria-busy="sending ? 'true' : 'false'"
          data-testid="group-invite-send"
          @click="$emit('send')"
        >
          <i class="rn-mi rn-ginvite__send-glyph">send</i>{{ sending ? 'Sending…' : 'Send invite' }}
        </button>
      </div>
    </div>
  </responsive-sheet>
</template>

<script>
import ResponsiveSheet from '../../molecules/ResponsiveSheet/ResponsiveSheet.vue';
import { MEMBER_CAP, inviteState } from '../../constants/groups';

export default {
  name: 'OrganismGroupInviteSheet',
  components: { ResponsiveSheet },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    email: { type: String, default: '' },
    /** Send has been pressed once — only then does "invalid" replace "typing". */
    tried: { type: Boolean, default: false },
    /** Every email already in the group or already invited. */
    taken: { type: Array, default: () => [] },
    slotsLeft: { type: Number, default: 0 },
    /** A send is in flight: the button reads "Sending…" and takes no presses. */
    sending: { type: Boolean, default: false },
  },
  computed: {
    cap() {
      return MEMBER_CAP;
    },
    state() {
      return inviteState({ email: this.email, tried: this.tried, taken: this.taken });
    },
  },
  watch: {
    open(isOpen) {
      // The field is the only thing on this sheet; focus it rather than making
      // the user tap twice.
      if (!isOpen) return;
      this.$nextTick(() => {
        if (this.$refs.input && this.$refs.input.focus) this.$refs.input.focus();
      });
    },
  },
};
</script>

<style>
.rn-ginvite {
  padding: 6px 4px 8px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-ginvite__title {
  font-size: 20px;
  font-weight: 700;
}

.rn-ginvite__sub {
  font-size: 13px;
  color: rgba(0, 0, 0, .54);
  margin-top: 2px;
}

.rn-ginvite__field {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  padding: 4px 0 6px;
  border-bottom: 2px solid rgba(0, 0, 0, .2);
}

.rn-ginvite__field-glyph {
  font-size: 20px;
  color: rgba(0, 0, 0, .45);
}

.rn-ginvite__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  /* 16px or iOS zooms the page on focus. */
  font-size: 16px;
  color: #222;
  height: 30px;
}

.rn-ginvite__hint {
  font-size: 12px;
  margin-top: 6px;
  min-height: 16px;
}

.rn-ginvite__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.rn-ginvite__cancel,
.rn-ginvite__send {
  height: 40px;
  border: 0;
  border-radius: 20px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.rn-ginvite__cancel {
  padding: 0 18px;
  background: transparent;
  color: #288bd5;
}

.rn-ginvite__send {
  padding: 0 20px;
  background: #288bd5;
  color: #fff;
}

/* Dimmed, not disabled: pressing it is how you ask for the hint. (While
   `sending` it IS disabled — there is nothing to ask until it lands.) */
.rn-ginvite__send--off {
  background: rgba(0, 0, 0, .2);
}

.rn-ginvite__send-glyph {
  font-size: 18px;
}
</style>
