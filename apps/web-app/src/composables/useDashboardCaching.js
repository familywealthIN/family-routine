import gql from 'graphql-tag';
import moment from 'moment';
import eventBus, { EVENTS } from '../utils/eventBus';
import {
  isCacheValid,
  setCachedDashboard,
  getTagsMissingCache,
  clearExpiredCache,
  filterAreaProjectTags,
} from '../utils/dashboardCache';

/**
 * Dashboard Caching Composable
 *
 * Fetches and caches Description + Next Steps for all area/project tags
 * in localStorage with a 24-hour TTL. Processes tags sequentially to
 * avoid flooding the LLM API.
 *
 * Two entry points, one store and one in-flight registry:
 *
 *   - `initDashboardCaching(vm, { tags })` — the daily sweep, kicked off by
 *     `mixins/dashboardContextMixin` for routines opted into AI Search.
 *   - `ensureTagContext(vm, tag)` — on demand, once, for the tag on the
 *     routine the user just focused. This is what makes the thread's
 *     "Before you start" card work for every tagged routine instead of only
 *     the opted-in ones, without paying for tags nobody opens.
 *
 * Usage in a Vue component:
 *   import { initDashboardCaching } from '@/composables/useDashboardCaching';
 *
 *   mounted() {
 *     initDashboardCaching(this);
 *   }
 */

const GET_GOALS_SUMMARY = gql`
  query GetGoalsSummary($items: [AiItemInput!]!) {
    getGoalsSummary(items: $items) {
      description
    }
  }
`;

const GET_GOALS_NEXT_STEPS = gql`
  query GetGoalsNextSteps($items: [AiItemInput!]!) {
    getGoalsNextSteps(items: $items) {
      nextSteps
    }
  }
`;

/**
 * Fetch goals by tag bypassing Apollo's InMemoryCache normalization.
 * The goalsByTag resolver returns goals with id: null, causing Apollo
 * to merge all entries into one normalized cache object. Using 'no-cache'
 * fetchPolicy preserves the full, un-merged response.
 */
const GOALS_BY_TAG = gql`
  query goalsByTag($tag: String!) {
    goalsByTag(tag: $tag) {
      date
      period
      goalItems {
        body
        isComplete
      }
    }
  }
`;

/**
 * Deduplicate goal items by body text
 * @param {Array} goals - Array of goal objects with goalItems
 * @returns {Array} - Array of unique { body, period, date }
 */
function dedupeGoalItems(goals) {
  const seenBodies = new Set();
  return goals.flatMap((goal) => {
    if (!Array.isArray(goal.goalItems)) return [];
    return goal.goalItems.reduce((acc, goalItem) => {
      if (!goalItem.body || seenBodies.has(goalItem.body)) return acc;
      seenBodies.add(goalItem.body);
      acc.push({ body: goalItem.body, period: goal.period, date: goal.date });
      return acc;
    }, []);
  });
}

/**
 * Transform goal items from the tag query into the AI input format.
 * - Finds the latest date among day-period goals in the response
 * - Picks the 7 most recent day-entries from that latest date backwards
 * - Always includes non-day periods (week, month, year, lifetime)
 * - Deduplicates items by body text to avoid repetitive context
 * - Caps total items at 20 to keep LLM context manageable
 * @param {Array} goals - Array of goal objects with goalItems
 * @returns {Array} - Array of { body, period, date }
 */
function flattenGoalItems(goals) {
  if (!Array.isArray(goals)) return [];

  const MAX_ITEMS = 20;
  const MAX_DAY_ENTRIES = 7;

  // Separate day-period goals from others
  const dayGoals = [];
  const nonDayGoals = [];

  goals.forEach((goal) => {
    if (!Array.isArray(goal.goalItems) || goal.goalItems.length === 0) return;
    if (goal.period === 'day') {
      dayGoals.push(goal);
    } else {
      nonDayGoals.push(goal);
    }
  });

  // Sort day goals by date descending (newest first)
  dayGoals.sort((a, b) => {
    const dateA = moment(a.date, 'DD-MM-YYYY');
    const dateB = moment(b.date, 'DD-MM-YYYY');
    return dateB.valueOf() - dateA.valueOf();
  });

  // Collect unique day-dates (already sorted newest-first) and pick latest 7
  const allowedDates = new Set();
  dayGoals.forEach((goal) => {
    if (allowedDates.size < MAX_DAY_ENTRIES) {
      allowedDates.add(goal.date);
    }
  });

  const recentDayGoals = dayGoals.filter((goal) => allowedDates.has(goal.date));

  // Combine: non-day goals + latest 7 day-entries, then deduplicate
  const combined = [...nonDayGoals, ...recentDayGoals];
  return dedupeGoalItems(combined).slice(0, MAX_ITEMS);
}

const MAX_ACTIVITY_ROWS = 3;

/**
 * The PAST ACTIVITY rows the routine thread's "Before you start" card shows:
 * the three most recent day-period items under this tag, newest first.
 *
 * Derived here rather than queried again from the card, because `goalsByTag`
 * has already been fetched for the LLM input a few lines below and this is the
 * only pass over it. The day label is what the card's fixed 40px date column
 * renders, so it is formatted once, here.
 *
 * @param {Array} goals - goalsByTag response
 * @returns {Array<{ date: string, text: string, done: boolean }>}
 */
function recentActivity(goals) {
  if (!Array.isArray(goals)) return [];

  const dayGoals = goals
    .filter((goal) => goal && goal.period === 'day'
      && Array.isArray(goal.goalItems) && goal.goalItems.length)
    .slice()
    .sort((a, b) => moment(b.date, 'DD-MM-YYYY').valueOf() - moment(a.date, 'DD-MM-YYYY').valueOf());

  const rows = [];
  dayGoals.forEach((goal) => {
    const label = moment(goal.date, 'DD-MM-YYYY').format('ddd');
    goal.goalItems.forEach((item) => {
      if (rows.length < MAX_ACTIVITY_ROWS && item && item.body) {
        rows.push({ date: label, text: item.body, done: !!item.isComplete });
      }
    });
  });
  return rows;
}

/**
 * Cache a single tag's dashboard data by fetching goals, summary, and next steps
 * @param {Object} vm - Vue component instance (needs $goals and $apollo)
 * @param {string} tag - The area/project tag to cache
 * @returns {Promise<boolean>} - Whether caching succeeded
 */
async function cacheTagDashboard(vm, tag) {
  try {
    // 1. Fetch goals for this tag using no-cache to avoid Apollo normalization
    // (goalsByTag returns goals with id: null, causing cache merge issues)
    const { data } = await vm.$apollo.query({
      query: GOALS_BY_TAG,
      variables: { tag },
      fetchPolicy: 'no-cache',
    });
    const goals = data?.goalsByTag || [];

    if (!goals || goals.length === 0) {
      // No goals — cache as empty so we don't retry
      setCachedDashboard(tag, '', '', []);
      return true;
    }

    // 2. Flatten goal items to AI input format
    const aiItems = flattenGoalItems(goals);
    const activity = recentActivity(goals);

    if (aiItems.length === 0) {
      setCachedDashboard(tag, '', '', activity);
      return true;
    }

    // 3. Fetch summary and next steps in parallel
    const [summaryResult, nextStepsResult] = await Promise.all([
      vm.$apollo.query({
        query: GET_GOALS_SUMMARY,
        variables: { items: aiItems },
        fetchPolicy: 'network-only',
      }),
      vm.$apollo.query({
        query: GET_GOALS_NEXT_STEPS,
        variables: { items: aiItems },
        fetchPolicy: 'network-only',
      }),
    ]);

    const description = summaryResult?.data?.getGoalsSummary?.description || '';
    const nextSteps = nextStepsResult?.data?.getGoalsNextSteps?.nextSteps || '';

    // 4. Cache the results
    setCachedDashboard(tag, description, nextSteps, activity);
    return true;
  } catch (err) {
    console.error(`Failed to cache dashboard for tag "${tag}":`, err);
    return false;
  }
}

/**
 * tag -> the context run currently in flight for it.
 *
 * Shared by BOTH paths — the daily sweep below and the on-demand
 * `ensureTagContext` the routine thread calls — so the same tag can never have
 * two runs out at once, however it was asked for: two routines sharing
 * `area:health`, the sweep and a focus landing on the same tag, or the phone
 * and tablet chat panes both mounted. Each run is three network calls and two
 * of them hit a model, so a duplicate is real money.
 */
const inFlight = new Map();

/**
 * Tags the on-demand path has already spent a run on this session.
 *
 * The sweep is allowed to retry a tag on its next run (a new day, a newly
 * tagged routine); the on-demand path is not — it fires on every focus change,
 * so "once" has to mean once. A reload gets a fresh attempt.
 */
const onDemandAttempted = new Set();

/**
 * One context run per tag, whoever asked.
 *
 * @returns {Promise<boolean>} Whether the tag now has a cache entry.
 */
function runTagContext(vm, tag) {
  const existing = inFlight.get(tag);
  if (existing) return existing;

  const run = cacheTagDashboard(vm, tag).finally(() => {
    inFlight.delete(tag);
  });
  inFlight.set(tag, run);
  return run;
}

/**
 * Build one tag's context on demand, now, because the user is looking at a
 * routine that carries it.
 *
 * The daily sweep only covers routines opted into AI Search, so without this
 * the routine thread's "Before you start" card would be missing for most
 * tagged routines — narrower than the Areas/Projects pages it replaced (see
 * docs/redesign/STATUS.md gap 16). Widening the sweep instead would buy that
 * coverage with one model call per tagged routine per day whether or not the
 * user ever opens it; this spends only on the tags they actually focus.
 *
 * Deliberately silent: no `DASHBOARD_CACHING_STATUS` event, because that drives
 * the sweep's progress UI and the thread must not pop anything while a card
 * fills in. A failure resolves `false` rather than throwing, so the caller's
 * only job is to stop showing the placeholder.
 *
 * @param {Object} vm - Vue component instance (needs $apollo)
 * @param {string} tag - One `area:`/`project:` tag
 * @returns {Promise<boolean>} Whether the tag now has a cache entry.
 */
export function ensureTagContext(vm, tag) {
  const key = String(tag || '').trim();
  if (!key || filterAreaProjectTags([key]).length === 0) return Promise.resolve(false);
  // Still inside the 24h TTL — the sweep, an earlier focus or the Area page
  // already paid for this one.
  if (isCacheValid(key)) return Promise.resolve(true);

  // A run is already out (possibly the sweep's); join it instead of starting a
  // second. Joining does NOT count as this path's one attempt.
  const existing = inFlight.get(key);
  if (existing) return existing;

  if (onDemandAttempted.has(key)) return Promise.resolve(false);
  onDemandAttempted.add(key);
  return runTagContext(vm, key);
}

const GET_PROJECT_TAGS = gql`
  query projectTags {
    projectTags
  }
`;

const GET_AREA_TAGS = gql`
  query areaTags {
    areaTags
  }
`;

/**
 * Fetch area and project tags from the GraphQL API.
 * These tags come from routine items stored in the database,
 * matching the sidebar submenu items.
 *
 * @param {Object} vm - Vue component instance (needs $apollo)
 * @returns {Promise<string[]>} - Combined array of area/project tags
 */
async function fetchRoutineTags(vm) {
  const [projectResult, areaResult] = await Promise.all([
    vm.$apollo.query({
      query: GET_PROJECT_TAGS,
      fetchPolicy: 'network-only',
    }),
    vm.$apollo.query({
      query: GET_AREA_TAGS,
      fetchPolicy: 'network-only',
    }),
  ]);

  const projectTags = projectResult?.data?.projectTags || [];
  const areaTags = areaResult?.data?.areaTags || [];

  return [...areaTags, ...projectTags];
}

/**
 * Initialize dashboard caching for all area/project tags.
 * Fetches area/project tags from GraphQL (the same source used by the sidebar),
 * skips already-cached ones, and processes remaining tags sequentially.
 *
 * Emits DASHBOARD_CACHING_STATUS events via event bus for progress tracking.
 *
 * @param {Object} vm - Vue component instance (needs $apollo)
 * @param {Object} [options] - Optional behavior overrides
 * @param {string[]} [options.tags] - Explicit area/project tags to cache
 * @returns {Promise<void>}
 */
export async function initDashboardCaching(vm, options = {}) {
  // Clean up expired entries first
  clearExpiredCache();

  // Fetch area/project tags from routines (same source as sidebar)
  // unless caller provides an explicit filtered tag set.
  const explicitTags = Array.isArray(options.tags) ? options.tags : [];
  const sourceTags = explicitTags.length > 0 ? explicitTags : await fetchRoutineTags(vm);
  const areaProjectTags = [...new Set(filterAreaProjectTags(sourceTags))];

  if (areaProjectTags.length === 0) return;

  // Find tags that need caching
  const tagsToCache = getTagsMissingCache(areaProjectTags);

  if (tagsToCache.length === 0) return;

  // Signal caching started
  eventBus.$emit(EVENTS.DASHBOARD_CACHING_STATUS, {
    isCaching: true,
    progress: 0,
    total: tagsToCache.length,
    completed: 0,
    currentTag: tagsToCache[0] || '',
  });

  // Process tags sequentially to avoid flooding LLM API
  // eslint-disable-next-line no-await-in-loop
  await tagsToCache.reduce(async (prevPromise, tag, index) => {
    await prevPromise;

    // Emit current tag being processed
    eventBus.$emit(EVENTS.DASHBOARD_CACHING_STATUS, {
      isCaching: true,
      progress: Math.round((index / tagsToCache.length) * 100),
      total: tagsToCache.length,
      completed: index,
      currentTag: tag,
    });

    // Through the shared registry, so a tag the routine thread is already
    // fetching on demand is joined rather than fetched twice.
    await runTagContext(vm, tag);

    const completedCount = index + 1;
    const progress = Math.round((completedCount / tagsToCache.length) * 100);

    eventBus.$emit(EVENTS.DASHBOARD_CACHING_STATUS, {
      isCaching: completedCount < tagsToCache.length,
      progress,
      total: tagsToCache.length,
      completed: completedCount,
      currentTag: completedCount < tagsToCache.length ? tagsToCache[completedCount] : '',
    });
  }, Promise.resolve());
}

export { isCacheValid };
