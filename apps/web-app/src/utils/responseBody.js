/**
 * An agent webhook's reply body: parsed JSON when it says it is JSON and is,
 * otherwise the text as sent.
 *
 * `response.json()` throws on an empty or malformed body, and that turned a
 * webhook that answered 200 into a failed dispatch. On iOS the error reads
 * "The string did not match the expected pattern." A failed START leaves no
 * open run, so the routine's END event was then skipped as well (8 Oct 2026).
 * The status code decides success; the body is only the result to show.
 */
export default async function readResponseBody(response) {
  const text = await response.text();
  const type = (response.headers.get('content-type') || '').toLowerCase();
  if (!type.includes('json')) return text;
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}
