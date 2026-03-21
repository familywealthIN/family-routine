import { AI_SEARCH_SETTINGS } from '@/constants/settings';
import getJSON from '@/utils/getJSON';

const AI_SEARCH_SETTINGS_PREFIX = `${AI_SEARCH_SETTINGS}:`;

const DEFAULT_AI_SEARCH_SETTINGS = {
  aiEnhancedTask: false,
  associateParentGoal: false,
  buildOnNextSteps: false,
};

function normalizeRoutineId(routineId) {
  if (!routineId) return '';
  return String(routineId).trim();
}

export function getAiSearchSettingsKey(routineId) {
  const normalizedId = normalizeRoutineId(routineId);
  if (!normalizedId) return AI_SEARCH_SETTINGS;
  return `${AI_SEARCH_SETTINGS_PREFIX}${normalizedId}`;
}

export function readAiSearchSettings(routineId) {
  const routineKey = getAiSearchSettingsKey(routineId);
  const routineSettings = getJSON(localStorage.getItem(routineKey), null);

  if (routineSettings && Object.keys(routineSettings).length > 0) {
    return {
      ...DEFAULT_AI_SEARCH_SETTINGS,
      ...routineSettings,
    };
  }

  // Temporary migration fallback from legacy global key.
  const legacySettings = getJSON(localStorage.getItem(AI_SEARCH_SETTINGS), null);
  if (legacySettings && Object.keys(legacySettings).length > 0) {
    return {
      ...DEFAULT_AI_SEARCH_SETTINGS,
      ...legacySettings,
    };
  }

  return { ...DEFAULT_AI_SEARCH_SETTINGS };
}

export function writeAiSearchSettings(routineId, settings) {
  const normalizedId = normalizeRoutineId(routineId);
  if (!normalizedId) return false;

  const key = getAiSearchSettingsKey(normalizedId);
  const payload = {
    ...DEFAULT_AI_SEARCH_SETTINGS,
    ...(settings || {}),
  };

  localStorage.setItem(key, JSON.stringify(payload));
  return true;
}

export function getDefaultAiSearchSettings() {
  return { ...DEFAULT_AI_SEARCH_SETTINGS };
}
