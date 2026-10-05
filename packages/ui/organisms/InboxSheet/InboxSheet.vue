<template>
  <!--
    The Inbox — `sheetInbox` in `packages/design/Routine Notes Final.dc.html`.

    Where a task goes when it has no routine. The app already lets AI Search and
    the chat create a goal item without a `taskRef`; before this sheet those items
    existed but had nowhere to appear, because the focus card groups the day's
    checklist by routine. So this is not a new store — it is the view of the
    `taskRef`-less corner of the day the checklist structurally cannot show.

    Two ways out of it: "Do now" drops the item on the current routine, "Move to
    routine" expands every routine as a chip. Both are one `updateGoalItem` with
    a new `taskRef`.

    Pure presentational: props in, events out.
  -->
  <responsive-sheet
    :open="open"
    :shell="shell"
    :closable="false"
    @close="$emit('close')"
  >
    <template #header>
      <div class="rn-inbox__head">
        <div class="rn-inbox__head-text">
          <div class="rn-inbox__title">Inbox</div>
          <div class="rn-inbox__sub" data-testid="inbox-sub">{{ subline }}</div>
        </div>
        <i
          class="rn-mi rn-inbox__close"
          title="Close"
          data-testid="inbox-close"
          @click="$emit('close')"
        >close</i>
      </div>
    </template>

    <div class="rn-inbox">
      <div class="rn-inbox__add">
        <i class="rn-mi rn-inbox__add-icon">add</i>
        <input
          v-model="draft"
          class="rn-inbox__add-input"
          placeholder="Add to Inbox — Enter to add"
          data-testid="inbox-add-input"
          @keydown.enter.prevent="submit"
        />
        <div
          v-if="draft.trim()"
          class="rn-inbox__add-btn"
          data-testid="inbox-add-btn"
          @click="submit"
        >Add</div>
      </div>

      <template v-for="section in sections">
      <div
        v-if="section.label"
        :key="`label-${section.key}`"
        class="rn-inbox__section"
        :data-testid="`inbox-section-${section.key}`"
      >{{ section.label }}</div>
      <div
        v-for="row in section.rows"
        :key="row.id"
        class="rn-inbox__row"
        :class="{ 'rn-inbox__row--pending': row.kind === 'pending' }"
        :data-testid="row.kind === 'pending' ? 'inbox-pending-row' : 'inbox-row'"
      >
        <div class="rn-inbox__body">{{ row.body }}</div>
        <div class="rn-inbox__meta">{{ metaFor(row) }}</div>
        <div class="rn-inbox__actions">
          <div
            v-if="currentRoutine"
            class="rn-inbox__btn rn-inbox__btn--primary"
            data-testid="inbox-do-now"
            @click="$emit('do-now', row)"
          >
            <i class="rn-mi rn-inbox__btn-icon">bolt</i>Do now · {{ currentRoutine.name }}
          </div>
          <div
            class="rn-inbox__btn rn-inbox__btn--ghost"
            data-testid="inbox-move"
            @click="toggleMove(row)"
          >
            <i class="rn-mi rn-inbox__btn-icon">drive_file_move</i>Move to routine
            <i class="rn-mi rn-inbox__btn-icon">
              {{ moving === row.id ? 'expand_less' : 'expand_more' }}
            </i>
          </div>
          <i
            class="rn-mi rn-inbox__del"
            title="Delete"
            data-testid="inbox-delete"
            @click="$emit('remove', row)"
          >delete</i>
        </div>
        <div v-if="moving === row.id" class="rn-inbox__targets" data-testid="inbox-targets">
          <div
            v-for="routine in routines"
            :key="routine.id"
            class="rn-inbox__target"
            :data-testid="`inbox-target-${routine.id}`"
            @click="pick(row, routine)"
          >
            <span class="rn-inbox__target-time">{{ routine.time }}</span>{{ routine.name }}
          </div>
        </div>
      </div>
      </template>

      <div v-if="!total" class="rn-inbox__empty" data-testid="inbox-empty">
        <i class="rn-mi rn-inbox__empty-icon">inbox</i>
        <div class="rn-inbox__empty-title">Inbox zero</div>
        <div class="rn-inbox__empty-sub">Tasks without a routine land here.</div>
      </div>
    </div>
  </responsive-sheet>
</template>

<script>
import ResponsiveSheet from '../../molecules/ResponsiveSheet/ResponsiveSheet.vue';

function dedupe(list) {
  const seen = {};
  return (list || []).filter((item) => {
    if (!item || item.id == null || seen[item.id]) return false;
    seen[item.id] = true;
    return true;
  });
}

export default {
  name: 'OrganismInboxSheet',
  components: { ResponsiveSheet },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** Goal items with no `taskRef`. `[{ id, body, meta }]`. */
    items: { type: Array, default: () => [] },
    /**
     * Pending items — the pre-redesign Inbox ("Pending Items", the user's
     * `motto` list). `[{ id, body, meta, kind: 'pending' }]`. Same three ways
     * out as a goal item; the container routes each event by `row.kind`.
     */
    pending: { type: Array, default: () => [] },
    /** The routine "Do now" drops an item onto. `{ id, name, time }` or null. */
    currentRoutine: { type: Object, default: null },
    /** Every routine on the day. `[{ id, name, time }]`. */
    routines: { type: Array, default: () => [] },
  },
  data() {
    return { draft: '', moving: null };
  },
  computed: {
    rows() {
      return dedupe(this.items);
    },
    pendingRows() {
      return dedupe(this.pending).map((row) => ({ ...row, kind: 'pending' }));
    },
    /** Goal items first (they belong to today), then the older pending list. */
    sections() {
      const both = this.rows.length && this.pendingRows.length;
      return [
        { key: 'today', label: both ? 'Today' : '', rows: this.rows },
        { key: 'pending', label: this.pendingRows.length ? 'Pending' : '', rows: this.pendingRows },
      ].filter((section) => section.rows.length);
    },
    total() {
      return this.rows.length + this.pendingRows.length;
    },
    subline() {
      const count = this.total;
      if (!count) return 'All sorted';
      return `${count} task${count === 1 ? '' : 's'} without a routine`;
    },
  },
  watch: {
    open(isOpen) {
      if (!isOpen) {
        this.draft = '';
        this.moving = null;
      }
    },
  },
  methods: {
    metaFor(row) {
      return row.meta || 'No routine yet';
    },
    toggleMove(row) {
      this.moving = this.moving === row.id ? null : row.id;
    },
    pick(row, routine) {
      this.moving = null;
      this.$emit('move', { item: row, routine });
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
.rn-inbox {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-inbox__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.rn-inbox__head-text {
  flex: 1;
  min-width: 0;
}

.rn-inbox__title {
  font-size: 19px;
  font-weight: 700;
}

.rn-inbox__sub {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

.rn-inbox__close {
  font-size: 22px;
  color: rgba(0, 0, 0, .55);
  cursor: pointer;
  padding: 6px;
  flex-shrink: 0;
}

.rn-inbox__add {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin: 0 0 4px;
  padding: 0 6px 0 10px;
  border-radius: 12px;
  background: #f4f4f4;
}

.rn-inbox__add-icon {
  font-size: 20px;
  color: #288bd5;
  flex-shrink: 0;
}

.rn-inbox__add-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  font-size: 14px;
  color: #222;
  height: 36px;
}

.rn-inbox__add-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 15px;
  background: #288bd5;
  color: #fff;
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.rn-inbox__section {
  padding: 14px 4px 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, .45);
}

.rn-inbox__row {
  padding: 12px 4px;
  border-top: 1px solid rgba(0, 0, 0, .06);
}

.rn-inbox__body {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
}

.rn-inbox__meta {
  font-size: 12px;
  color: rgba(0, 0, 0, .5);
  margin-top: 2px;
}

.rn-inbox__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}

.rn-inbox__btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 12px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.rn-inbox__btn--primary {
  background: #288bd5;
  color: #fff;
}

.rn-inbox__btn--ghost {
  border: 1px solid rgba(40, 139, 213, .45);
  color: #288bd5;
}

.rn-inbox__btn-icon {
  font-size: 16px;
}

.rn-inbox__del {
  font-size: 18px;
  color: rgba(0, 0, 0, .4);
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-inbox__del:hover {
  background: rgba(211, 47, 47, .08);
  color: #d32f2f;
}

.rn-inbox__targets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  animation: rn-fade .15s ease;
}

.rn-inbox__target {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  background: #f4f4f4;
  font-size: 12px;
  cursor: pointer;
}

.rn-inbox__target:hover {
  background: rgba(40, 139, 213, .1);
}

.rn-inbox__target-time {
  font-weight: 600;
  color: rgba(0, 0, 0, .45);
  font-variant-numeric: tabular-nums;
}

.rn-inbox__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 36px 0;
  color: rgba(0, 0, 0, .5);
}

.rn-inbox__empty-icon {
  font-size: 36px;
  color: #4CAF50;
}

.rn-inbox__empty-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, .75);
}

.rn-inbox__empty-sub {
  font-size: 13px;
}
</style>
