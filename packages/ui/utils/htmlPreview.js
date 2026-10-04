/**
 * Plain-text preview of agent HTML.
 *
 * An agent's end event returns whatever the user's webhook felt like sending —
 * arbitrary HTML from a third party. The full document is only ever shown inside
 * `AgentResultModal`'s sandboxed iframe (`sandbox="allow-scripts"`, no
 * `allow-same-origin`), so it runs on an opaque origin and cannot reach the app.
 *
 * The goal-item page still wants an inline teaser of that result. Rendering the
 * markup there would put third-party HTML in the app's own DOM — exactly what
 * the iframe exists to prevent — so the teaser is the text content only. No
 * tags, no attributes, nothing executable: "Show more" grows the text, "Full
 * transcript" hands the real document to the sandbox.
 */

/** Block-level tags whose boundaries are a line break in the text rendering. */
const BLOCK_TAGS = 'p|div|br|li|tr|h[1-6]|section|article|header|footer|pre|blockquote';

const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/**
 * Strip markup from an HTML string, keeping block boundaries as newlines.
 *
 * Deliberately a string transform and not `innerHTML` + `textContent`: parsing
 * the markup into a live DOM would fire `<img onerror>` and fetch remote
 * resources on the way to throwing the nodes away.
 *
 * @param {string} html
 * @returns {string} the text content, trimmed, with runs of blank lines collapsed
 */
export function htmlToText(html) {
  if (!html) return '';
  return String(html)
    // Script and style bodies are not content.
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(new RegExp(`<\\s*/?\\s*(?:${BLOCK_TAGS})\\b[^>]*>`, 'gi'), '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (match) => {
      const lower = match.toLowerCase();
      if (ENTITIES[lower] !== undefined) return ENTITIES[lower];
      const numeric = /^&#(\d+);$/.exec(match);
      return numeric ? String.fromCharCode(Number(numeric[1])) : ' ';
    })
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export default { htmlToText };
