<template>
  <!--
    Legacy call-site shim for the goal forms. See the script block: this is the
    old `goalTags` / `userTags` / `update-new-tag-items` contract wired to
    MoleculeHierarchicalTagInput, so the app has exactly ONE tag editor.
  -->
  <HierarchicalTagInput
    class="goal-tags-input"
    :value="normalizedTags"
    :universe="userTags || []"
    :hint="hint"
    usage-noun="goal"
    @input="$emit('update-new-tag-items', $event)"
  />
</template>

<script>
import HierarchicalTagInput from '../HierarchicalTagInput/HierarchicalTagInput.vue';

/**
 * GoalTagsInput — a thin adapter, not an implementation.
 *
 * The tag editor lives in `MoleculeHierarchicalTagInput`: chips split per `:`
 * segment, a level-aware autocomplete that drills into `area:` /
 * `project:` scopes, and the keyboard contract from
 * docs/redesign/chassis.md § "Hierarchical `:` tags".
 *
 * This file stays only to keep the four existing call sites
 * (GoalCreation, QuickGoalCreation, GoalList, SettingsTime) working untouched:
 * they pass `goalTags` / `userTags` and listen for `update-new-tag-items`,
 * where the shared component takes `value` / `universe` and emits `input`
 * (so it also works with `v-model`). New call sites should use
 * `HierarchicalTagInput` directly; this wrapper is the migration path, and can
 * be deleted once those four are moved over.
 */
export default {
  name: 'GoalTagsInput',
  components: {
    HierarchicalTagInput,
  },
  props: {
    /** The goal's applied tags. */
    goalTags: {
      type: Array,
      default: () => [],
    },
    /** The user's known tag vocabulary, for suggestions. */
    userTags: {
      type: Array,
      default: () => [],
    },
    /**
     * Helper line under the field. Empty by default: these forms are dense and
     * did not have one before, so the shim keeps their height unchanged. Pass
     * the chassis copy explicitly to opt in.
     */
    hint: {
      type: String,
      default: '',
    },
  },
  computed: {
    normalizedTags() {
      if (!this.goalTags || !Array.isArray(this.goalTags)) return [];
      return this.goalTags;
    },
  },
};
</script>

<style>
/* The goal forms place this field in a 24px-indented row; everything else is
   the shared component's own chrome. */
.goal-tags-input {
  margin-bottom: 8px;
  padding: 4px 0;
}
</style>
