<template>
  <!--
    The ⤧ move picker. One presentation per shell comes free from
    ResponsiveSheet; Priority overrides the dialog width to 480px (chassis.md
    § "Sheet vs dialog" — per-page exception).

    Tapping the quadrant the item is already in closes without a write: a move to
    where you already are is not a move, and it must not post a toast.

    The centred dialog gets the close X: without it the only way out on a wide
    shell is the backdrop. The phone sheet has its grab handle instead.
  -->
  <responsive-sheet
    :open="open"
    :shell="shell"
    :width="480"
    :closable="shell !== 'phone'"
    @close="$emit('close')"
  >
    <template v-slot:header>
      <div class="rn-pmove__head">
        <div class="rn-pmove__kicker">Move</div>
        <div class="rn-pmove__title" data-testid="priority-move-title">{{ title }}</div>
      </div>
    </template>

    <div class="rn-pmove__grid">
      <div
        v-for="q in quadrants"
        :key="q.key"
        class="rn-pmove__btn"
        :style="btnStyle(q)"
        :data-testid="`priority-move-to-${q.key}`"
        role="button"
        @click="pick(q)"
      >
        <div class="rn-pmove__btn-head" :style="{ color: q.color }">
          <i class="rn-mi rn-pmove__btn-icon">{{ q.icon }}</i>
          <span>{{ q.label }}</span>
          <span v-if="isCurrent(q)" class="rn-pmove__current">· current</span>
        </div>
        <div class="rn-pmove__btn-sub">{{ q.sub }}</div>
      </div>
    </div>
  </responsive-sheet>
</template>

<script>
import ResponsiveSheet from '../ResponsiveSheet/ResponsiveSheet.vue';

export default {
  name: 'MoleculePriorityMoveSheet',
  components: { ResponsiveSheet },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** The row being moved, or null. */
    item: { type: Object, default: null },
    quadrants: { type: Array, default: () => [] },
  },
  computed: {
    title() {
      return (this.item && this.item.body) || '';
    },
    currentKey() {
      return (this.item && this.item.quadrant) || '';
    },
  },
  methods: {
    isCurrent(q) {
      return q.key === this.currentKey;
    },
    btnStyle(q) {
      return {
        background: q.tint,
        boxShadow: `inset 0 0 0 ${this.isCurrent(q) ? '2px' : '0px'} ${q.color}`,
      };
    },
    pick(q) {
      if (!this.item) return;
      if (this.isCurrent(q)) {
        this.$emit('close');
        return;
      }
      this.$emit('assign', { item: this.item, quadrant: q.key });
    },
  },
};
</script>

<style>
.rn-pmove__head {
  flex: 1;
  min-width: 0;
}

.rn-pmove__kicker {
  padding: 6px 0 2px;
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

.rn-pmove__title {
  padding-bottom: 4px;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
}

.rn-pmove__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 8px;
  padding-bottom: 6px;
}

.rn-pmove__btn {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px;
  border-radius: 14px;
  cursor: pointer;
}

.rn-pmove__btn-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 800;
}

.rn-pmove__btn-icon {
  font-size: 18px;
}

.rn-pmove__current {
  font-size: 10px;
  font-weight: 600;
  color: rgba(0, 0, 0, .45);
}

.rn-pmove__btn-sub {
  font-size: 11px;
  color: rgba(0, 0, 0, .55);
}
</style>
