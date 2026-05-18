export default function getJSON(jsonString, defaultValue = {}) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return defaultValue;
  }
}
