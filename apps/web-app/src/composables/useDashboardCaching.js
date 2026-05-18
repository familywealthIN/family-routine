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
      }
    }
  }
`;

/**
 * Transform goal items from the tag query into the AI input format.
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
      setCachedDashboard(tag, '', '');
      return true;
    }

    // 2. Flatten goal items to AI input format
    const aiItems = flattenGoalItems(goals);

    if (aiItems.length === 0) {
      setCachedDashboard(tag, '', '');
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
    setCachedDashboard(tag, description, nextSteps);
    return true;
  } catch (err) {
    console.error(`Failed to cache dashboard for tag "${tag}":`, err);
    return false;
  }
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

    await cacheTagDashboard(vm, tag);

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
