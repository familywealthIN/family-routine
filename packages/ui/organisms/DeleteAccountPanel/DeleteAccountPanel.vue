<template>
  <div class="rn-pdel" data-testid="delete-account">
    <!--
      The danger zone (`Profile and About.dc.html` § PP/PT/PD).

      The old page stacked a red "Danger Zone" alert, a list tile and a dialog
      with a five-item bullet list. The redesign is one row and one gate — but the
      gate is the part that matters, so it keeps the type-DELETE confirmation
      exactly as drawn: an exact, trimmed, case-sensitive "DELETE".
    -->
    <button
      type="button"
      class="rn-pdel__row"
      data-testid="delete-account-open"
      @click="$emit('open')"
    >
      <i class="rn-mi rn-pdel__glyph">delete_forever</i>
      <span class="rn-pdel__text">
        <span class="rn-pdel__title">Delete account</span>
        <span class="rn-pdel__sub">Removes routines, goals, agents and points for good</span>
      </span>
      <i class="rn-mi rn-pdel__chevron">chevron_right</i>
    </button>

    <responsive-sheet
      :open="open"
      :shell="shell"
      :width="520"
      :closable="false"
      data-testid="delete-account-sheet"
      @close="$emit('close')"
    >
      <div class="rn-pdel__dialog">
        <header class="rn-pdel__dialog-head">
          <span class="rn-pdel__warn"><i class="rn-mi">warning</i></span>
          <span class="rn-pdel__dialog-title">Delete your account?</span>
        </header>

        <p class="rn-pdel__body">
          This removes your routines, goals, agents, group membership and every point you have
          earned. <b>This can’t be undone.</b>
        </p>

        <label class="rn-pdel__label" for="rn-pdel-input">Type DELETE to confirm</label>
        <input
          id="rn-pdel-input"
          v-model="text"
          class="rn-pdel__input"
          :class="{ 'rn-pdel__input--armed': confirmed }"
          type="text"
          placeholder="DELETE"
          autocomplete="off"
          spellcheck="false"
          data-testid="delete-account-input"
        />

        <div class="rn-pdel__actions">
          <button
            type="button"
            class="rn-pdel__keep"
            data-testid="delete-account-keep"
            @click="$emit('close')"
          >
            Keep account
          </button>
          <button
            type="button"
            class="rn-pdel__go"
            :class="{ 'rn-pdel__go--armed': confirmed }"
            :disabled="!confirmed"
            data-testid="delete-account-confirm"
            @click="confirm"
          >
            Delete forever
          </button>
        </div>
      </div>
    </responsive-sheet>
  </div>
</template>

<script>
import ResponsiveSheet from '../../molecules/ResponsiveSheet/ResponsiveSheet.vue';
import { isDeleteConfirmed } from '../../constants/profile';

export default {
  name: 'OrganismDeleteAccountPanel',
  components: { ResponsiveSheet },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
  },
  data() {
    return { text: '' };
  },
  computed: {
    /** Exact match after a trim — `delete`, `Delete` and `DELETE now` all fail. */
    confirmed() {
      return isDeleteConfirmed(this.text);
    },
  },
  watch: {
    /** Every open starts from empty, so a stale "DELETE" can never be re-armed. */
    open() {
      this.text = '';
    },
  },
  methods: {
    confirm() {
      if (!this.confirmed) return;
      this.$emit('confirm');
    },
  },
};
</script>

<style>
.rn-pdel {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-pdel__row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 16px;
  box-sizing: border-box;
  border: 1px solid rgba(211, 47, 47, .25);
  border-radius: 16px;
  background: #fff;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.rn-pdel__row:hover {
  background: rgba(211, 47, 47, .04);
}

.rn-pdel__glyph {
  font-size: 22px;
  color: #d32f2f;
  flex-shrink: 0;
}

.rn-pdel__text {
  flex: 1;
  min-width: 0;
}

.rn-pdel__title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #d32f2f;
}

.rn-pdel__sub {
  display: block;
  font-size: 12px;
  color: rgba(0, 0, 0, .55);
}

.rn-pdel__chevron {
  font-size: 20px;
  color: rgba(0, 0, 0, .3);
  flex-shrink: 0;
}

.rn-pdel__dialog {
  padding: 6px 4px 8px;
}

.rn-pdel__dialog-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rn-pdel__warn {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(211, 47, 47, .1);
  color: #d32f2f;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-pdel__warn .rn-mi {
  font-size: 22px;
}

.rn-pdel__dialog-title {
  font-size: 19px;
  font-weight: 700;
}

.rn-pdel__body {
  font-size: 14px;
  line-height: 1.55;
  color: rgba(0, 0, 0, .68);
  margin: 12px 0 0;
}

.rn-pdel__label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, .55);
  margin-top: 16px;
}

.rn-pdel__input {
  width: 100%;
  box-sizing: border-box;
  height: 44px;
  margin-top: 6px;
  border: 1px solid rgba(0, 0, 0, .15);
  border-radius: 10px;
  padding: 0 12px;
  outline: 0;
  font: inherit;
  font-size: 15px;
  letter-spacing: 1px;
  color: #222;
}

.rn-pdel__input--armed {
  border-color: #d32f2f;
}

.rn-pdel__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
}

.rn-pdel__keep,
.rn-pdel__go {
  height: 40px;
  border: 0;
  border-radius: 20px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
}

.rn-pdel__keep {
  padding: 0 18px;
  background: transparent;
  color: #288bd5;
  cursor: pointer;
}

.rn-pdel__go {
  padding: 0 20px;
  background: rgba(211, 47, 47, .35);
  color: #fff;
  cursor: not-allowed;
}

.rn-pdel__go--armed {
  background: #d32f2f;
  cursor: pointer;
}
</style>
