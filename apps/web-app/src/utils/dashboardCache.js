export {
  CACHE_KEY_PREFIX,
  CACHE_TTL,
  isCacheValid,
  getCachedDashboard,
  setCachedDashboard,
  getAllCachedDashboards,
  getTagsWithValidCache,
  getTagsMissingCache,
  clearExpiredCache,
  filterAreaProjectTags,
} from '@routine-notes/ui/utils/dashboardCache';
