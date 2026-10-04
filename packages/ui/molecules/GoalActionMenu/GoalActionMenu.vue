<template>
  <!--
    The ⋮ action sheet. Edit, add a child, delete — the three things that used to
    be buttons crowding every row and a `v-menu` inside a `v-list-tile-action`.
    Delete is last and red; nothing here is a primary action.
  -->
  <div class="rn-gam" data-testid="goal-action-menu">
    <div class="rn-gam__title">{{ title }}</div>
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="rn-gam__row"
      :style="{ color: item.color || 'rgba(0,0,0,.8)' }"
      :data-testid="`goal-action-${item.key}`"
      @click="$emit('select', item.key)"
    >
      <i class="rn-mi rn-gam__icon">{{ item.icon }}</i>{{ item.label }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'MoleculeGoalActionMenu',
  props: {
    /** The goal body this menu belongs to, so the sheet says what it will act on. */
    title: { type: String, default: '' },
    /** [{ key, icon, label, color }] */
    items: { type: Array, default: () => [] },
  },
};
</script>

<style>
.rn-gam {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  margin: 0 -16px;
}

.rn-gam__title {
  padding: 6px 20px 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, .54);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-gam__row {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  height: 52px;
  padding: 0 20px;
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
}

.rn-gam__row:hover {
  background: rgba(0, 0, 0, .04);
}

.rn-gam__icon {
  font-size: 22px;
}
</style>
