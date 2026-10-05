/**
 * Copy text to the clipboard, without ever throwing.
 *
 * `navigator.clipboard` is absent on an insecure origin, inside some WebViews,
 * and in jsdom — and `writeText` rejects when the document is not focused. The
 * old Profile page called it unguarded inside a `try` that then `alert()`ed
 * "Copied to clipboard!" from the *fallback* path too, so a failed copy still
 * claimed success and the user pasted the previous clipboard contents into an
 * MCP client.
 *
 * So this resolves a real boolean: true only when something was actually
 * written. Callers show the tick (and the toast) off that answer.
 */

/**
 * The pre-`navigator.clipboard` path, still the only one some WebViews have.
 * Off-screen rather than hidden: `display:none` is not selectable.
 */
function copyByExecCommand(text) {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', 'readonly');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  area.style.opacity = '0';
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand('copy') === true;
  } catch (error) {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}

/**
 * @param {string} text
 * @returns {Promise<boolean>} whether the clipboard actually took it
 */
export async function copyText(text) {
  const value = text == null ? '' : String(text);
  if (!value) return false;

  const api = typeof navigator !== 'undefined' ? navigator.clipboard : null;
  if (api && typeof api.writeText === 'function') {
    try {
      await api.writeText(value);
      return true;
    } catch (error) {
      // Denied permission or an unfocused document — fall through, don't throw.
    }
  }

  return copyByExecCommand(value);
}

export default copyText;
