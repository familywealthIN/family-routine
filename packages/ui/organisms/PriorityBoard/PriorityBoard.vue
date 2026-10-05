<template>
  <!--
    The Priority page body (packages/design/Priority.dc.html).

    THE ONE THING THAT IS EASY TO GET WRONG: the 2x2 map is navigation ONLY on
    the phone. There, tapping a tile swaps the single list card underneath. On
    tablet and desktop all four quadrant cards render simultaneously, so the
    quadrant summary is state display and nothing in it is tappable.

    Pure presentational: props in, events out. `selected` and the move picker's
    open row are local view state — the same licence AppShell takes for its
    drawer — so no page has to carry them.
  -->
  <div class="rn-pboard" :class="`rn-pboard--${shellKind}`" data-testid="priority-board">
    <!-- ======================= PHONE ======================= -->
    <template v-if="shellKind === 'phone'">
      <priority-triage-card
        v-if="triageItem"
        class="rn-pboard__triage"
        :item="triageItem"
        :count="triage.length"
        :quadrants="quadrants"
        shell="phone"
        :seq="triageSeq"
        @assign="onTriageAssign"
        @skip="$emit('skip', $event)"
      />

      <div class="rn-pboard__map" data-testid="priority-map">
        <div class="rn-pboard__map-grid">
          <div></div>
          <div class="rn-pboard__axis">URGENT</div>
          <div class="rn-pboard__axis">NOT URGENT</div>

          <div class="rn-pboard__axis-side"><div class="rn-pboard__axis-rot">IMPORTANT</div></div>
          <priority-tile
            v-for="q in topRow"
            :key="q.key"
            :quadrant="q"
            :selected="q.key === selected"
            :bumping="q.key === bump"
            @select="onSelect"
          />

          <div class="rn-pboard__axis-side"><div class="rn-pboard__axis-rot">NOT IMPORTANT</div></div>
          <priority-tile
            v-for="q in bottomRow"
            :key="q.key"
            :quadrant="q"
            :selected="q.key === selected"
            :bumping="q.key === bump"
            @select="onSelect"
          />
        </div>
      </div>

      <div class="rn-pboard__list-card" data-testid="priority-selected-card">
        <div class="rn-pboard__list-head">
          <div class="rn-pboard__swatch" :style="{ background: current.color }"></div>
          <div class="rn-pboard__list-title">{{ current.title }}</div>
          <div class="rn-pboard__list-count">
            <b>{{ current.done }}</b> of {{ current.total }} done
          </div>
        </div>
        <div class="rn-pboard__list-sub">{{ current.sub }} · {{ current.verb }}</div>
        <priority-task-list
          :groups="current.groups"
          :color="current.color"
          :seq="listSeq"
          empty-text="Nothing here. Triage something in."
          @toggle="$emit('toggle', $event)"
          @open="$emit('open', $event)"
          @action="$emit('action', $event)"
          @move="openMove"
        />
      </div>
    </template>

    <!-- =================== TABLET / DESKTOP =================== -->
    <template v-else>
      <aside class="rn-pboard__side">
        <priority-triage-card
          v-if="triageItem"
          :item="triageItem"
          :count="triage.length"
          :quadrants="quadrants"
          :shell="shellKind"
          :seq="triageSeq"
          @assign="onTriageAssign"
          @skip="$emit('skip', $event)"
        />
        <div v-else class="rn-pboard__clear" data-testid="priority-inbox-clear">
          <div class="rn-pboard__clear-icon"><i class="rn-mi">inbox</i></div>
          <div>
            <div class="rn-pboard__clear-title">Inbox clear</div>
            <div class="rn-pboard__clear-sub">New items from chat and AI Search land here</div>
          </div>
        </div>

        <div class="rn-pboard__totals" data-testid="priority-totals">
          <div class="rn-pboard__totals-head">TODAY · {{ openTotal }} OPEN</div>
          <div v-for="q in quadrants" :key="q.key" class="rn-pboard__totals-row">
            <div class="rn-pboard__swatch" :style="{ background: q.color }"></div>
            <div class="rn-pboard__totals-label" :style="{ color: q.color }">{{ q.label }}</div>
            <div class="rn-pboard__totals-count">
              <b>{{ q.open }}</b> open · {{ q.done }} done
            </div>
          </div>
        </div>
      </aside>

      <div class="rn-pboard__grid" data-testid="priority-quadrant-grid">
        <div></div>
        <div class="rn-pboard__axis">URGENT</div>
        <div class="rn-pboard__axis">NOT URGENT</div>

        <div class="rn-pboard__axis-side"><div class="rn-pboard__axis-rot">IMPORTANT</div></div>
        <priority-quadrant-card
          v-for="q in topRow"
          :key="q.key"
          :quadrant="q"
          @toggle="$emit('toggle', $event)"
          @open="$emit('open', $event)"
          @action="$emit('action', $event)"
          @move="openMove"
        />

        <div class="rn-pboard__axis-side"><div class="rn-pboard__axis-rot">NOT IMPORTANT</div></div>
        <priority-quadrant-card
          v-for="q in bottomRow"
          :key="q.key"
          :quadrant="q"
          @toggle="$emit('toggle', $event)"
          @open="$emit('open', $event)"
          @action="$emit('action', $event)"
          @move="openMove"
        />
      </div>
    </template>

    <priority-move-sheet
      :open="!!moveItem"
      :shell="shellKind"
      :item="moveItem"
      :quadrants="quadrants"
      @close="closeMove"
      @assign="onSheetAssign"
    />
  </div>
</template>

<script>
import PriorityTile from '../../molecules/PriorityTile/PriorityTile.vue';
import PriorityTriageCard from '../../molecules/PriorityTriageCard/PriorityTriageCard.vue';
import PriorityTaskList from '../../molecules/PriorityTaskList/PriorityTaskList.vue';
import PriorityQuadrantCard from '../../molecules/PriorityQuadrantCard/PriorityQuadrantCard.vue';
import PriorityMoveSheet from '../../molecules/PriorityMoveSheet/PriorityMoveSheet.vue';
import { QUADRANTS, DEFAULT_QUADRANT } from '../../constants/priority';

// How long a tapped/filled tile keeps its `rn-bump` (keyframe runs .5s).
const BUMP_MS = 600;

export default {
  name: 'OrganismPriorityBoard',
  components: {
    PriorityTile,
    PriorityTriageCard,
    PriorityTaskList,
    PriorityQuadrantCard,
    PriorityMoveSheet,
  },
  props: {
    /** 'phone' | 'tablet' | 'desktop' — resolved once by the page. */
    shell: { type: String, default: 'phone' },
    /**
     * The four QUADRANTS entries widened with `open` / `done` / `total` / `pct`
     * and `groups` (routine-grouped rows). Order is the grid's reading order.
     */
    quadrants: { type: Array, default: () => QUADRANTS },
    /** Unsorted items, front of the queue first. Only the first one is shown. */
    triage: { type: Array, default: () => [] },
  },
  data() {
    return {
      selected: (this.quadrants[0] && this.quadrants[0].key) || DEFAULT_QUADRANT,
      moveItem: null,
      bump: '',
      bumpTimer: null,
      listSeq: 0,
      triageSeq: 0,
    };
  },
  computed: {
    shellKind() {
      return this.shell === 'phone' ? 'phone' : this.shell;
    },
    topRow() {
      return this.quadrants.slice(0, 2);
    },
    bottomRow() {
      return this.quadrants.slice(2);
    },
    triageItem() {
      return this.triage[0] || null;
    },
    openTotal() {
      return this.quadrants.reduce((sum, q) => sum + (q.open || 0), 0);
    },
    /** The phone's single visible list. Never null — falls back to the first tile. */
    current() {
      return this.quadrants.find((q) => q.key === this.selected) || this.quadrants[0] || {};
    },
  },
  beforeDestroy() {
    if (this.bumpTimer) clearTimeout(this.bumpTimer);
  },
  methods: {
    onSelect(key) {
      if (key === this.selected) return;
      this.selected = key;
      this.listSeq += 1;
      this.$emit('select', key);
    },
    bumpTile(key) {
      this.bump = key;
      if (this.bumpTimer) clearTimeout(this.bumpTimer);
      this.bumpTimer = setTimeout(() => { this.bump = ''; }, BUMP_MS);
    },
    onTriageAssign(payload) {
      this.bumpTile(payload.quadrant);
      this.triageSeq += 1;
      this.$emit('assign', { ...payload, fromTriage: true });
    },
    openMove(item) {
      this.moveItem = item;
    },
    closeMove() {
      this.moveItem = null;
    },
    onSheetAssign(payload) {
      this.closeMove();
      this.bumpTile(payload.quadrant);
      this.$emit('assign', { ...payload, fromTriage: false });
    },
  },
};
</script>

<style>
.rn-pboard {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-pboard--tablet,
.rn-pboard--desktop {
  display: flex;
  gap: 14px;
  height: 100%;
  min-height: 0;
}

.rn-pboard--desktop {
  gap: 20px;
}

/* ---------------- axis labels (shared) ---------------- */

.rn-pboard__axis {
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .6px;
  color: rgba(0, 0, 0, .45);
}

.rn-pboard__axis-side {
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-pboard__axis-rot {
  transform: rotate(-90deg);
  white-space: nowrap;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .6px;
  color: rgba(0, 0, 0, .45);
}

.rn-pboard__swatch {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}

/* ---------------- phone ---------------- */

.rn-pboard__triage {
  display: block;
  margin-bottom: 12px;
}

.rn-pboard__map {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
  padding: 12px 12px 12px 8px;
}

.rn-pboard__map-grid {
  display: grid;
  grid-template-columns: 18px 1fr 1fr;
  gap: 6px;
}

.rn-pboard__list-card {
  margin-top: 12px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
  padding: 14px 16px 8px;
}

.rn-pboard__list-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rn-pboard__list-title {
  flex: 1;
  min-width: 0;
  font-size: 17px;
  font-weight: 700;
}

.rn-pboard__list-count {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

.rn-pboard__list-count b {
  color: rgba(0, 0, 0, .87);
}

.rn-pboard__list-sub {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

/* ---------------- tablet / desktop ---------------- */

.rn-pboard__side {
  width: 290px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.rn-pboard--desktop .rn-pboard__side {
  width: 330px;
}

.rn-pboard__clear {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05);
}

.rn-pboard__clear-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(76, 175, 80, .12);
  color: #2e7d32;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-pboard__clear-title {
  font-size: 15px;
  font-weight: 700;
}

.rn-pboard__clear-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

.rn-pboard__totals {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05);
}

.rn-pboard__totals-head {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .6px;
  color: rgba(0, 0, 0, .45);
}

.rn-pboard__totals-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rn-pboard__totals-label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
}

.rn-pboard__totals-count {
  font-size: 12px;
  color: rgba(0, 0, 0, .6);
}

.rn-pboard__totals-count b {
  color: rgba(0, 0, 0, .87);
}

.rn-pboard__grid {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
}
</style>
