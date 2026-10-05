<template>
  <!--
    Skip day — `sheetSkip` in `packages/design/Routine Notes Final.dc.html`.

    Reached by long-pressing today's cell in the week strip (or right-clicking
    it). The classic dashboard has the same thing as a switch in its header;
    this is the same `skipRoutine` mutation behind a gesture that fits a screen
    with no header switch to put it in.

    Both directions read as one question with one consequence line, because the
    thing people are actually unsure about is whether skipping costs them their
    streak. It does not, and the copy leads with that.

    Pure presentational: `confirm` carries the reason, the container runs the
    mutation.
  -->
  <responsive-sheet
    :open="open"
    :shell="shell"
    :closable="false"
    @close="$emit('close')"
  >
    <div class="rn-skip">
      <div class="rn-skip__head">
        <div class="rn-skip__badge">
          <i class="rn-mi">{{ skipped ? 'play_circle' : 'pause_circle' }}</i>
        </div>
        <div class="rn-skip__title" data-testid="skip-title">{{ title }}</div>
      </div>
      <div class="rn-skip__text" data-testid="skip-text">{{ text }}</div>

      <input
        v-if="!skipped"
        v-model="reason"
        class="rn-skip__reason"
        placeholder="Reason (optional) — travel, sick, rest day"
        data-testid="skip-reason"
      />

      <div v-if="errorMessage" class="rn-skip__error" data-testid="skip-error">
        {{ errorMessage }}
      </div>

      <div class="rn-skip__actions">
        <div class="rn-skip__cancel" data-testid="skip-cancel" @click="$emit('close')">
          Cancel
        </div>
        <div class="rn-skip__confirm" data-testid="skip-confirm" @click="confirm">
          {{ skipped ? 'Undo skip' : 'Skip today' }}
        </div>
      </div>
    </div>
  </responsive-sheet>
</template>

<script>
import ResponsiveSheet from '../../molecules/ResponsiveSheet/ResponsiveSheet.vue';

export default {
  name: 'OrganismSkipDaySheet',
  components: { ResponsiveSheet },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** "Saturday, 12 September" — the day being skipped. */
    dayLabel: { type: String, default: 'today' },
    /** The day is already skipped, so this sheet offers to undo. */
    skipped: { type: Boolean, default: false },
    /** The server's refusal, verbatim (the weekly skip quota is two days). */
    errorMessage: { type: String, default: '' },
  },
  data() {
    return { reason: '' };
  },
  computed: {
    title() {
      return this.skipped ? 'Undo today’s skip?' : `Skip ${this.dayLabel}?`;
    },
    text() {
      return this.skipped
        ? 'Routines come back on for today and ticks count again.'
        : 'Routines pause for the day. Your streak and history stay intact, '
          + 'and a skipped day doesn’t count against your efficiency.';
    },
  },
  watch: {
    open(isOpen) {
      if (!isOpen) this.reason = '';
    },
  },
  methods: {
    confirm() {
      this.$emit('confirm', { skip: !this.skipped, reason: this.reason.trim() });
    },
  },
};
</script>

<style>
.rn-skip {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  padding: 4px 4px 10px;
}

.rn-skip__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rn-skip__badge {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fff3e0;
  color: #e68900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rn-skip__badge .rn-mi {
  font-size: 22px;
}

.rn-skip__title {
  font-size: 19px;
  font-weight: 700;
}

.rn-skip__text {
  font-size: 14px;
  line-height: 1.55;
  color: rgba(0, 0, 0, .68);
  margin-top: 10px;
}

.rn-skip__reason {
  width: 100%;
  box-sizing: border-box;
  height: 44px;
  margin-top: 14px;
  border: 1px solid rgba(0, 0, 0, .15);
  border-radius: 10px;
  padding: 0 12px;
  outline: 0;
  font: inherit;
  font-size: 14px;
  color: #222;
}

.rn-skip__error {
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(211, 47, 47, .08);
  color: #c62828;
  font-size: 13px;
  line-height: 1.4;
}

.rn-skip__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}

.rn-skip__cancel {
  height: 40px;
  padding: 0 18px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #288bd5;
  cursor: pointer;
}

.rn-skip__confirm {
  height: 40px;
  padding: 0 20px;
  border-radius: 20px;
  background: #e68900;
  color: #fff;
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
</style>
