<template>
  <!--
    Deleting a goal item, confirmed in a chassis sheet.

    This replaces the Vuetify `SimpleDialog` the container used to mount, which
    still carried the pre-redesign chrome — a grey title band, a hairline rule
    above the actions and right-aligned ALL-CAPS text buttons. Everything else
    destructive in the app (GroupLeaveSheet, DeleteAccountPanel) is already a
    ResponsiveSheet with a pill confirm, so this is the same shape as those
    rather than a second dialog language.

    The cascade preview is the point of the sheet: the server deletes the
    milestones hanging off this goal, so the body says how many and lists the
    first few. The container owns that read and passes it down — see
    ARCHITECTURE.md § 7.
  -->
  <responsive-sheet
    :open="open"
    :shell="shell"
    :width="560"
    :closable="false"
    data-testid="goal-delete-sheet"
    @close="$emit('close')"
  >
    <div class="rn-gdel">
      <div class="rn-gdel__title">Delete this goal?</div>
      <p class="rn-gdel__body" data-testid="goal-delete-body">{{ summary }}</p>

      <ul v-if="milestones.length" class="rn-gdel__list" data-testid="goal-delete-list">
        <li v-for="milestone in milestones" :key="milestone.id" class="rn-gdel__item">
          {{ milestone.body }}
        </li>
      </ul>
      <p v-if="hiddenCount" class="rn-gdel__more">and {{ hiddenCount }} more</p>

      <div class="rn-gdel__actions">
        <button
          type="button"
          class="rn-gdel__cancel"
          data-testid="goal-delete-cancel"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="rn-gdel__go"
          data-testid="goal-delete-confirm"
          @click="$emit('confirm')"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </responsive-sheet>
</template>

<script>
import ResponsiveSheet from '../../molecules/ResponsiveSheet/ResponsiveSheet.vue';

export default {
  name: 'OrganismGoalDeleteSheet',
  components: { ResponsiveSheet },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** Says what will be deleted, and what it cascades to. */
    summary: { type: String, default: '' },
    /** First few cascading milestones, already truncated by the container. */
    milestones: { type: Array, default: () => [] },
    /** How many more there are beyond `milestones`. */
    hiddenCount: { type: Number, default: 0 },
    confirmText: { type: String, default: 'Delete' },
  },
};
</script>

<style>
.rn-gdel {
  padding: 6px 4px 8px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-gdel__title {
  font-size: 20px;
  font-weight: 700;
}

.rn-gdel__body {
  font-size: 14px;
  line-height: 1.5;
  color: rgba(0, 0, 0, .65);
  margin: 6px 0 0;
}

.rn-gdel__list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

/* Rows, not bullets: the same ledger look the cascade ladder uses, so the
   things about to be destroyed read as items rather than prose. */
.rn-gdel__item {
  padding: 7px 0;
  border-top: 1px solid rgba(0, 0, 0, .06);
  font-size: 14px;
  line-height: 1.4;
  color: rgba(0, 0, 0, .75);
}

.rn-gdel__more {
  margin: 8px 0 0;
  font-size: 13px;
  color: rgba(0, 0, 0, .45);
}

.rn-gdel__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.rn-gdel__cancel,
.rn-gdel__go {
  height: 40px;
  border: 0;
  border-radius: 20px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.rn-gdel__cancel {
  padding: 0 18px;
  background: transparent;
  color: #288bd5;
}

.rn-gdel__go {
  padding: 0 20px;
  background: #d32f2f;
  color: #fff;
}
</style>
