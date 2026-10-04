<template>
  <!--
    SUBTASKS on the goal-item page — progress bar, editable rows, add row.

    `molecules/SubTaskItemList` is the older Vuetify list that `GoalItemList`
    renders inside the classic dashboard. It is not reused here on purpose: it
    is built from `AtomCard`/`AtomListTile`, carries its own "SUB TASKS" card
    chrome and its own in-flight `isAddingSubTask` disable, and it has no
    rename, no reorder and no Backspace-on-empty. Dropping a Vuetify card into
    the chassis sheet and then teaching it three new gestures would change every
    one of its existing call sites. This is the chassis-shaped sibling; neither
    one disables a control while a request is in flight (ARCHITECTURE § 3.7).

    Pure: props in, events out. Rename fires on `change` (blur / Enter), not per
    keystroke, so one edit is one mutation.
  -->
  <div class="rn-subed">
    <div class="rn-subed__head">
      <div class="rn-subed__label">SUBTASKS</div>
      <div class="rn-subed__track">
        <div
          class="rn-subed__fill"
          data-testid="subtask-progress"
          :style="{ width: `${percent}%` }"
        ></div>
      </div>
      <div class="rn-subed__count" data-testid="subtask-count">{{ countLabel }}</div>
    </div>

    <div
      v-for="(subtask, index) in rows"
      :key="subtask.id"
      class="rn-subed__row"
      data-testid="subtask-row"
    >
      <i
        class="rn-mi rn-subed__box"
        :style="{ color: subtask.isComplete ? '#288bd5' : 'rgba(0,0,0,.54)' }"
        title="Tick subtask"
        data-testid="subtask-toggle"
        @click="$emit('toggle', subtask)"
      >{{ subtask.isComplete ? 'check_box' : 'check_box_outline_blank' }}</i>

      <input
        class="rn-subed__input"
        :value="subtask.body"
        :style="{
          color: subtask.isComplete ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.87)',
          textDecoration: subtask.isComplete ? 'line-through' : 'none',
        }"
        data-testid="subtask-input"
        @change="onRename(subtask, $event)"
        @keydown.enter.prevent="onRename(subtask, $event)"
        @keydown.delete="onBackspace(subtask, $event)"
      />

      <i
        class="rn-mi rn-subed__up"
        :class="{ 'rn-subed__up--off': index === 0 }"
        title="Move up"
        data-testid="subtask-up"
        @click="onMoveUp(subtask, index)"
      >arrow_upward</i>

      <i
        class="rn-mi rn-subed__del"
        title="Delete subtask"
        data-testid="subtask-remove"
        @click="$emit('remove', subtask)"
      >close</i>
    </div>

    <div class="rn-subed__row rn-subed__row--add">
      <i class="rn-mi rn-subed__add-icon">add</i>
      <input
        v-model="draft"
        class="rn-subed__input"
        placeholder="Add a subtask — Enter to add"
        data-testid="subtask-add-input"
        @keydown.enter.prevent="submit"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'MoleculeSubtaskEditor',
  props: {
    /** `[{ id, body, isComplete }]` — SubTaskItem entities, already de-duped. */
    subtasks: { type: Array, default: () => [] },
  },
  data() {
    return { draft: '' };
  },
  computed: {
    rows() {
      // Defensive de-dupe: a subtask id repeated in the list would give two
      // rows the same `:key` and Vue would patch the wrong one.
      const seen = {};
      return (this.subtasks || []).filter((subtask) => {
        if (!subtask || subtask.id == null || seen[subtask.id]) return false;
        seen[subtask.id] = true;
        return true;
      });
    },
    doneCount() {
      return this.rows.filter((subtask) => subtask.isComplete).length;
    },
    countLabel() {
      return this.rows.length ? `${this.doneCount}/${this.rows.length} done` : 'None yet';
    },
    percent() {
      if (!this.rows.length) return 0;
      return Math.round((this.doneCount / this.rows.length) * 100);
    },
  },
  methods: {
    onRename(subtask, event) {
      const body = event && event.target ? event.target.value : '';
      if (body.trim() === String(subtask.body || '').trim()) return;
      // An emptied row is a removal, not a rename to "".
      if (!body.trim()) {
        this.$emit('remove', subtask);
        return;
      }
      this.$emit('rename', { subtask, body: body.trim() });
    },
    /**
     * Backspace on an already-empty row removes it. The guard is on the value
     * *before* the keystroke, so it only fires when there is nothing to delete.
     */
    onBackspace(subtask, event) {
      const value = event && event.target ? event.target.value : '';
      if (value !== '') return;
      event.preventDefault();
      this.$emit('remove', subtask);
    },
    onMoveUp(subtask, index) {
      if (index === 0) return;
      this.$emit('move-up', subtask);
    },
    submit() {
      const body = this.draft.trim();
      if (!body) return;
      this.draft = '';
      this.$emit('add', body);
    },
  },
};
</script>

<style>
.rn-subed {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-subed__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}

.rn-subed__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-subed__track {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(0, 0, 0, .06);
  overflow: hidden;
}

.rn-subed__fill {
  height: 100%;
  background: #288bd5;
  border-radius: 2px;
  transition: width .3s;
}

.rn-subed__count {
  font-size: 11px;
  color: rgba(0, 0, 0, .5);
  white-space: nowrap;
}

.rn-subed__row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  border-bottom: 1px solid rgba(0, 0, 0, .06);
}

.rn-subed__row--add {
  border-bottom: 0;
}

.rn-subed__box {
  font-size: 20px;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
}

.rn-subed__box:hover {
  background: rgba(40, 139, 213, .08);
}

.rn-subed__add-icon {
  font-size: 20px;
  color: #288bd5;
  width: 28px;
  flex-shrink: 0;
}

.rn-subed__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  font-size: 14px;
  color: #333;
  padding: 6px 0;
}

.rn-subed__up,
.rn-subed__del {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  cursor: pointer;
  flex-shrink: 0;
  color: rgba(0, 0, 0, .45);
}

.rn-subed__up {
  font-size: 18px;
}

.rn-subed__up--off {
  color: rgba(0, 0, 0, .12);
  cursor: default;
}

.rn-subed__up:not(.rn-subed__up--off):hover {
  background: rgba(0, 0, 0, .05);
}

.rn-subed__del {
  font-size: 16px;
  color: rgba(0, 0, 0, .4);
}

.rn-subed__del:hover {
  background: rgba(211, 47, 47, .08);
  color: #d32f2f;
}
</style>
