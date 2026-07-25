export default function getJSON(jsonString, defaultValue = {}) {
  if (jsonString === null || jsonString === undefined) {
    return defaultValue;
  }
  try {
    const parsed = JSON.parse(jsonString);
    // JSON.parse(null)/JSON.parse('null') return null without throwing, so the
    // default would otherwise be skipped for absent/"null" localStorage keys.
    return parsed === null || parsed === undefined ? defaultValue : parsed;
  } catch (e) {
    return defaultValue;
  }
}
