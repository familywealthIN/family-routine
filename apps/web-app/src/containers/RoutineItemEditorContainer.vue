<template>
  <routine-editor-sheet
    :open="open"
    :shell="shell"
    :routine="routine"
    :default-time="defaultTime"
    :siblings="siblings"
    :max-points="maxPoints"
    :tag-universe="tagUniverse"
    :tag-usage="tagUsage"
    :agent="agent"
    :year-goal="yearGoal"
    :error-message="errorMessage"
    :suggested-steps="suggestedSteps"
    @close="close"
    @save="save"
    @delete="remove"
    @manage-agent="$emit('manage-agent', routine && routine.id)"
    @open-goal="$emit('open-goal', $event)"
    @name-input="onNameInput"
    @steps-edited="onStepsEdited"
  />
</template>

<script>
/**
 * Write container for the Routines editor — the sheet plus the routine-item write
 * CRUD behind it (create · update · delete).
 *
 * All three write the SAME entity through the same field set, so the blast radius
 * is still one slice (the `AgentFormContainer` / `GoalItemListContainer`
 * precedent for "one container owns one entity's write CRUD").
 *
 * Imperative `openNew(minutes)` / `openEdit(routine)` so the page carries no
 * sheet state (the `AgentEditModalContainer` convention).
 *
 * CACHE SAFETY
 * ------------
 * - Every mutation returns the COMPLETE routine template (the same field set the
 *   page's one read selects), so Apollo normalizes `RoutineItem:<id>` and every
 *   query holding that id updates for free. There is no `readQuery → clone →
 *   writeQuery` anywhere here (§3.1), and no partial list field is ever returned
 *   (§3.2).
 * - `guardLink` confirms every scalar a mutation result carries, so a
 *   `cache-and-network` read of `routineItems` that left BEFORE the save cannot
 *   land afterwards and revert the name, time or points (utils/cacheGuard.js).
 *   That is why no control here is disabled while a request is in flight (§3.7).
 *   `tags` and `steps` are lists, which the guard deliberately does not cover —
 *   they are healed by the read instead.
 * - Create and delete change the LIST, and Apollo 2.x has no `cache.evict`, so
 *   those two refetch the page's one read (`refetchQueries`) rather than cloning
 *   it. An update refetches nothing.
 *
 * STANDARD STEPS
 * --------------
 * A NEW routine's steps pre-fill from its name (`suggestRoutineSteps`, step 1
 * being the cue the reminder leads with). The sheet emits each name; this asks
 * once the typing pauses, and only while the user has not touched the steps.
 * Once they have, the create says `suggestSteps: false`, so an empty list the
 * user made is not filled in by the server's own default either.
 */
import RoutineEditorSheet from '@routine-notes/ui/organisms/RoutineEditorSheet/RoutineEditorSheet.vue';
import { fromMinutes, maxPointsFor } from '@routine-notes/ui/utils/dayDial';
import { agentStatusKey } from '@routine-notes/ui/constants/agents';
import {
  ADD_ROUTINE_ITEM_MUTATION,
  DELETE_ROUTINE_ITEM_MUTATION,
  ROUTINE_SETTINGS_ITEMS_QUERY,
  SUGGEST_ROUTINE_STEPS_QUERY,
  UPDATE_ROUTINE_ITEM_MUTATION,
} from '../composables/graphql/routineSettingsQueries';

/** How long the name has to sit still before its steps are asked for. */
export const SUGGEST_DEBOUNCE_MS = 600;
/** Shorter than this is a name still being typed, not one worth asking about. */
export const SUGGEST_MIN_CHARS = 3;

/** A step id has to exist before the step is saved — it is the list's key. */
const newStepId = () => {
  const crypto = typeof window !== 'undefined' ? window.crypto : null;
  if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * The sentence to show for a failed write. The server refuses with
 * `ApiError(400, '400:<reason>')` (e.g. the points budget, E2E BUG-4), which
 * Apollo hands over as "GraphQL error: 400:<reason>" — neither prefix means
 * anything to the user, the reason is already written in the editor's own words.
 */
export const describeWriteError = (error, fallback) => {
  const gqlErrors = (error && error.graphQLErrors) || [];
  const raw = (gqlErrors[0] && gqlErrors[0].message) || (error && error.message) || '';
  const reason = String(raw)
    .replace(/^GraphQL error:\s*/i, '')
    .replace(/^\d{3}:\s*/, '')
    .trim();
  return reason || fallback;
};

export default {
  name: 'RoutineItemEditorContainer',

  components: { RoutineEditorSheet },

  props: {
    shell: { type: String, default: 'phone' },
    /**
     * Every routine's `{ id, time, points }` — `time` for the "Until 12:30 ·
     * 3h 30m" caption, `points` for the day's shared points budget. The edited
     * routine is in here too; both derivations exclude it by id.
     */
    siblings: { type: Array, default: () => [] },
    tagUniverse: { type: Array, default: () => [] },
    tagUsage: { type: Object, default: () => ({}) },
    /** routine id -> `{ id, body, pct }` for the linked year goal row. */
    yearGoals: { type: Object, default: () => ({}) },
  },

  data() {
    return {
      open: false,
      routine: null,
      defaultTime: '',
      errorMessage: '',
      /** `{ name, steps }` for the sheet, or null. */
      suggestedSteps: null,
      /** The user has edited this new routine's steps; suggest nothing more. */
      stepsEdited: false,
    };
  },

  created() {
    // Not reactive: a timer handle and a request counter are bookkeeping.
    this.suggestTimer = null;
    this.suggestSeq = 0;
  },

  beforeDestroy() {
    clearTimeout(this.suggestTimer);
  },

  computed: {
    /** The agent bound to this routine, from the agent domain's own store. */
    agent() {
      const id = this.routine && this.routine.id;
      if (!id || !this.$agent) return null;
      const found = this.$agent.getByTaskRef(String(id));
      if (!found) return null;
      // Day-scoped: yesterday's run reads idle, like everywhere else.
      return { name: found.name || '', status: agentStatusKey(found) };
    },

    yearGoal() {
      const id = this.routine && this.routine.id;
      return (id && this.yearGoals && this.yearGoals[String(id)]) || null;
    },

    /**
     * The ceiling the editor's points stepper stops at: `min(50, what the day's
     * 100-point budget has left)`.
     *
     * The budget is a property of the LIST, not of one routine, so only
     * something holding the list can work it out — the organism is pure and the
     * arithmetic itself lives in `dayDial.maxPointsFor`. The edited routine's own
     * points are added back there, so re-saving it unchanged is always allowed.
     */
    maxPoints() {
      return maxPointsFor(this.siblings, (this.routine && this.routine.id) || '');
    },
  },

  methods: {
    /** @param {number} [minutes] the gap row's midpoint, when one was tapped. */
    openNew(minutes = null) {
      this.resetSuggestion();
      this.routine = null;
      this.defaultTime = minutes == null ? '' : fromMinutes(minutes);
      this.errorMessage = '';
      this.open = true;
    },

    openEdit(routine) {
      if (!routine || !routine.id) return;
      this.resetSuggestion();
      this.routine = routine;
      this.defaultTime = '';
      this.errorMessage = '';
      this.open = true;
    },

    /** Forget the last routine's suggestion, and drop any answer still on its way. */
    resetSuggestion() {
      clearTimeout(this.suggestTimer);
      this.suggestTimer = null;
      this.suggestSeq += 1;
      this.suggestedSteps = null;
      this.stepsEdited = false;
    },

    /** Only a NEW routine whose steps the user has not touched asks. */
    canSuggest() {
      return this.open && !this.routine && !this.stepsEdited;
    },

    /** The sheet's name field, debounced into one suggestion request. */
    onNameInput(name) {
      clearTimeout(this.suggestTimer);
      this.suggestTimer = null;
      const clean = String(name || '').trim();
      if (!this.canSuggest() || clean.length < SUGGEST_MIN_CHARS) return;
      this.suggestTimer = setTimeout(() => {
        this.suggestTimer = null;
        this.fetchSuggestion(clean);
      }, SUGGEST_DEBOUNCE_MS);
    },

    onStepsEdited() {
      this.stepsEdited = true;
      clearTimeout(this.suggestTimer);
      this.suggestTimer = null;
    },

    async fetchSuggestion(name) {
      this.suggestSeq += 1;
      const seq = this.suggestSeq;
      try {
        const { data } = await this.$apollo.query({
          query: SUGGEST_ROUTINE_STEPS_QUERY,
          variables: { name },
          // Explicit: the app's default is cache-and-network, which a one-shot
          // `query` refuses outright. A name's standard steps do not change.
          fetchPolicy: 'cache-first',
        });
        // A newer name, another routine, or the user's own steps won meanwhile.
        if (seq !== this.suggestSeq || !this.canSuggest()) return;
        const steps = ((data && data.suggestRoutineSteps) || []).filter(Boolean);
        this.suggestedSteps = { name, steps };
      } catch (error) {
        // No suggestion is not an error the user needs to hear about: the
        // steps field is right there to type into.
      }
    },

    close() {
      this.open = false;
      this.$emit('close');
    },

    variablesFor(payload) {
      return {
        name: payload.name,
        description: payload.description || '',
        time: payload.time,
        points: payload.points,
        // A step with no id is a step the server would store without one, and
        // the list is keyed by it — an id-less step renders as no row at all.
        steps: (payload.steps || []).map((step) => ({
          id: step.id || newStepId(),
          name: step.name,
        })),
        tags: payload.tags || [],
        notifyMode: payload.notifyMode || 'notify',
      };
    },

    async save(payload) {
      this.errorMessage = '';
      const creating = !payload.id;
      try {
        const { data } = await this.$apollo.mutate({
          mutation: creating ? ADD_ROUTINE_ITEM_MUTATION : UPDATE_ROUTINE_ITEM_MUTATION,
          variables: creating
            // A list the user emptied themselves stays empty on the server too.
            ? { ...this.variablesFor(payload), suggestSteps: !this.stepsEdited }
            : { id: payload.id, ...this.variablesFor(payload) },
          // Only the list shape needs healing, and only when it changed.
          refetchQueries: creating ? [{ query: ROUTINE_SETTINGS_ITEMS_QUERY }] : [],
        });
        const saved = (data && (creating ? data.addRoutineItem : data.updateRoutineItem)) || null;
        this.open = false;
        this.$emit('saved', saved, creating);
        return saved;
      } catch (error) {
        // Stay open with the reason on screen: a sheet that closed on failure
        // reads as a successful save.
        this.errorMessage = describeWriteError(error, 'Could not save this routine');
        this.$emit('failed', this.errorMessage);
        return null;
      }
    },

    async remove(id) {
      if (!id) return;
      const removed = this.routine;
      try {
        await this.$apollo.mutate({
          mutation: DELETE_ROUTINE_ITEM_MUTATION,
          variables: { id },
          refetchQueries: [{ query: ROUTINE_SETTINGS_ITEMS_QUERY }],
        });
        this.open = false;
        this.$emit('removed', removed);
      } catch (error) {
        this.errorMessage = describeWriteError(error, 'Could not delete this routine');
        this.$emit('failed', this.errorMessage);
      }
    },
  },
};
</script>
