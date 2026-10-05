<template>
  <!--
    The body of the create / edit sheet. One line of text, two chips and a CTA.

    The parent chip is LOCKED: it carries a lock glyph and no control, because
    the sheet was opened from inside a specific month or week and re-parenting
    there would silently move the goal out of the card you are looking at. If you
    want a different parent, you open the sheet from that parent.
  -->
  <div class="rn-gpf" data-testid="goal-period-form">
    <input
      ref="input"
      class="rn-gpf__input"
      type="text"
      :value="value"
      :placeholder="draft.placeholder"
      data-testid="goal-period-form-input"
      @input="$emit('input', $event.target.value)"
      @keydown.enter.prevent="$emit('submit')"
    />

    <div class="rn-gpf__chips">
      <span class="rn-gpf__chip" data-testid="goal-period-form-period">
        <i class="rn-mi rn-gpf__chip-icon">{{ draft.periodIcon }}</i>{{ draft.periodLabel }}
      </span>
      <span
        v-if="draft.parentLabel"
        class="rn-gpf__chip rn-gpf__chip--parent"
        data-testid="goal-period-form-parent"
        :title="`Rolls up into ${draft.parentLabel}`"
      >
        <i class="rn-mi rn-gpf__chip-icon">subdirectory_arrow_right</i>
        <span class="rn-gpf__parent-text">{{ draft.parentLabel }}</span>
        <i class="rn-mi rn-gpf__lock" data-testid="goal-period-form-lock">lock</i>
      </span>
      <span class="rn-gpf__spacer"></span>
      <button
        type="button"
        class="rn-gpf__cta"
        :style="{ background: value.trim() ? '#288bd5' : 'rgba(0,0,0,.2)' }"
        data-testid="goal-period-form-submit"
        @click="$emit('submit')"
      >{{ draft.edit ? 'Save' : 'Add' }}</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MoleculeGoalPeriodForm',
  props: {
    /** `yearGoalModel.createDraft()` output, or the same shape with `edit: id`. */
    draft: { type: Object, required: true },
    value: { type: String, default: '' },
  },
  mounted() {
    // The sheet exists to type one line; focusing it is the whole interaction.
    if (this.$refs.input && this.$refs.input.focus) this.$refs.input.focus();
  },
};
</script>

<style>
.rn-gpf {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  padding-bottom: 8px;
}

.rn-gpf__input {
  width: 100%;
  box-sizing: border-box;
  border: 0;
  border-bottom: 2px solid #288bd5;
  outline: 0;
  font: inherit;
  font-size: 17px;
  line-height: 1.6;
  color: #333;
  padding: 6px 0;
  background: transparent;
}

.rn-gpf__chips {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 12px;
  flex-wrap: wrap;
}

.rn-gpf__chip {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 34px;
  padding: 0 10px;
  border-radius: 12px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  font-size: 12px;
  white-space: nowrap;
}

.rn-gpf__chip--parent {
  max-width: 220px;
  overflow: hidden;
}

.rn-gpf__chip-icon {
  font-size: 15px;
  color: rgba(0, 0, 0, .54);
}

.rn-gpf__parent-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-gpf__lock {
  font-size: 13px;
  color: rgba(0, 0, 0, .35);
}

.rn-gpf__spacer {
  flex: 1;
}

.rn-gpf__cta {
  height: 38px;
  padding: 0 18px;
  border: 0;
  border-radius: 19px;
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s;
}
</style>
