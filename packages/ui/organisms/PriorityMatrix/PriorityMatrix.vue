<template>
  <AtomCard class="elevation-0">
    <AtomCardText class="pa-2">
      <AtomLayout row wrap>
        <!-- Top Left: DO (Important + Urgent) -->
        <AtomFlex xs12 md6>
          <priority-quadrant
            title="DO"
            subtitle="Important + Urgent"
            color="error"
            icon="priority_high"
            :items="doItems"
            :tasklist="tasklist"
            @item-click="handleItemClick"
            @toggle-complete="handleToggleComplete"
            @edit-item="handleEditItem"
          />
        </AtomFlex>

        <!-- Top Right: PLAN (Important + Not Urgent) -->
        <AtomFlex xs12 md6>
          <priority-quadrant
            title="PLAN"
            subtitle="Important + Not Urgent"
            color="primary"
            icon="event"
            :items="planItems"
            :tasklist="tasklist"
            @item-click="handleItemClick"
            @toggle-complete="handleToggleComplete"
            @edit-item="handleEditItem"
          />
        </AtomFlex>

        <!-- Bottom Left: DELEGATE (Not Important + Urgent) -->
        <AtomFlex xs12 md6>
          <priority-quadrant
            title="DELEGATE"
            subtitle="Not Important + Urgent"
            color="warning"
            icon="people"
            :items="delegateItems"
            :tasklist="tasklist"
            @item-click="handleItemClick"
            @toggle-complete="handleToggleComplete"
            @edit-item="handleEditItem"
          />
        </AtomFlex>

        <!-- Bottom Right: AUTOMATE (Not Important + Not Urgent) -->
        <AtomFlex xs12 md6>
          <priority-quadrant
            title="AUTOMATE"
            subtitle="Not Important + Not Urgent"
            color="grey darken-1"
            icon="settings"
            :items="automateItems"
            :tasklist="tasklist"
            @item-click="handleItemClick"
            @toggle-complete="handleToggleComplete"
            @edit-item="handleEditItem"
          />
        </AtomFlex>
      </AtomLayout>
    </AtomCardText>
  </AtomCard>
</template>

<script>
import PriorityQuadrant from '../../molecules/PriorityQuadrant/PriorityQuadrant.vue';
import {
  AtomCard,
  AtomCardText,
  AtomFlex,
  AtomLayout,
} from '../../atoms';

export default {
  name: 'OrganismPriorityMatrix',
  components: {
    AtomCard,
    AtomCardText,
    AtomFlex,
    AtomLayout,
    PriorityQuadrant,
  },
  props: {
    doItems: {
      type: Array,
      default: () => [],
    },
    planItems: {
      type: Array,
      default: () => [],
    },
    delegateItems: {
      type: Array,
      default: () => [],
    },
    automateItems: {
      type: Array,
      default: () => [],
    },
    tasklist: {
      type: Array,
      default: () => [],
    },
  },
  methods: {
    handleItemClick(item) {
      this.$emit('item-click', item);
    },
    handleToggleComplete(item) {
      this.$emit('toggle-complete', item);
    },
    handleEditItem(item) {
      this.$emit('edit-item', item);
    },
  },
};
</script>

<style scoped>
/* Responsive adjustments */
@media (max-width: 960px) {
  .v-card__text {
    padding: 8px !important;
  }
}
</style>
