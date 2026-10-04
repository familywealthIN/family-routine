/**
 * Daily area/project context generation.
 *
 * Once a day, for every area:/project: tag on a routine the user has opted into
 * AI Search for, we ask the server for a Description + Next Steps summary and
 * park it in localStorage (24h TTL — see utils/dashboardCache). The AI Search
 * Modal's "Build on Next Steps" toggle reads that cache and injects it as the
 * system prompt, so without this run the toggle stays permanently disabled.
 *
 * This sweep is deliberately still scoped to the opt-in. The routine thread's
 * "Before you start" card needs context for EVERY tagged routine, and it gets
 * it from `ensureTagContext` instead — on demand, when a routine is focused,
 * into this same store. Widening the sweep to every tagged routine would buy
 * the same coverage with a model call per tag per day whether the user opens it
 * or not. The two paths share one in-flight registry, so a tag can never be
 * built twice.
 *
 * Extracted from DashBoard.vue because the Routine Focus home screen replaced
 * the dashboard at `/home`: the kick-off lived in DashBoard's `mounted()` and
 * tasklist watcher, so on the new home nothing ever generated the context.
 * Both screens now share this one copy.
 *
 * Requires on the host component:
 *   - `tasklist`  the day's routine items (or a populated `$currentTaskList`)
 *   - `$apollo`, `$root.$data.email`
 *
 * Call `startDashboardCaching()` from the host's tasklist watcher — the routine
 * list arrives asynchronously from Apollo, so `mounted()` alone is too early.
 */
import { initDashboardCaching } from '../composables/useDashboardCaching';
import { filterAreaProjectTags } from '../utils/dashboardCache';
import { readAiSearchSettings } from '../utils/aiSearchSettings';

// The tasklist watcher re-fires on every Apollo cache write, and a run makes one
// LLM round-trip per tag. Without this, a single app-open could start the same
// sequential run several times over and flood the AI API.
let cachingRun = null;

export const dashboardContextMixin = {
  methods: {
    // Collect area/project tags for routines where the user has opted in to AI
    // Search in either task mode (aiEnhancedTask) or goal mode
    // (associateParentGoal). We only build context for those routines.
    getAiEnabledRoutineTags() {
      const routines = Array.isArray(this.$currentTaskList) && this.$currentTaskList.length
        ? this.$currentTaskList
        : this.tasklist;

      if (!Array.isArray(routines) || routines.length === 0) {
        return [];
      }

      const tags = routines.reduce((acc, routine) => {
        const routineId = routine && routine.id;
        const settings = readAiSearchSettings(routineId);
        if (!settings.aiEnhancedTask && !settings.associateParentGoal) {
          return acc;
        }

        const routineTags = Array.isArray(routine.tags) ? routine.tags : [];
        if (routineTags.length > 0) {
          acc.push(...routineTags);
        }
        return acc;
      }, []);

      return [...new Set(filterAreaProjectTags(tags))];
    },

    // Start context generation for area/project tags drawn from AI-enabled
    // routines only (task mode or goal mode).
    startDashboardCaching() {
      if (!this.$root.$data.email) return;
      if (cachingRun) return;

      const tags = this.getAiEnabledRoutineTags();
      if (tags.length === 0) return;

      cachingRun = initDashboardCaching(this, { tags })
        .catch((err) => {
          console.error('[dashboardContext] Failed to build area/project context:', err);
        })
        .finally(() => {
          cachingRun = null;
        });
    },
  },
};

export default dashboardContextMixin;
