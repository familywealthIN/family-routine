/**
 * markdownEmbeds — iframe embeds inside user-written markdown (a goal item's
 * contribution).
 *
 * The markdown itself is rendered with HTML OFF: a contribution is user text,
 * and letting it inject markup would make every goal item a stored-XSS vector.
 * An embed code pasted from YouTube, Google Docs, Loom… is the one piece of
 * HTML worth honouring, so it is lifted OUT of the text here: only its `src`
 * (plus width/height for the shape) survives, and only when the src is https
 * on a host below. The caller draws its own sandboxed <iframe> from that — the
 * pasted tag's other attributes (srcdoc, onload, sandbox overrides) are never
 * rendered. Anything else stays in the text and shows as the literal code.
 *
 * Every host here must also be in `frame-src` of the CSP in
 * apps/web-app/public/index.html (a test checks the two agree).
 */

/** host -> path prefixes that are an embed (not the whole site). */
export const EMBED_HOSTS = {
  'www.youtube.com': ['/embed/'],
  'www.youtube-nocookie.com': ['/embed/'],
  'player.vimeo.com': ['/video/'],
  'www.loom.com': ['/embed/'],
  'docs.google.com': ['/'],
  'drive.google.com': ['/file/', '/embeddedfolderview'],
  'calendar.google.com': ['/calendar/embed'],
  'www.google.com': ['/maps/embed'],
  'open.spotify.com': ['/embed/'],
  'www.figma.com': ['/embed'],
  'codepen.io': ['/'],
  'calculator.familywealth.in': ['/'],
};

const IFRAME_RE = /<iframe\b([^>]*)>(?:\s*<\/iframe\s*>)?/gi;

function attr(attrs, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(attrs);
  if (!match) return '';
  return match[1] !== undefined ? match[1] : (match[2] !== undefined ? match[2] : match[3]);
}

function decodeEntities(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/** The src, normalised, when it is an allowed https embed; '' otherwise. */
export function allowedEmbedSrc(raw) {
  if (!raw) return '';
  let url;
  try {
    url = new URL(decodeEntities(raw.trim()));
  } catch (e) {
    return '';
  }
  if (url.protocol !== 'https:' || url.username || url.password) return '';
  const prefixes = EMBED_HOSTS[url.hostname.toLowerCase()];
  if (!prefixes || !prefixes.some((p) => url.pathname.startsWith(p))) return '';
  return url.toString();
}

const toNumber = (value) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 && !/%/.test(value) ? n : 0;
};

/**
 * Split markdown into text and embed segments, in order.
 *
 * @param {string} source
 * @returns {Array<{type:'markdown', text:string}|{type:'embed', src:string, title:string, height:number, ratio:number}>}
 *   `ratio` (height / width) is set when both sizes are pixels, so a 16:9
 *   video scales with the card; otherwise a pixel `height` (e.g. Spotify's
 *   152) is kept; with neither, the caller's default shape applies.
 */
export function splitEmbeds(source) {
  const text = typeof source === 'string' ? source : '';
  const segments = [];
  let last = 0;
  let match;
  IFRAME_RE.lastIndex = 0;
  // eslint-disable-next-line no-cond-assign
  while ((match = IFRAME_RE.exec(text))) {
    const attrs = match[1];
    const src = allowedEmbedSrc(attr(attrs, 'src'));
    if (src) {
      if (match.index > last) segments.push({ type: 'markdown', text: text.slice(last, match.index) });
      const width = toNumber(attr(attrs, 'width'));
      const height = toNumber(attr(attrs, 'height'));
      segments.push({
        type: 'embed',
        src,
        title: attr(attrs, 'title') || new URL(src).hostname,
        height: !width && height ? height : 0,
        ratio: width && height ? height / width : 0,
      });
      last = match.index + match[0].length;
    }
  }
  if (last < text.length) segments.push({ type: 'markdown', text: text.slice(last) });
  return segments.filter((s) => s.type === 'embed' || s.text.trim());
}

export default splitEmbeds;
