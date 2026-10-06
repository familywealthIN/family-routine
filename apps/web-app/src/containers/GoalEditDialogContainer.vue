<template>
  <!--
    The goal editor — DashBoard's dialog, mounted again (ARCHITECTURE.md § 7,
    "Modal container convention").

    The markup below is `DashBoard.vue`'s goal-display dialog verbatim: a
    fullscreen `atom-dialog` with `hide-overlay` and the bottom transition, a
    white toolbar whose only control is the close icon, and the SAME
    `GoalCreationContainer` inside a shadowless card. It is copied rather than
    re-presented because the editor the user already knows is the dashboard's,
    and a second chrome for the same form is a second thing to keep in step.
    Nothing is re-implemented either, so a goal saved here runs the same
    `addGoalItem` / `updateGoalItem` through the same `$goals` composable, with
    the same optimistic response and the same cache update, as one saved from
    the dashboard.

    What is NOT here:

    * **The open flag.** The editor is opened from several page flows (a day row,
      a week row, a month row), so the boolean stays with the page — the same
      split `GoalDisplayModalContainer` uses. `v-model` is therefore spelled out
      as `:value` + `@input`, which is all `v-model` compiles to.
    * **The delete.** It lives on the cascade ROW, exactly as the dashboard puts
      it on the goal list (`@delete-goal-item`) and keeps its editor dialog
      delete-free. Deleting cascades on the server to every transitive `goalRef`
      descendant, so the page runs it behind `GoalDeleteConfirmContainer`.
    * **Any read.** `GoalCreationContainer` owns the two the editor needs (the
      routine tasklist and the candidate parent goals).

    Nothing is disabled while a save is in flight (§ 3.7).
  -->
  <atom-dialog
    :value="open"
    fullscreen
    hide-overlay
    transition="dialog-bottom-transition"
    @input="onDialogInput"
  >
    <atom-card>
      <atom-toolbar color="white">
        <atom-spacer></atom-spacer>
        <atom-button icon data-testid="goal-edit-close" @click="$emit('close')">
          <atom-icon>close</atom-icon>
        </atom-button>
      </atom-toolbar>
      <atom-card class="no-shadow">
        <atom-card-text class="pa-0">
          <!--
            Keyed on the item so a second open always remounts the editor: EasyMDE
            / CodeMirror caches its own buffer, and `GoalCreation` only bumps its
            internal `markdownEditorKey` when `newGoalItem` changes identity.
          -->
          <goal-creation
            :key="editorKey"
            :newGoalItem="draft"
            v-on:add-update-goal-entry="onSaved"
          />
        </atom-card-text>
      </atom-card>
    </atom-card>
  </atom-dialog>
</template>

<script>
import {
  AtomButton, AtomCard, AtomCardText, AtomDialog, AtomIcon, AtomSpacer, AtomToolbar,
} from '@routine-notes/ui/atoms';
import { defaultGoalItem } from '../constants/goals';
import GoalCreation from './GoalCreationContainer.vue';

/**
 * A mutable copy of one goal item, in `defaultGoalItem`'s complete shape.
 *
 * `GoalCreation` edits `newGoalItem` IN PLACE, and the item handed in here comes
 * from Apollo's normalized cache by way of `goalCascade.itemsFor` — which only
 * shallow-copies. Writing into that record would mutate the cache behind
 * Apollo's back, so `tags` and `subTasks` are copied too. The missing keys come
 * from `defaultGoalItem` for the same reason `DashBoard` spreads it: the form
 * binds every field, and an absent one is not reactive in Vue 2.
 */
export function draftFrom(item, fallback = {}) {
  const source = item || {};
  return {
    ...defaultGoalItem,
    ...fallback,
    ...source,
    tags: Array.isArray(source.tags) ? [...source.tags] : [],
    subTasks: Array.isArray(source.subTasks) ? source.subTasks.map((sub) => ({ ...sub })) : [],
  };
}

export default {
  name: 'GoalEditDialogContainer',

  components: {
    GoalCreation, AtomButton, AtomCard, AtomCardText, AtomDialog, AtomIcon, AtomSpacer, AtomToolbar,
  },

  props: {
    open: { type: Boolean, default: false },
    /**
     * The goal item being edited — the COMPLETE record, stamped with the
     * `period` + `date` of the Goal document that owns it, which is the address
     * every goal-item mutation is sent to. `null` opens a blank editor.
     */
    item: { type: Object, default: null },
    /** Period + date a blank editor starts on, from the ladder step in view. */
    period: { type: String, default: 'day' },
    date: { type: String, default: '' },
  },

  data() {
    return {
      draft: draftFrom(this.item, { period: this.period, date: this.date }),
      editorKey: 0,
    };
  },

  computed: {
    /** A draft with no id was never saved, so a save of it is a CREATE. */
    isNew() {
      return !(this.draft && this.draft.id);
    },
  },

  watch: {
    /**
     * Rebuild once per OPEN — never on a republish of the item already being
     * edited.
     *
     * This used to watch `item` by object identity, which looks equivalent and is
     * not: `GoalsCascadeContainer` resolves the record out of its own read, so a
     * `cache-and-network` refetch hands back a NEW object for the SAME item while
     * the dialog is up. Rebuilding then threw away whatever the user had typed
     * AND bumped `editorKey`, remounting `GoalCreation` — which clears its pending
     * 2-second contribution auto-save in `beforeDestroy`. Net effect: a background
     * refetch mid-sentence silently dropped the contribution.
     */
    open: {
      immediate: true,
      handler(isOpen) {
        if (isOpen) this.resetDraft();
      },
    },

    /** A genuinely DIFFERENT item (id changed) is a new edit, so rebuild. */
    item(next, previous) {
      const nextId = (next && next.id) || '';
      const prevId = (previous && previous.id) || '';
      if (nextId !== prevId) this.resetDraft();
    },
  },

  methods: {
    /**
     * A fresh editable copy, and a remount of the editor.
     *
     * The remount is deliberate on open: EasyMDE/CodeMirror caches its own buffer
     * and `GoalCreation` only re-reads `newGoalItem` when its identity changes.
     * It must NOT happen mid-edit — see the `open` watcher.
     */
    resetDraft() {
      this.draft = draftFrom(this.item, { period: this.period, date: this.date });
      this.editorKey += 1;
    },

    /**
     * Escape and the Android back button close a Vuetify dialog by emitting
     * `input(false)`. The flag is the page's, so that is forwarded as `close`
     * rather than written here.
     */
    onDialogInput(value) {
      if (!value) this.$emit('close');
    },

    /**
     * `GoalCreationContainer` emits `(goalItem, false)` once the mutation
     * resolved — the same payload and the same `false` that closes the
     * dashboard's dialog. `created` tells the page which analytics event to
     * post and whether its ladder step should follow the goal.
     */
    onSaved(goalItem, keepOpen) {
      if (keepOpen) return;
      this.$emit('saved', { goalItem: goalItem || null, created: this.isNew });
      this.$emit('close');
    },
  },
};
</script>
